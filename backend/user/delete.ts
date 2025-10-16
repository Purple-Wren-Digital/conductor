import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canDeactivateUsers } from "../auth/permissions";

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
    const userContext = await getUserContext();

    const isAdmin = await canDeactivateUsers(userContext);
    if (!isAdmin) {
      throw APIError.permissionDenied("Only admins delete/deactivate users");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.id, isActive: true },
      select: { id: true, isActive: true, deletedAt: true },
    });
    if (!user) throw APIError.notFound("User not found");

    if (user?.deletedAt) {
      return { success: true, message: "User already deactivated" };
    }

    const result = await prisma.$transaction(async (u) => {
      const deactivatedUser = await u.user.update({
        where: { id: req.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
        include: {
          userHistory: true,
        },
      });

      const history = await u.userHistory.create({
        data: {
          userId: user.id,
          action: "DELETE",
          field: "isActive",
          previousValue: "true",
          newValue: "false",
          changedById: userContext.userId,
          snapshot: user,
        },
      });

      return { deactivatedUser, history };
    });

    if (!result || !result?.deactivatedUser) {
      throw APIError.aborted("User was not deactivated");
    }

    return { success: true, message: "User deactivated" };
  }
);
