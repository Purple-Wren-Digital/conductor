import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { TicketCategory } from "../types";
import { prisma } from "../../ticket/db";

export interface DeleteCategoryRequest {
  id: string;
}

export interface DeleteCategoryResponse {
  category: TicketCategory;
}

export const deleteCategory = api<
  DeleteCategoryRequest,
  DeleteCategoryResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/marketCenters/ticketCategories/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "You don't have permission to delete a category"
      );
    }

    if (!req || !req.id) {
      throw APIError.invalidArgument("Missing ticket category id");
    }

    const ticketCategoryToDelete = await prisma.ticketCategory.findUnique({
      where: { id: req.id },
    });

    if (!ticketCategoryToDelete) {
      throw APIError.notFound("Ticket Category not found");
    }

    const result = await prisma.$transaction(async (pr) => {
      const marketCenterHistory = await pr.marketCenterHistory.create({
        data: {
          marketCenterId: ticketCategoryToDelete.marketCenterId,
          action: "DELETE",
          field: "ticketCategories",
          previousValue: ticketCategoryToDelete?.name,
          newValue: "-",
          snapshot: ticketCategoryToDelete,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      });

      const ticketCategory = await prisma.ticketCategory.delete({
        where: { id: req.id },
      });

      return {
        ticketCategory,
        marketCenterHistory,
      };
    });

    return { category: result.ticketCategory };
  }
);
