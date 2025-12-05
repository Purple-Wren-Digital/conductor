import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { TicketCategory } from "../types";
import { marketCenterRepository, userRepository, db, toJson } from "../../ticket/db";
import { UsersToNotify } from "../../notifications/types";

export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  description?: string;
  defaultAssigneeId?: string;
  // marketCenterId?: string;
}

export interface UpdateCategoryResponse {
  category: TicketCategory;
  usersToNotify: UsersToNotify[];
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
    const userContext = await getUserContext();
    if (!userContext?.role || userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "You do not have permissions to edit ticket categories"
      );
    }

    if (!req || !req.id) {
      throw APIError.invalidArgument("Missing ticket category information");
    }

    const oldTicketCategory = await marketCenterRepository.findCategoryById(req.id);

    if (!oldTicketCategory || !oldTicketCategory?.id) {
      throw APIError.notFound("Category not found");
    }

    // Get old default assignee if exists
    let oldDefaultAssignee = null;
    if (oldTicketCategory.defaultAssigneeId) {
      oldDefaultAssignee = await userRepository.findById(oldTicketCategory.defaultAssigneeId);
    }

    const updateCategoryData: Partial<{
      name: string;
      description: string | null;
      defaultAssigneeId: string | null;
    }> = {};
    let usersToNotify: UsersToNotify[] = [];

    // NAME
    if (req?.name && req?.name !== oldTicketCategory.name) {
      updateCategoryData.name = req.name;
      await marketCenterRepository.createHistory({
        marketCenterId: oldTicketCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category name",
        previousValue: oldTicketCategory?.name ?? "",
        newValue: req.name,
        snapshot: oldTicketCategory,
      });
    }

    // DESCRIPTION
    if (
      req?.description &&
      req?.description !== oldTicketCategory.description
    ) {
      updateCategoryData.description = req.description;
      await marketCenterRepository.createHistory({
        marketCenterId: oldTicketCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category description",
        previousValue: oldTicketCategory?.description ?? "",
        newValue: req.description,
        snapshot: oldTicketCategory,
      });
    }

    // DEFAULT ASSIGNMENT
    if (
      req?.defaultAssigneeId &&
      req?.defaultAssigneeId !== oldTicketCategory.defaultAssigneeId
    ) {
      let newDefaultAssignee: any = {};
      if (req.defaultAssigneeId !== "none") {
        const user = await userRepository.findById(req.defaultAssigneeId);
        if (user) {
          newDefaultAssignee.name = user?.name ?? "N/a";
          newDefaultAssignee.id = user.id;
          newDefaultAssignee.email = user.email;
        } else {
          throw APIError.notFound("Default assignee user not found");
        }
      }

      updateCategoryData.defaultAssigneeId =
        req.defaultAssigneeId === "none" ? null : req.defaultAssigneeId;

      await marketCenterRepository.createHistory({
        marketCenterId: oldTicketCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: `${req?.name ? req.name : oldTicketCategory?.name} category default assignee`,
        previousValue:
          oldTicketCategory &&
          oldDefaultAssignee &&
          oldDefaultAssignee?.name &&
          oldTicketCategory?.defaultAssigneeId
            ? JSON.stringify({
                name: oldDefaultAssignee.name ?? "N/a",
                id: oldTicketCategory.defaultAssigneeId,
              })
            : "Unassigned",
        newValue:
          newDefaultAssignee &&
          newDefaultAssignee?.name &&
          newDefaultAssignee?.id
            ? JSON.stringify(newDefaultAssignee)
            : null,
        snapshot: oldTicketCategory,
      });

      if (oldTicketCategory?.defaultAssigneeId && oldDefaultAssignee) {
        usersToNotify.push({
          id: oldTicketCategory.defaultAssigneeId,
          name: oldDefaultAssignee?.name
            ? oldDefaultAssignee.name
            : "",
          email: oldDefaultAssignee?.email ?? "",
          updateType: "removed",
        });
      }

      if (newDefaultAssignee?.id) {
        usersToNotify.push({
          id: newDefaultAssignee.id,
          name: newDefaultAssignee?.name ?? "",
          email: newDefaultAssignee?.email ?? "",
          updateType: "added",
        });
      }
    }

    if (Object.keys(updateCategoryData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }

    // Update the category
    const ticketCategory = await marketCenterRepository.updateCategory(req.id, updateCategoryData);

    if (!ticketCategory) {
      throw APIError.notFound("Failed to update category");
    }

    return { category: ticketCategory, usersToNotify: usersToNotify };
  }
);
