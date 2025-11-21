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
    const userContext = await getUserContext();

    const marketCenterId =
      userContext?.role === "ADMIN"
        ? req.marketCenterId
        : userContext?.role === "STAFF" || userContext?.role === "STAFF_LEADER"
          ? userContext?.marketCenterId
          : undefined;

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
        include: {
          defaultAssignee: true,
        },
      });

      const marketCenterHistoryItems = [
        {
          marketCenterId: marketCenter.id,
          action: "CREATE",
          field: "category",
          newValue: req.name,
          snapshot: ticketCategory,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      ];

      const userHistoryItems = [
        {
          userId: userContext.userId,
          marketCenterId: marketCenter.id,
          action: "CREATE",
          field: "category",
          newValue: req.name,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      ];

      if (req?.defaultAssigneeId) {
        userHistoryItems.push({
          userId: req.defaultAssigneeId,
          marketCenterId: marketCenter.id,
          action: "ASSIGNMENT",
          field: "category",
          newValue: req.name,
          changedAt: new Date(),
          changedById: userContext.userId,
        });
        marketCenterHistoryItems.push({
          marketCenterId: marketCenter.id,
          action: "ASSIGNMENT",
          field: "category",
          newValue: req.name,
          snapshot: ticketCategory,
          changedAt: new Date(),
          changedById: userContext.userId,
        });
      }

      await pr.marketCenterHistory.createMany({
        data: marketCenterHistoryItems,
      });

      await pr.userHistory.createMany({
        data: userHistoryItems,
      });

      return { ticketCategory };
    });

    return { category: result.ticketCategory };
  }
);
