import { api, APIError } from "encore.dev/api";
import { canCreateMarketCenters } from "../auth/permissions";
import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
import { MarketCenter } from "./types";
import { User } from "../ticket/types";

export interface CreateMarketCenterRequest {
  name: string;
  users?: User[];
  // TODO:
  // ticketCategories?: TicketCategory[];
  // settings:
  // settingsAuditLogs?: SettingsAuditLog[];
  // teamInvitations:
}

export interface CreateMarketCenterResponse {
  marketCenter: MarketCenter;
}

export const create = api<
  CreateMarketCenterRequest,
  CreateMarketCenterResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/marketCenters",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canCreate = await canCreateMarketCenters(userContext);
    if (!canCreate) {
      throw APIError.permissionDenied("Only Amin can create market centers");
    }

    const marketCenter = await prisma.marketCenter.create({
      data: {
        name: req.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        // teamInvitations: { create: teamInvitation },
        // ticketCategories: { create: req.ticketCategories }, // TicketCategory[]
        // settings: req.settingsAuditLogs,
        // settingsAuditLogs: req.settingsAuditLogs, // SettingsAuditLog[]
        users: {
          connect: req.users?.map((u) => ({ id: u.id })),
        },
      },
      include: { users: true },
    });
    if (!marketCenter || !marketCenter.users) {
      throw APIError.unimplemented("Unable to create market center");
    }
    const formattedMarketCenter = {
      ...marketCenter,
      users: marketCenter.users.map((user) => ({
        ...user,
        name: user.name ?? "",
      })),
    };
    return { marketCenter: formattedMarketCenter };
  }
);
