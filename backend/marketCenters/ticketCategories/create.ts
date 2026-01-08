import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { TicketCategory } from "../types";
import {
  marketCenterRepository,
  userRepository,
  db,
  toJson,
} from "../../ticket/db";
import { subscriptionRepository } from "../../shared/repositories";

export interface CreateCategoryRequest {
  marketCenterId: string;
  name: string;
  description?: string;
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

    // For Admin, verify subscription-based access to the target market center
    if (userContext?.role === "ADMIN") {
      const canAccess = await subscriptionRepository.canAccessMarketCenter(
        userContext.marketCenterId,
        marketCenterId
      );
      if (!canAccess) {
        throw APIError.permissionDenied(
          "You do not have permission to create categories in this market center"
        );
      }
    }

    const marketCenter = await marketCenterRepository.findById(marketCenterId);

    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Create ticket category
    // Handle "none" as null (frontend uses "none" for no selection)
    const defaultAssigneeId =
      req?.defaultAssigneeId && req?.defaultAssigneeId !== "none"
        ? req.defaultAssigneeId
        : undefined;

    const ticketCategory = await marketCenterRepository.createCategory({
      name: req.name,
      description: req.description ?? null,
      marketCenterId: marketCenter.id,
      defaultAssigneeId,
    });

    // Get default assignee if exists
    let defaultAssignee = undefined;
    if (ticketCategory.defaultAssigneeId) {
      defaultAssignee = await userRepository.findById(
        ticketCategory.defaultAssigneeId
      );
    }

    // Create market center history for category creation
    await marketCenterRepository.createHistory({
      marketCenterId: marketCenter.id,
      action: "CREATE",
      field: "category",
      newValue: req.name,
      snapshot: ticketCategory,
      changedById: userContext.userId,
    });

    // Create user history for creator
    await userRepository.createHistory({
      userId: userContext.userId,
      marketCenterId: marketCenter.id,
      action: "CREATE",
      field: "category",
      newValue: req.name,
      changedById: userContext.userId,
    });

    // If there's a default assignee, create additional history records
    if (defaultAssigneeId) {
      await userRepository.createHistory({
        userId: defaultAssigneeId,
        marketCenterId: marketCenter.id,
        action: "ADD",
        field: `${req?.name} category default assignee`,
        newValue: JSON.stringify({
          name: defaultAssignee?.name ?? "Name not found",
          id: defaultAssignee?.id,
          email: defaultAssignee?.email ?? "",
        }),
        changedById: userContext.userId,
      });

      await marketCenterRepository.createHistory({
        marketCenterId: marketCenter.id,
        action: "ADD",
        field: `${req?.name} category default assignee`,
        newValue: JSON.stringify({
          name: defaultAssignee?.name ?? "Name not found",
          id: defaultAssignee?.id,
          email: defaultAssignee?.email ?? "",
        }),
        snapshot: ticketCategory,
        changedById: userContext.userId,
      });
    } else {
      await marketCenterRepository.createHistory({
        marketCenterId: marketCenter.id,
        action: "ADD",
        field: `${req?.name} category default assignee`,
        newValue: "Unassigned",
        snapshot: ticketCategory,
        changedById: userContext.userId,
      });
    }

    return {
      category: {
        ...ticketCategory,
        defaultAssignee: defaultAssignee ?? undefined,
      },
    };
  }
);
