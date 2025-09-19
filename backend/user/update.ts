import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import {
  canChangeUserRoles,
  canManageTeam,
  canModifyOwnProfile,
} from "../auth/permissions";

export interface UpdateUserRequest {
  id: string;
  name?: string;
  role?: UserRole;
  // isActive?: boolean;
  email?: string;
}

export interface UpdateUserResponse {
  user: User;
}

export const update = api<UpdateUserRequest, UpdateUserResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/users/:id/update",
    auth: false,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Permission checks
    const canModifyUsers = await canManageTeam(userContext);
    const isAdmin = await canChangeUserRoles(userContext);

    if (!canModifyUsers) {
      throw APIError.permissionDenied(
        "Insufficient permissions to update other users"
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
    });

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    // Build update data object
    const updateUserData: any = {};
    if (req.name !== existingUser.name) updateUserData.name = req.name;
    if (req.role !== existingUser.role && isAdmin)
      updateUserData.role = req.role;
    // if (req.isActive !== undefined && (isAdmin))
    //   updateUserData.isActive = req.isActive;
    if (req.email !== existingUser.email) updateUserData.email = req.email; // TODO: update email in Auth0 for existing user as well

    const updatedUser = await prisma.user.update({
      where: { id: req.id },
      data: updateUserData,
    });

    return { user: { ...updatedUser, name: updatedUser.name ?? "" } };
  }
);
