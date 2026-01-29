import { api, APIError } from "encore.dev/api";
import { userRepository, marketCenterRepository } from "../ticket/db";
import type { User, UserRole } from "../user/types";
import type { MarketCenter } from "../marketCenters/types";
import { getUserContext } from "../auth/user-context";
import { canManageTeam, isSuperuserProtected } from "../auth/permissions";
import {
  updateClerkUserEmail,
  updateClerkUserName,
} from "./utils-update-clerk";

export interface UpdateUserRequest {
  id: string;
  firstName?: string;
  lastName?: string;
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
    const isReactivatingUser = req.isActive === true;

    if (
      !existingUser ||
      (!isReactivatingUser && existingUser.isActive === false)
    ) {
      throw APIError.notFound("User not found");
    }

    const isEditingSelf = userContext.userId === req.id;
    const canModifyUsers = await canManageTeam(
      userContext,
      req.id,
      req.marketCenterId
    );
    const canUpdateMarketCenterAssignment =
      userContext?.role && userContext.role !== "AGENT" && !isEditingSelf;

    if (!canModifyUsers && !isEditingSelf) {
      throw APIError.permissionDenied(
        "Insufficient permissions to update other users"
      );
    }

    // Protect superusers from being modified by non-superusers
    if (!isEditingSelf && isSuperuserProtected(existingUser, userContext)) {
      throw APIError.permissionDenied("Cannot modify a superuser account");
    }

    // Build update data object + user history
    let previousMarketCenterId: string | null =
      existingUser?.marketCenterId ?? null;

    const updateUserData: any = {};
    const userHistoryData: any[] = [];
    let marketCenterToAssign: MarketCenter | null = null;
    let marketCenterToAssignId: string | null = null;
    if (req?.marketCenterId && req.marketCenterId === "Unassigned") {
      marketCenterToAssign = null;
      marketCenterToAssignId = null;
    } else if (req?.marketCenterId && req.marketCenterId !== "Unassigned") {
      marketCenterToAssign = await marketCenterRepository.findById(
        req.marketCenterId
      );
    } else {
      marketCenterToAssign = null;
    }

    if (
      canUpdateMarketCenterAssignment &&
      req?.marketCenterId !== undefined &&
      marketCenterToAssign &&
      marketCenterToAssignId !== previousMarketCenterId
    ) {
      updateUserData.marketCenterId = marketCenterToAssignId;
      userHistoryData.push({
        userId: req.id,
        action: "UPDATE",
        field: "market center",
        previousValue: existingUser?.marketCenterId ?? "Unassigned",
        newValue: marketCenterToAssignId ?? "Unassigned",
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    if (!isEditingSelf && req?.role && req.role !== existingUser?.role) {
      updateUserData.role = req.role;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterToAssignId,
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
        marketCenterId: marketCenterToAssignId,
        action: "UPDATE",
        field: req.isActive === true ? "Activated" : "Deactivated",
        previousValue:
          existingUser?.isActive === true ? "Active" : "Not Active",
        newValue: req.isActive === true ? "Active" : "Not Active",
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    const name = [req.firstName, req.lastName].filter(Boolean).join(" ");
    if (name && name !== existingUser?.name) {
      updateUserData.name = name;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterToAssignId,
        action: "UPDATE",
        field: "name",
        previousValue: existingUser.name,
        newValue: name,
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    if (req?.email && req.email !== existingUser?.email) {
      updateUserData.email = req.email;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterToAssignId,
        action: "UPDATE",
        field: "email",
        previousValue: existingUser.email,
        newValue: req.email,
        snapshot: existingUser,
        changedById: userContext.userId,
      });
    }

    if (Object.keys(updateUserData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }
    if (existingUser.clerkId) {
    }

    // Update Clerk user if email/name has changed
    if (updateUserData?.email) {
      await updateClerkUserEmail(existingUser.clerkId, updateUserData.email);
    }

    if (updateUserData.name) {
      await updateClerkUserName(existingUser.clerkId, {
        firstName: req.firstName,
        lastName: req.lastName,
      });
    }

    // Update user
    const updatedUser = await userRepository.update(req.id, updateUserData);

    if (!updatedUser) {
      throw APIError.internal("Failed to update user in Encore database");
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
