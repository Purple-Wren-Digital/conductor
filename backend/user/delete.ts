import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { UserRole } from "@prisma/client";

export interface DeleteUserRequest {
  id: string;
}
export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

export const deleteUser = api<DeleteUserRequest, DeleteUserResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/users/:id",
    auth: true,
  },
  async (req) => {
    const actingUserId = "user_1";
    const actingUserRoles: UserRole[] = [UserRole.ADMIN];

    const user = await prisma.user.findUnique({
      where: { id: req.id },
      select: { id: true, deletedAt: true },
    });
    if (!user) throw APIError.notFound("User not found");

    const isAdmin = actingUserRoles.includes(UserRole.ADMIN);
    const isSelf = actingUserId === user.id;
    if (!isAdmin && !isSelf) {
      throw APIError.permissionDenied(
        "Only admins and the actual user can delete the user."
      );
    }

    if (user.deletedAt) {
      return { success: true, message: "User already deactivated" };
    }

    await prisma.user.update({
      where: { id: req.id },
      data: { isActive: false, deletedAt: new Date() },
    });

    return { success: true, message: "User deactivated" };
  }
);
