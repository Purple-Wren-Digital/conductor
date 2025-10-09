import { api, APIError, Query } from "encore.dev/api";
// import { canCreateMarketCenters } from "../auth/permissions";
// import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
import { MarketCenter, TicketCategory } from "./types";
import { User } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { canManageMarketCenters } from "../auth/permissions";

export interface UpdateMarketCenterRequest {
  id: string;
  name?: string;
  users?: User[];
  ticketCategories?: TicketCategory[]; // TODO:
}

export interface UpdateMarketCenterResponse {
  marketCenter: MarketCenter;
}

// Creates a new market center
export const update = api<
  UpdateMarketCenterRequest,
  UpdateMarketCenterResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/marketCenters/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const canManage = canManageMarketCenters(userContext);

    if (!canManage) {
      throw APIError.permissionDenied("Only Admin can update market centers");
    }

    const marketCenter = await prisma.marketCenter.findUnique({
      where: { id: req.id },
      include: { users: true },
    });
    if (!marketCenter) {
      throw APIError.notFound("Cannot find Market Center");
    }

    const updateMarketCenterData: any = {};
    let marketCenterHistory: any = [];

    if (req?.name !== marketCenter.name) {
      updateMarketCenterData.name = req.name;
      marketCenterHistory.push({
        marketCenterId: marketCenter.id,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "name",
        previousValue: marketCenter?.name,
        newValue: req.name,
      });
    }

    

    if (req?.users) {
      const oldUserIds = marketCenter.users.map((u) => u.id);
      const newUserIds = req.users.map((u) => u.id);

      const addedUserIds = newUserIds.filter((id) => !oldUserIds.includes(id));
      const removedUserIds = oldUserIds.filter(
        (id) => !newUserIds.includes(id)
      );

      const addedUsers = req.users.filter((u) => addedUserIds.includes(u.id));
      const removedUsers = marketCenter.users.filter((u) =>
        removedUserIds.includes(u.id)
      );

      // Build Prisma update
      updateMarketCenterData.users = {
        connect: addedUserIds.map((id) => ({ id })),
        disconnect: removedUserIds.map((id) => ({ id })),
      };

      // Track adds/removes for history
      if (addedUsers.length > 0) {
        marketCenterHistory.push(
          ...addedUsers.map((userAdded) => ({
            marketCenterId: marketCenter.id,
            changedById: userContext.userId,
            action: "ADD",
            field: "team",
            previousValue: undefined,
            newValue: JSON.stringify({
              id: userAdded.id,
              name: userAdded.name,
            }),
          }))
        );
      }

      if (removedUsers.length > 0) {
        marketCenterHistory.push(
          ...removedUsers.map((userRemoved) => ({
            marketCenterId: marketCenter.id,
            changedById: userContext.userId,
            action: "REMOVE",
            field: "team",
            previousValue: JSON.stringify({
              id: userRemoved.id,
              name: userRemoved.name,
            }),
            newValue: undefined,
          }))
        );
      }
    }

    if (Object.keys(updateMarketCenterData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }

    const result = await prisma.$transaction(async (pr) => {
      const updatedMarketCenter = await pr.marketCenter.update({
        where: { id: req.id },
        include: { users: true },
        data: updateMarketCenterData,
      });

      const marketCenterLog = await pr.marketCenterHistory.createMany({
        data: marketCenterHistory,
      });


      return {
        updatedMarketCenter,
        marketCenterLog,
      };
    });

    const formattedMarketCenter = {
      ...result.updatedMarketCenter,
      users: result.updatedMarketCenter.users.map((user) => ({
        ...user,
        name: user.name ?? "",
      })),
    };
    return { marketCenter: formattedMarketCenter };
  }
);
