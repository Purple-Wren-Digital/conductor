/**
 * Settings Categories Endpoints
 * These proxy to the market center category functionality with proper /settings/* paths
 */

import { api, APIError, Query } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { marketCenterRepository, userRepository, db } from "../ticket/db";
import { subscriptionRepository } from "../shared/repositories";
import type { TicketCategory } from "../marketCenters/types";

// ============================================================================
// Types
// ============================================================================

interface TicketCategoryRow {
  id: string;
  name: string;
  description: string | null;
  market_center_id: string;
  default_assignee_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
  marketCenterId: string;
  defaultAssigneeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// List Categories
// ============================================================================

export interface ListSettingsCategoriesResponse {
  categories: CategoryResponse[];
}

export const listSettingsCategories = api<void, ListSettingsCategoriesResponse>(
  {
    expose: true,
    method: "GET",
    path: "/settings/categories",
    auth: true,
  },
  async () => {
    const userContext = await getUserContext();

    // Get accessible market center IDs based on subscription
    const accessibleMarketCenterIds =
      userContext.role === "ADMIN"
        ? await subscriptionRepository.getAccessibleMarketCenterIds(
            userContext.marketCenterId
          )
        : userContext.marketCenterId
          ? [userContext.marketCenterId]
          : [];

    if (accessibleMarketCenterIds.length === 0) {
      return { categories: [] };
    }

    // Build query with IN clause
    const placeholders = accessibleMarketCenterIds
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    const sql = `SELECT * FROM ticket_categories WHERE market_center_id IN (${placeholders}) ORDER BY name ASC`;

    const categoriesRaw = await db.rawQueryAll<TicketCategoryRow>(
      sql,
      ...accessibleMarketCenterIds
    );

    const categories = categoriesRaw.map((category) => ({
      id: category.id,
      name: category.name ?? "",
      description: category.description ?? undefined,
      marketCenterId: category.market_center_id,
      defaultAssigneeId: category.default_assignee_id ?? undefined,
      isActive: category.is_active ?? true,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return { categories };
  }
);

// ============================================================================
// Create Category
// ============================================================================

export interface CreateSettingsCategoryRequest {
  name: string;
  description?: string;
  defaultAssigneeId?: string;
}

export interface CreateSettingsCategoryResponse {
  id: string;
  name: string;
  description?: string;
  marketCenterId: string;
  defaultAssigneeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createSettingsCategory = api<
  CreateSettingsCategoryRequest,
  CreateSettingsCategoryResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/settings/categories",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (
      !userContext?.role ||
      (userContext?.role !== "ADMIN" &&
        userContext?.role !== "STAFF" &&
        userContext?.role !== "STAFF_LEADER")
    ) {
      throw APIError.permissionDenied(
        "You do not have permission to create categories"
      );
    }

    if (!req.name || !req.name.trim()) {
      throw APIError.invalidArgument("Category name is required");
    }

    const marketCenterId = userContext.marketCenterId;

    if (!marketCenterId) {
      throw APIError.failedPrecondition(
        "You must belong to a market center to create categories"
      );
    }

    // Handle empty string, "none", or missing defaultAssigneeId
    // The frontend may send "" (empty string) when "No default assignee" is selected
    const defaultAssigneeId =
      req.defaultAssigneeId &&
      req.defaultAssigneeId.trim() !== "" &&
      req.defaultAssigneeId !== "none"
        ? req.defaultAssigneeId
        : null;

    // Create the category
    const ticketCategory = await marketCenterRepository.createCategory({
      name: req.name.trim(),
      description: req.description?.trim() ?? null,
      marketCenterId: marketCenterId,
      defaultAssigneeId,
    });

    // Create market center history for category creation
    await marketCenterRepository.createHistory({
      marketCenterId: marketCenterId,
      action: "CREATE",
      field: "category",
      newValue: req.name,
      snapshot: ticketCategory,
      changedById: userContext.userId,
    });

    return {
      id: ticketCategory.id,
      name: ticketCategory.name,
      description: ticketCategory.description ?? undefined,
      marketCenterId: ticketCategory.marketCenterId,
      defaultAssigneeId: ticketCategory.defaultAssigneeId ?? undefined,
      isActive: ticketCategory.isActive ?? true,
      createdAt: ticketCategory.createdAt,
      updatedAt: ticketCategory.updatedAt,
    };
  }
);

// ============================================================================
// Update Category
// ============================================================================

export interface UpdateSettingsCategoryRequest {
  id: string;
  name?: string;
  description?: string;
  defaultAssigneeId?: string;
  isActive?: boolean;
}

export interface UpdateSettingsCategoryResponse {
  id: string;
  name: string;
  description?: string;
  marketCenterId: string;
  defaultAssigneeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const updateSettingsCategory = api<
  UpdateSettingsCategoryRequest,
  UpdateSettingsCategoryResponse
>(
  {
    expose: true,
    method: "PUT",
    path: "/settings/categories/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.role || userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "You do not have permission to update categories"
      );
    }

    if (!req.id) {
      throw APIError.invalidArgument("Category ID is required");
    }

    const existingCategory = await marketCenterRepository.findCategoryById(
      req.id
    );

    if (!existingCategory) {
      throw APIError.notFound("Category not found");
    }

    // Build update data
    const updateData: Partial<{
      name: string;
      description: string | null;
      defaultAssigneeId: string | null;
      isActive: boolean;
    }> = {};

    if (req.name !== undefined && req.name !== existingCategory.name) {
      updateData.name = req.name.trim();
      await marketCenterRepository.createHistory({
        marketCenterId: existingCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category name",
        previousValue: existingCategory.name ?? "",
        newValue: req.name,
        snapshot: existingCategory,
      });
    }

    if (
      req.description !== undefined &&
      req.description !== existingCategory.description
    ) {
      updateData.description = req.description?.trim() ?? null;
    }

    if (req.defaultAssigneeId !== undefined) {
      // Handle empty string, "none", or actual UUID
      const newAssigneeId =
        req.defaultAssigneeId &&
        req.defaultAssigneeId.trim() !== "" &&
        req.defaultAssigneeId !== "none"
          ? req.defaultAssigneeId
          : null;

      if (newAssigneeId !== existingCategory.defaultAssigneeId) {
        updateData.defaultAssigneeId = newAssigneeId;

        // Get old and new assignee names for history
        const oldAssigneeName = existingCategory.defaultAssigneeId
          ? (await userRepository.findById(existingCategory.defaultAssigneeId))
              ?.name ?? "Unknown"
          : "Unassigned";
        const newAssigneeName = newAssigneeId
          ? (await userRepository.findById(newAssigneeId))?.name ?? "Unknown"
          : "Unassigned";

        await marketCenterRepository.createHistory({
          marketCenterId: existingCategory.marketCenterId,
          changedById: userContext.userId,
          action: "UPDATE",
          field: "category default assignee",
          previousValue: oldAssigneeName,
          newValue: newAssigneeName,
          snapshot: existingCategory,
        });
      }
    }

    if (req.isActive !== undefined && req.isActive !== existingCategory.isActive) {
      updateData.isActive = req.isActive;
      await marketCenterRepository.createHistory({
        marketCenterId: existingCategory.marketCenterId,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "category status",
        previousValue: existingCategory.isActive ? "Active" : "Inactive",
        newValue: req.isActive ? "Active" : "Inactive",
        snapshot: existingCategory,
      });
    }

    if (Object.keys(updateData).length === 0) {
      // No changes, return existing category
      return {
        id: existingCategory.id,
        name: existingCategory.name,
        description: existingCategory.description ?? undefined,
        marketCenterId: existingCategory.marketCenterId,
        defaultAssigneeId: existingCategory.defaultAssigneeId ?? undefined,
        isActive: existingCategory.isActive ?? true,
        createdAt: existingCategory.createdAt,
        updatedAt: existingCategory.updatedAt,
      };
    }

    // Update the category
    const updatedCategory = await marketCenterRepository.updateCategory(
      req.id,
      updateData
    );

    if (!updatedCategory) {
      throw APIError.internal("Failed to update category");
    }

    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      description: updatedCategory.description ?? undefined,
      marketCenterId: updatedCategory.marketCenterId,
      defaultAssigneeId: updatedCategory.defaultAssigneeId ?? undefined,
      isActive: updatedCategory.isActive ?? true,
      createdAt: updatedCategory.createdAt,
      updatedAt: updatedCategory.updatedAt,
    };
  }
);

// ============================================================================
// Delete Category
// ============================================================================

export interface DeleteSettingsCategoryRequest {
  id: string;
}

export interface DeleteSettingsCategoryResponse {
  success: boolean;
}

export const deleteSettingsCategory = api<
  DeleteSettingsCategoryRequest,
  DeleteSettingsCategoryResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/settings/categories/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.role || userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "You do not have permission to delete categories"
      );
    }

    if (!req.id) {
      throw APIError.invalidArgument("Category ID is required");
    }

    const existingCategory = await marketCenterRepository.findCategoryById(
      req.id
    );

    if (!existingCategory) {
      throw APIError.notFound("Category not found");
    }

    // Create history record before deletion
    await marketCenterRepository.createHistory({
      marketCenterId: existingCategory.marketCenterId,
      action: "DELETE",
      field: "category",
      previousValue: existingCategory.name,
      newValue: "-",
      snapshot: existingCategory,
      changedById: userContext.userId,
    });

    // Delete the category
    await marketCenterRepository.deleteCategory(req.id);

    return { success: true };
  }
);
