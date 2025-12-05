import { api, APIError } from "encore.dev/api";
import { db, fromTimestamp } from "../ticket/db";
import { MarketCenter } from "./types";
import { getUserContext } from "../auth/user-context";
import { marketCenterScopeFilter } from "../auth/permissions";

export interface GetMarketCenterRequest {
  id: string;
}

export interface GetMarketCenterResponse {
  marketCenter: MarketCenter;
}

export const get = api<GetMarketCenterRequest, GetMarketCenterResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const scopeFilter = await marketCenterScopeFilter(userContext, req.id);

    if (!scopeFilter || !scopeFilter?.id) {
      throw APIError.permissionDenied(
        "You do not have permission to view this market center"
      );
    }

    // Fetch market center
    const marketCenterRow = await db.queryRow<{
      id: string;
      name: string;
      settings: any;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, name, settings, created_at, updated_at
      FROM market_centers
      WHERE id = ${req.id}
    `;

    if (!marketCenterRow) {
      throw APIError.notFound("Market Center not found");
    }

    // Fetch users
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
      SELECT id, email, name, role, clerk_id, is_active, market_center_id, created_at, updated_at
      FROM users
      WHERE market_center_id = ${req.id} AND is_active = true
    `;

    // Fetch ticket categories with default assignee and ticket count
    const categoryRows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      market_center_id: string;
      default_assignee_id: string | null;
      created_at: Date;
      updated_at: Date;
      assignee_id: string | null;
      assignee_email: string | null;
      assignee_name: string | null;
      assignee_role: string | null;
      ticket_count: number;
    }>`
      SELECT
        tc.id, tc.name, tc.description, tc.market_center_id, tc.default_assignee_id,
        tc.created_at, tc.updated_at,
        u.id as assignee_id,
        u.email as assignee_email,
        u.name as assignee_name,
        u.role as assignee_role,
        COUNT(t.id)::int as ticket_count
      FROM ticket_categories tc
      LEFT JOIN users u ON tc.default_assignee_id = u.id
      LEFT JOIN tickets t ON t.category_id = tc.id
      WHERE tc.market_center_id = ${req.id}
      GROUP BY tc.id, tc.name, tc.description, tc.market_center_id, tc.default_assignee_id,
               tc.created_at, tc.updated_at, u.id, u.email, u.name, u.role
      ORDER BY tc.name ASC
    `;

    // Count total tickets for this market center
    const totalTicketsResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count
      FROM tickets t
      INNER JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE tc.market_center_id = ${req.id}
    `;

    const formattedMarketCenter: MarketCenter = {
      id: marketCenterRow.id,
      name: marketCenterRow.name,
      settings: marketCenterRow.settings,
      createdAt: fromTimestamp(marketCenterRow.created_at)!,
      updatedAt: fromTimestamp(marketCenterRow.updated_at)!,
      totalTickets: totalTicketsResult?.count ?? 0,
      users: userRows.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name ?? "",
        role: u.role as any,
        clerkId: u.clerk_id,
        isActive: u.is_active,
        marketCenterId: u.market_center_id ?? null,
        createdAt: fromTimestamp(u.created_at)!,
        updatedAt: fromTimestamp(u.updated_at)!,
      })),
      ticketCategories: categoryRows.map(c => ({
        id: c.id,
        name: c.name ?? "",
        description: c.description ?? "",
        marketCenterId: c.market_center_id,
        defaultAssigneeId: c.default_assignee_id ?? null,
        createdAt: fromTimestamp(c.created_at)!,
        updatedAt: fromTimestamp(c.updated_at)!,
        defaultAssignee: c.assignee_id ? {
          id: c.assignee_id,
          email: c.assignee_email ?? "",
          name: c.assignee_name ?? "",
          role: c.assignee_role as any,
          clerkId: "", // Not fetched in this query
          isActive: true,
          marketCenterId: c.market_center_id ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null,
        ticketCount: c.ticket_count,
      })),
    };

    return {
      marketCenter: formattedMarketCenter,
    } as GetMarketCenterResponse;
  }
);
