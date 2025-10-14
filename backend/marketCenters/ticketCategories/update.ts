import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { TicketCategory } from "../types";
import { prisma } from "../../ticket/db";

export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  description?: string;
  defaultAssigneeId?: string;
  // marketCenterId?: string;
}

export interface UpdateCategoryResponse {
  category: TicketCategory;
}

export const updateCategory = api<
  UpdateCategoryRequest,
  UpdateCategoryResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/marketCenters/ticketCategories/:id",
    auth: true,
  },
  async (req) => {
    console.log("req", req);
    const userContext = await getUserContext();
    if (userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "You do not have permissions to edit ticket categories"
      );
    }

    if (!req || !req.id) {
      throw APIError.invalidArgument("Missing ticket category information");
    }

    const oldTicketCategory = await prisma.ticketCategory.findUnique({
      where: { id: req.id },
      include: { defaultAssignee: true },
    });

    if (!oldTicketCategory || !oldTicketCategory?.id) {
      throw APIError.notFound("Category not found");
    }

    const updateCategoryData: any = {};
    let marketCenterHistory: any = [];

    // NAME
    if (req?.name && req?.name !== oldTicketCategory.name) {
      updateCategoryData.name = req.name;
      marketCenterHistory.push({
        marketCenterId: oldTicketCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category name",
        previousValue: oldTicketCategory?.name ?? "",
        newValue: req.name,
        snapshot: JSON.stringify(oldTicketCategory),
      });
    }
    // DESCRIPTION
    if (
      req?.description &&
      req?.description !== oldTicketCategory.description
    ) {
      updateCategoryData.description = req.description;
      marketCenterHistory.push({
        marketCenterId: oldTicketCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category description",
        previousValue: oldTicketCategory?.description ?? "",
        newValue: req.description,
        snapshot: JSON.stringify(oldTicketCategory),
      });
    }
    // DEFAULT ASSIGNMENT
    if (
      req?.defaultAssigneeId &&
      req?.defaultAssigneeId !== oldTicketCategory.defaultAssigneeId
    ) {
      let newAssignee: any = {};
      if (req.defaultAssigneeId !== "none") {
        const user = await prisma.user.findUnique({
          where: { id: req.defaultAssigneeId },
        });
        if (user) {
          newAssignee.name = user?.name ?? "N/a";
          newAssignee.id = user.id;
        } else {
          throw APIError.notFound("Default assignee user not found");
        }
      }

      updateCategoryData.defaultAssigneeId =
        req.defaultAssigneeId === "none" ? undefined : req.defaultAssigneeId;

      marketCenterHistory.push({
        marketCenterId: oldTicketCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category default assignee",
        previousValue:
          oldTicketCategory &&
          oldTicketCategory?.defaultAssignee &&
          oldTicketCategory?.defaultAssignee?.name &&
          oldTicketCategory?.defaultAssigneeId
            ? JSON.stringify({
                name: oldTicketCategory.defaultAssignee.name,
                id: oldTicketCategory.defaultAssigneeId,
              })
            : null,
        newValue:
          newAssignee && newAssignee?.name && newAssignee?.id
            ? JSON.stringify(newAssignee)
            : null,
        snapshot: JSON.stringify(oldTicketCategory),
      });
    }
    // MARKET CENTER ID
    // if (
    //   userContext?.role === "ADMIN" &&
    //   req?.marketCenterId &&
    //   req?.marketCenterId !== oldTicketCategory.marketCenterId
    // ) {
    //   updateCategoryData.marketCenterId = req.marketCenterId;
    //   marketCenterHistory.push(
    //     {
    //       marketCenterId: oldTicketCategory.marketCenterId,
    //       changedById: userContext.userId,
    //       action: "DELETE",
    //       field: "market-center-category",
    //       previousValue: oldTicketCategory?.marketCenterId ?? "",
    //       newValue: "-",
    //     },
    //     {
    //       marketCenterId: req.marketCenterId,
    //       changedById: userContext.userId,
    //       action: "ADD",
    //       field: "market-center-category",
    //       previousValue: "-",
    //       newValue: req.marketCenterId,
    //     }
    //   );
    // }

    if (Object.keys(updateCategoryData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }

    const result = await prisma.$transaction(async (pr) => {
      const ticketCategory = await prisma.ticketCategory.update({
        where: { id: req.id },
        data: updateCategoryData,
      });

      const marketCenterHistoryNew = await pr.marketCenterHistory.createMany({
        data: marketCenterHistory,
      });

      return {
        ticketCategory,
        marketCenterHistoryNew,
      };
    });

    return { category: result.ticketCategory };
  }
);
