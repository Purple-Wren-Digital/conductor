import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";

export interface UpdateUserRequest {
  id: string;
  name?: string;
  role?: UserRole;
}

export interface UpdateUserResponse {
  user: User;
}

export const update = api<UpdateUserRequest, UpdateUserResponse>(
  { expose: true, method: "PUT", path: "/users/:id", auth: true },
  async (req) => {
    // TODO: Implement auth context
    const currentUserId = "user_1";
    const currentUserRole = "ADMIN" as UserRole;

    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
    });

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    // Permission checks
    const isOwnProfile = currentUserId === req.id;
    const isAdmin = currentUserRole === "ADMIN";
    const isStaff = currentUserRole === "STAFF";

    // Users can update their own profile
    // Staff can update agents
    // Admins can update anyone
    if (!isOwnProfile) {
      if (isStaff && existingUser.role !== "AGENT") {
        throw APIError.permissionDenied("Staff can only update agent profiles");
      }
      if (!isStaff && !isAdmin) {
        throw APIError.permissionDenied("Insufficient permissions to update other users");
      }
    }

    // Only admins can change roles
    if (req.role && req.role !== existingUser.role && !isAdmin) {
      throw APIError.permissionDenied("Only admins can change user roles");
    }

    // Build update data object
    const updateData: any = {};
    if (req.name !== undefined) updateData.name = req.name;
    if (req.role !== undefined && isAdmin) updateData.role = req.role;

    const updatedUser = await prisma.user.update({
      where: { id: req.id },
      data: updateData,
    });

    return { user: updatedUser };
  }
);