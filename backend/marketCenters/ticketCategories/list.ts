import { api, Query } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { getAccessibleMarketCenterIds } from "../../auth/permissions";
import { TicketCategory } from "../types";
import { marketCenterRepository, db } from "../../ticket/db";

export interface ListCategoriesRequest {
  id?: Query<string>; // Category ID
  marketCenterId?: Query<string>;
}

export interface ListCategoriesResponse {
  categories: TicketCategory[];
}

interface TicketCategoryRow {
  id: string;
  name: string;
  description: string | null;
  market_center_id: string;
  default_assignee_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export const listCategories = api<
  ListCategoriesRequest,
  ListCategoriesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/ticketCategories",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Get accessible market center IDs based on subscription
    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);

    if (!accessibleMarketCenterIds.length) {
      return { categories: [] };
    }

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Always scope to accessible market centers
    const placeholders = accessibleMarketCenterIds
      .map((_, i) => `$${paramIndex + i}`)
      .join(", ");
    conditions.push(`market_center_id IN (${placeholders})`);
    values.push(...accessibleMarketCenterIds);
    paramIndex += accessibleMarketCenterIds.length;

    if (req?.id) {
      conditions.push(`id = $${paramIndex++}`);
      values.push(req.id);
    }

    // If a specific market center is requested, further filter (must be in accessible list)
    if (req?.marketCenterId && req.marketCenterId !== "all") {
      if (!accessibleMarketCenterIds.includes(req.marketCenterId)) {
        return { categories: [] };
      }
      conditions.push(`market_center_id = $${paramIndex++}`);
      values.push(req.marketCenterId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM ticket_categories ${whereClause} ORDER BY name ASC`;

    const categoriesRaw = await db.rawQueryAll<TicketCategoryRow>(
      sql,
      ...values
    );

    const categories = categoriesRaw.map((category) => ({
      id: category.id,
      name: category.name ?? "",
      description: category.description ?? "",
      marketCenterId: category.market_center_id,
      defaultAssigneeId: category.default_assignee_id ?? undefined,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return { categories };
  }
);
