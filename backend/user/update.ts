import { api, APIError } from "encore.dev/api";
import { userRepository, marketCenterRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { canManageTeam } from "../auth/permissions";

export interface UpdateUserRequest {
  id: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  email?: string;
  marketCenterId?: string;
}

export interface UpdateUserResponse {
  user: User;
}

export const update = api<UpdateUserRequest, UpdateUserResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/users/:id/update",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();


    // Permission checks
    const existingUser = await userRepository.findById(req.id);

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    const isEditingSelf = userContext.userId === req.id;
    const canModifyUsers = await canManageTeam(
      userContext,
      req.id,
      req.marketCenterId
    );

    if (!canModifyUsers) {
      throw APIError.permissionDenied(
        "Insufficient permissions to update other users"
      );
    }

    // Build update data object + user history
    let marketCenterId: string | null = existingUser?.marketCenterId ?? null;

    const updateUserData: any = {};
    const userHistoryData: any[] = [];

    if (
      !isEditingSelf &&
      req?.marketCenterId &&
      req?.marketCenterId !== existingUser?.marketCenterId &&
      userContext?.role === "ADMIN"
    ) {
      const marketCenter = await marketCenterRepository.findById(
        req.marketCenterId
      );

      marketCenterId = marketCenter?.id ?? null;
      if (marketCenter) {
        updateUserData.marketCenterId = marketCenter.id;
        userHistoryData.push({
          userId: req.id,
          action: "UPDATE",
          field: "marketCenterId",
          previousValue: existingUser?.marketCenterId ?? "Unassigned",
          newValue: req.marketCenterId,
          snapshot: existingUser,
          changedById: userContext.userId,
        });
      }
    }

    if (!isEditingSelf && req?.role && req.role !== existingUser?.role) {
      updateUserData.role = req.role;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterId,
        action: "UPDATE",
        field: "role",
        previousValue: existingUser.role,
        newValue: req.role,
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    if (!isEditingSelf && req?.isActive !== undefined) {
      updateUserData.isActive = req.isActive;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterId,
        action: "UPDATE",
        field: req.isActive === true ? "Activated" : "Deactivated",
        previousValue:
          existingUser?.isActive === true ? "Active" : "Not Active",
        newValue: req.isActive === true ? "Active" : "Not Active",
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    if (req?.name && req.name !== existingUser?.name) {
      updateUserData.name = req.name;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterId,
        action: "UPDATE",
        field: "name",
        previousValue: existingUser.name,
        newValue: req.name,
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    if (Object.keys(updateUserData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }

    // Update user
    const updatedUser = await userRepository.update(req.id, updateUserData);

    if (!updatedUser) {
      throw APIError.internal("Failed to update user");
    }

    // Create history records
    for (const historyEntry of userHistoryData) {
      await userRepository.createHistory(historyEntry);
    }

    // Get market center if needed
    let marketCenter;
    if (updatedUser.marketCenterId) {
      marketCenter = await marketCenterRepository.findById(
        updatedUser.marketCenterId
      );
    }

    const safeUser = {
      ...updatedUser,
      name: updatedUser?.name ?? "",
      marketCenter: marketCenter ?? undefined,
    };

    return { user: safeUser };
  }
);
