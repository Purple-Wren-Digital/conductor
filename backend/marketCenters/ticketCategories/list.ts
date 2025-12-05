import { api, Query } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
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

    // ADMIN viewing all categories (no filters)
    if (
      userContext?.role === "ADMIN" &&
      (!req.marketCenterId || req.marketCenterId === "all" || !req.id)
    ) {
      const categoriesRaw = await db.queryAll<TicketCategoryRow>`
        SELECT * FROM ticket_categories ORDER BY name ASC
      `;

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

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req?.id) {
      conditions.push(`id = $${paramIndex++}`);
      values.push(req.id);
    }

    if (userContext?.role === "ADMIN" && req?.marketCenterId !== "all") {
      conditions.push(`market_center_id = $${paramIndex++}`);
      values.push(req.marketCenterId);
    }

    if (userContext?.role !== "ADMIN" && userContext?.marketCenterId) {
      conditions.push(`market_center_id = $${paramIndex++}`);
      values.push(userContext.marketCenterId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ticket_categories ${whereClause} ORDER BY name ASC`;

    const categoriesRaw = await db.rawQueryAll<TicketCategoryRow>(sql, ...values);

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
