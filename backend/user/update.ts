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
  isActive?: boolean;
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
    const isOwnProfile = await canModifyOwnProfile(userContext, req.id);
    const isStaff = await canManageTeam(userContext);
    const isAdmin = (await canChangeUserRoles(userContext)) && isStaff;

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
    });

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    // Users can update their own profile, but only their name
    // Staff can update agents, but not their roles
    // Admins can update anyone
    if (!isOwnProfile) {
      if (isStaff && existingUser.role !== "AGENT") {
        throw APIError.permissionDenied("Staff can only update agent profiles");
      }
      if (!isStaff && !isAdmin) {
        throw APIError.permissionDenied(
          "Insufficient permissions to update other users"
        );
      }
    }

    // Only admins can change roles
    if (req.role && req.role !== existingUser.role && !isAdmin) {
      throw APIError.permissionDenied("Only admins can change user roles");
    }

    // Build update data object
    const updateUserData: any = {};
    if (req.name !== undefined) updateUserData.name = req.name;
    if (req.role !== undefined && isAdmin) updateUserData.role = req.role;
    if (req.isActive !== undefined) updateUserData.isActive = req.isActive;
    if (req.email !== undefined) updateUserData.email = req.email;

    const updatedUser = await prisma.user.update({
      where: { id: req.id },
      data: updateUserData,
    });

    return { user: { ...updatedUser, name: updatedUser.name ?? "" } };
  }
);
