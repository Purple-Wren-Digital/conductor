import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository, userRepository } from "../../ticket/db";

export interface DeleteCategoryRequest {
  id: string;
}

export interface DeleteCategoryResponse {
  deleted: boolean;
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

    if (!userContext?.role || userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "You don't have permission to delete a category"
      );
    }

    if (!req || !req.id) {
      throw APIError.invalidArgument("Missing ticket category id");
    }

    const ticketCategoryToDelete = await marketCenterRepository.findCategoryById(req.id);

    if (!ticketCategoryToDelete) {
      throw APIError.notFound("Ticket Category not found");
    }

    // Get default assignee if exists
    let defaultAssignee = null;
    if (ticketCategoryToDelete.defaultAssigneeId) {
      defaultAssignee = await userRepository.findById(ticketCategoryToDelete.defaultAssigneeId);
    }

    // Create history record before deletion
    await marketCenterRepository.createHistory({
      marketCenterId: ticketCategoryToDelete.marketCenterId,
      action: "DELETE",
      field: "category",
      previousValue: ticketCategoryToDelete?.name,
      newValue: "-",
      snapshot: {
        ...ticketCategoryToDelete,
        defaultAssignee: defaultAssignee ?? undefined,
      },
      changedById: userContext.userId,
    });

    // Delete the category
    await marketCenterRepository.deleteCategory(req.id);

    return { deleted: true };
  }
);
