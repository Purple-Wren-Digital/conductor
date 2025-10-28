// TODO: List all ticket categories for a specific market center
import { api, Query } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { TicketCategory } from "../types";
import { prisma } from "../../ticket/db";

export interface ListCategoriesRequest {
  id?: Query<string>; // Category ID
  marketCenterId?: Query<string>;
}

export interface ListCategoriesResponse {
  categories: TicketCategory[];
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

    if (
      userContext?.role === "ADMIN" &&
      (!req.marketCenterId || req.marketCenterId === "all" || !req.id)
    ) {
      const ticketCategories = await prisma.ticketCategory.findMany();
      return {
        categories: ticketCategories,
      };
    }

    let where: any = {};

    if (req?.id) {
      where.id = req.id;
    }
    if (userContext?.role === "ADMIN" && req?.marketCenterId !== "all") {
      where.marketCenterId = req.marketCenterId;
    }

    if (userContext?.role !== "ADMIN" && userContext?.marketCenterId) {
      where.marketCenterId = userContext.marketCenterId;
    }

    const categoriesRaw = await prisma.ticketCategory.findMany({
      where: where,
    });

    const categories = categoriesRaw.map((category) => ({
      ...category,
      name: category.name ?? "",
      description: category.description ?? "",
    }));

    return { categories: categories };
  }
);
