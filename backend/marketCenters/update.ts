import { api, APIError, Query } from "encore.dev/api";
// import { canCreateMarketCenters } from "../auth/permissions";
// import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
import { MarketCenter } from "./types";
import { User } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { canManageMarketCenters } from "../auth/permissions";

export interface UpdateMarketCenterRequest {
  id: string;
  name?: string;
  users?: User[];
  // settingsAuditLogs?: SettingsAuditLog[]; // TODO:
  // ticketCategories?: TicketCategory[]; // TODO:
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

    if (req.name !== marketCenter.name) updateMarketCenterData.name = req.name;

    if (req?.users) {
      // Disconnects all existing users from the market center
      // Then, connects only the users in req.users based on their id
      updateMarketCenterData.users = {
        set: req.users.map((u) => u),
      };
    }

    const updatedMarketCenter = await prisma.marketCenter.update({
      where: { id: req.id },
      include: { users: true },
      data: updateMarketCenterData,
    });

    const formattedMarketCenter = {
      ...updatedMarketCenter,
      users: updatedMarketCenter.users.map((user) => ({
        ...user,
        name: user.name ?? "",
      })),
    };
    return { marketCenter: formattedMarketCenter };
  }
);
