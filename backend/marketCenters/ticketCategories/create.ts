import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { TicketCategory } from "../types";
import { prisma } from "../../ticket/db";

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  marketCenterId: string;
  defaultAssigneeId?: string;
}

export interface CreateCategoryResponse {
  category: TicketCategory;
}

export const createCategory = api<
  CreateCategoryRequest,
  CreateCategoryResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/marketCenters/ticketCategories",
    auth: true,
  },
  async (req) => {
    console.log("POST  - /marketCenters/ticketCategories");
    const userContext = await getUserContext();

    const marketCenterId =
      userContext?.role === "ADMIN"
        ? req.marketCenterId
        : userContext?.marketCenterId;

    if (!req || !marketCenterId || !req.name) {
      throw APIError.invalidArgument("Missing ticket category information");
    }

    const marketCenter = await prisma.marketCenter.findUnique({
      where: { id: marketCenterId },
    });

    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }


    const result = await prisma.$transaction(async (pr) => {
      const ticketCategory = await prisma.ticketCategory.create({
        data: {
          marketCenterId: marketCenter.id,
          name: req.name,
          description: req.description || null,
          defaultAssigneeId: req.defaultAssigneeId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const marketCenterHistory = await pr.marketCenterHistory.create({
        data: {
          marketCenterId: marketCenter.id,
          action: "CREATE",
          field: "ticketCategories",
          newValue: req.name,
          snapshot: marketCenter,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      });

      return {
        ticketCategory,
        marketCenterHistory,
      };
    });

    return { category: result.ticketCategory };
  }
);
