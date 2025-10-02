import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User, UserRole } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { canManageTeam } from "../auth/permissions";
import { mapTicketHistorySnapshot } from "../utils";

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
    auth: false,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Permission checks
    const canModifyUsers = await canManageTeam(userContext);

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

    // Build update data object + user history
    const updateUserData: any = {};
    let userHistoryData: any = [];

    if (req.name !== existingUser?.name) {
      updateUserData.name = req.name;
      userHistoryData.push({
        userId: req.id,
        field: "name",
        previousValue: existingUser.name,
        newValue: req.name,
        snapshot: existingUser,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.role !== existingUser?.role && userContext?.role === "ADMIN") {
      updateUserData.role = req.role;
      userHistoryData.push({
        userId: req.id,
        field: "role",
        previousValue: existingUser.role,
        newValue: req.role,
        snapshot: existingUser,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (
      req?.marketCenterId &&
      req?.marketCenterId !== existingUser?.marketCenterId &&
      userContext?.role === "ADMIN"
    ) {
      updateUserData.marketCenterId = {
        ...updateUserData,
        set: req.marketCenterId,
        marketCenterId: req.marketCenterId,
      };
      userHistoryData.push({
        userId: req.id,
        field: "marketCenterId",
        previousValue: existingUser?.marketCenterId ?? "Unassigned",
        newValue: req.marketCenterId,
        snapshot: existingUser,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.isActive !== undefined && userContext?.role === "ADMIN") {
      updateUserData.isActive = req.isActive;
      userHistoryData.push({
        userId: req.id,
        field: "isActive",
        previousValue: existingUser.isActive,
        newValue: req.isActive,
        snapshot: existingUser,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    // TODO: update email in Auth0 for existing user as well
    // if (req.email !== existingUser.email) {
    //   updateUserData.email = req.email;
    //   userHistoryData.push({
    //     userId: req.id,
    //     field: "email",
    //     previousValue: existingUser.email,
    //     newValue: req.email,
    //     snapshot: existingUser,
    //     changedAt: new Date(),
    //     changedById: userContext.userId,
    //   });
    // }

    if (Object.keys(updateUserData).length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.id },
        data: updateUserData,
        include: {
          marketCenter: true,
          ticketHistory: true,
          userHistory: true,
          otherUsersChanges: true,
        },
      }),
      prisma.userHistory.createMany({
        data: userHistoryData,
      }),
    ]);

    const safeUser = {
      ...updatedUser,
      name: updatedUser?.name ?? "",
      ticketHistory: mapTicketHistorySnapshot(updatedUser?.ticketHistory),
      userHistory: mapTicketHistorySnapshot(updatedUser?.userHistory),
      otherUsersChanges: mapTicketHistorySnapshot(
        updatedUser?.otherUsersChanges
      ),
      marketCenter: updatedUser.marketCenter ?? undefined,
    };

    return { user: safeUser };
  }
);
