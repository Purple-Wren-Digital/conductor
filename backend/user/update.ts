import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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
    const existingUser = await prisma.user.findUnique({
      where: { id: req.id },
    });

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
    let userHistoryData: any = [];

    if (
      !isEditingSelf &&
      req?.marketCenterId &&
      req?.marketCenterId !== existingUser?.marketCenterId &&
      userContext?.role === "ADMIN"
    ) {
      const marketCenter = await prisma.marketCenter.findFirst({
        where: { id: req.marketCenterId },
      });

      marketCenterId = marketCenter?.id ?? null;
      if (marketCenter) {
        updateUserData.marketCenterId = {
          ...updateUserData,
          set: marketCenter?.id,
          marketCenterId: marketCenter?.id,
        };
        userHistoryData.push({
          userId: req.id,
          action: "UPDATE",
          field: "marketCenterId",
          previousValue: existingUser?.marketCenterId ?? "Unassigned",
          newValue: req.marketCenterId,
          snapshot: existingUser,
          changedAt: new Date(),
          changedById: userContext.userId,
        });
      }
    }

    if (
      !isEditingSelf &&
      req?.role &&
      req.role !== existingUser?.role &&
      userContext?.role === "ADMIN"
    ) {
      updateUserData.role = req.role;
      userHistoryData.push({
        userId: req.id,
        marketCenterId: marketCenterId,
        action: "UPDATE",
        field: "role",
        previousValue: existingUser.role,
        newValue: req.role,
        snapshot: existingUser,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }

    if (
      !isEditingSelf &&
      req?.isActive !== undefined &&
      userContext?.role === "ADMIN"
    ) {
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
        changedAt: new Date(),
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
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }

    // TODO: update email in CLERK for existing user as well
    // if (req?.email && req.email !== existingUser.email) {
    //   updateUserData.email = req.email;
    //   userHistoryData.push({
    //     userId: req.id,
    //     marketCenterId: marketCenterId,
    //     field: "email",
    //     previousValue: existingUser.email,
    //     newValue: req.email,
    //     snapshot: existingUser,
    //     changedAt: new Date(),
    //     changedById: userContext.userId,
    //   });
    // }

    if (Object.keys(updateUserData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }

    const [updatedUser, userHistory] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.id },
        data: updateUserData,
        include: {
          marketCenter: req?.isActive ?? true,
        },
      }),
      prisma.userHistory.createMany({
        data: userHistoryData,
      }),
    ]);

    const safeUser = {
      ...updatedUser,
      name: updatedUser?.name ?? "",
      marketCenter: updatedUser.marketCenter ?? undefined,
    };

    return { user: safeUser };
  }
);
