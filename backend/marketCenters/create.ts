import { api, APIError } from "encore.dev/api";
import { canCreateMarketCenters } from "../auth/permissions";
import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
import { MarketCenter, TicketCategory } from "./types";
import { User } from "../ticket/types";

export interface CreateMarketCenterRequest {
  name: string;
  users?: User[];
  ticketCategories?: TicketCategory[];
  // TODO:
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

    // const marketCenter = await prisma.marketCenter.create({
    //   data: {
    //     name: req.name,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     users: {
    //       connect: req.users?.map((u) => ({ id: u.id })),
    //     },
    //   },
    //   include: { users: true },
    // });

    const result = await prisma.$transaction(async (pr) => {
      const marketCenter = await pr.marketCenter.create({
        data: {
          name: req.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          users: {
            connect: req.users?.map((u) => ({ id: u.id })),
          },
        },
        include: { users: true },
      });

      const marketCenterHistory = await pr.marketCenterHistory.create({
        data: {
          marketCenterId: marketCenter?.id,
          action: "CREATE",
          snapshot: {},
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      });

      // const ticketCategoriesData =
      //   req.ticketCategories &&
      //   req.ticketCategories.map((category) => ({
      //     name: category.name,
      //     description: category?.description || undefined,
      //     marketCenterId: category.marketCenterId || undefined,
      //     defaultAssigneeId: category?.defaultAssigneeId || undefined,
      //     createdAt: new Date(),
      //     updatedAt: new Date(),
      //   }));
      // let categories: any;
      // if (ticketCategoriesData && ticketCategoriesData.length) {
      //   const categories = await pr.ticketCategory.createMany({
      //     data: { ticketCategoriesData },
      //   });
      // }

      return {
        marketCenter,
        marketCenterHistory,
      };
    });

    // TODO: Prisma Transaction
    //         ticketCategories: { connect: req.ticketCategories?.map((category) => ({ id: category.id })) }, // TicketCategory[]

    if (!result) {
      // || !!result?.marketCenter
      throw APIError.unimplemented("Unable to create market center");
    }

    const formattedMarketCenter = {
      ...result.marketCenter,
      users: result.marketCenter.users.map((user) => ({
        ...user,
        name: user.name ?? "",
      })),
    };
    return { marketCenter: formattedMarketCenter };
  }
);
