import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import {
  marketCenterRepository,
  ticketRepository,
  subscriptionRepository,
} from "../shared/repositories";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { MarketCenter } from "./types";
// TODO: PRIMARY MARKET CENTER ID SHOULD BE DERIVED FROM QUERY PARAMS

export interface ListMarketCentersRequest {
  id?: Query<string>;
  categoryIds?: Query<string[]>;
  userIds?: Query<string[]>;

  query?: Query<string>;

  sortBy?: Query<"updatedAt" | "createdAt" | "urgency" | "status">;
  sortDir?: Query<"asc" | "desc">;

  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListMarketCentersResponse {
  marketCenters: MarketCenter[];
  total: number;
}

export const search = api<ListMarketCentersRequest, ListMarketCentersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/search",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Superusers see ALL market centers regardless of subscription
    let accessibleMarketCenterIds: string[];
    if (userContext?.isSuperuser) {
      const allMCs = await marketCenterRepository.findAll();
      accessibleMarketCenterIds = allMCs.map((mc) => mc.id);
    } else {
      // Get accessible market center IDs based on user's subscription
      // - Non-Admin roles: Only their own market center
      // - Admin without Enterprise: Only their own market center
      // - Admin with Enterprise: All market centers under the same subscription
      accessibleMarketCenterIds =
        await subscriptionRepository.getAccessibleMarketCenterIds(
          userContext?.marketCenterId
        );
    }

    if (
      !userContext?.isSuperuser &&
      (!userContext?.marketCenterId ||
        !accessibleMarketCenterIds ||
        !accessibleMarketCenterIds.length)
    ) {
      return { marketCenters: [], total: 0 };
    }

    // AGENT + STAFF + STAFF_LEADER: only return their market center
    if (
      !userContext?.isSuperuser &&
      (userContext.role === "AGENT" ||
        userContext.role === "STAFF" ||
        userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId
    ) {
      const marketCenter = await marketCenterRepository.findByIdWithUsers(
        userContext.marketCenterId
      );

      if (!marketCenter) {
        throw APIError.notFound("Market center not found");
      }

      // Get categories for this market center
      const categories =
        await marketCenterRepository.findCategoriesByMarketCenterId(
          marketCenter.id
        );
      marketCenter.ticketCategories = categories;

      // Count tickets for this market center
      const totalTickets = await countTicketsForMarketCenter(marketCenter.id);

      return {
        marketCenters: [
          {
            ...marketCenter,
            totalTickets,
            users: (marketCenter.users || []).map((user) => ({
              ...user,
              name: user.name ?? "",
            })),
          },
        ],
        total: 1,
      };
    }

    // ADMIN: Return only market centers they have access to based on subscription

    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    const sortBy: "updatedAt" | "createdAt" =
      (req.sortBy as any) ?? "updatedAt";

    const sortDir = req.sortDir === "asc" ? "ASC" : "DESC";

    // Build the query - always scope to accessible market centers
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Add subscription-based scope for Admin
    const placeholders = accessibleMarketCenterIds
      .map((_, i) => `$${paramIndex + i}`)
      .join(", ");
    conditions.push(`mc.id IN (${placeholders})`);
    values.push(...accessibleMarketCenterIds);
    paramIndex += accessibleMarketCenterIds.length;

    if (req?.id) {
      conditions.push(`mc.id = $${paramIndex++}`);
      values.push(req.id);
    }

    if (req?.query) {
      conditions.push(
        `(mc.name ILIKE $${paramIndex} OR mc.id ILIKE $${paramIndex})`
      );
      values.push(`%${req.query}%`);
      paramIndex++;
    }

    if (req?.categoryIds && req.categoryIds.length > 0) {
      const placeholders = req.categoryIds
        .map((_, i) => `$${paramIndex + i}`)
        .join(", ");
      conditions.push(`EXISTS (
        SELECT 1 FROM ticket_categories tc
        WHERE tc.market_center_id = mc.id AND tc.id IN (${placeholders})
      )`);
      values.push(...req.categoryIds);
      paramIndex += req.categoryIds.length;
    }

    if (req?.userIds && req.userIds.length > 0) {
      const placeholders = req.userIds
        .map((_, i) => `$${paramIndex + i}`)
        .join(", ");
      conditions.push(`EXISTS (
        SELECT 1 FROM users u
        WHERE u.market_center_id = mc.id AND u.id IN (${placeholders})
      )`);
      values.push(...req.userIds);
      paramIndex += req.userIds.length;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Sort column mapping
    const sortColumn =
      sortBy === "createdAt" ? "mc.created_at" : "mc.updated_at";

    // Count total
    const countSql = `SELECT COUNT(*)::int as count FROM market_centers mc ${whereClause}`;
    const countResult = await db.rawQueryRow<{ count: number }>(
      countSql,
      ...values
    );
    const total = countResult?.count ?? 0;

    // Get market centers
    const sql = `
      SELECT mc.* FROM market_centers mc
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}, mc.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await db.rawQueryAll<{
      id: string;
      name: string;
      settings: any;
      created_at: Date;
      updated_at: Date;
    }>(sql, ...values);

    // Format market centers with relations
    const formattedMarketCenters = await Promise.all(
      rows.map(async (mc) => {
        // Get users for this market center
        const userRows = await db.queryAll<{
          id: string;
          email: string;
          name: string | null;
          role: string;
          clerk_id: string;
          is_active: boolean;
          market_center_id: string | null;
          created_at: Date;
          updated_at: Date;
        }>`
          SELECT * FROM users WHERE market_center_id = ${mc.id} AND is_active = true
        `;

        // Get categories for this market center
        const categories =
          await marketCenterRepository.findCategoriesByMarketCenterId(mc.id);

        // Count tickets for this market center
        const totalTickets = await countTicketsForMarketCenter(mc.id);

        return {
          id: mc.id,
          name: mc.name,
          settings: mc.settings,
          createdAt: mc.created_at,
          updatedAt: mc.updated_at,
          totalTickets,
          ticketCategories: categories,
          users: userRows.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name ?? "",
            role: user.role,
            clerkId: user.clerk_id,
            isActive: user.is_active,
            marketCenterId: user.market_center_id,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          })),
        };
      })
    );

    return {
      marketCenters: formattedMarketCenters as MarketCenter[],
      total: total,
    };
  }
);

// Helper function to count tickets for a market center
async function countTicketsForMarketCenter(
  marketCenterId: string
): Promise<number> {
  const result = await db.queryRow<{ count: number }>`
    SELECT COUNT(*)::int as count
    FROM tickets t
    JOIN ticket_categories tc ON t.category_id = tc.id
    WHERE tc.market_center_id = ${marketCenterId}
  `;
  return result?.count ?? 0;
}
