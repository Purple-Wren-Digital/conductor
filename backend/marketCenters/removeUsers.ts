import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { MarketCenter } from "./types";
import { User } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { marketCenterScopeFilter } from "../auth/permissions";

export interface UpdateMarketCenterRequest {
  id: string;
  users: User[];
  // settingsAuditLogs?: SettingsAuditLog[]; // TODO:
  // ticketCategories?: TicketCategory[]; // TODO:
}

export interface UpdateMarketCenterResponse {
  marketCenter: MarketCenter;
}

// Creates a new market center
export const removeUsers = api<
  UpdateMarketCenterRequest,
  UpdateMarketCenterResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/marketCenters/users/:id",
    auth: true,
  },
  async (req) => {
    if (!req.users || !req.id) {
      throw APIError.invalidArgument("Missing data");
    }
    const userContext = await getUserContext();
    const scopeFilter = await marketCenterScopeFilter(userContext, req.id);

    if (userContext.role === "AGENT" || !scopeFilter || !scopeFilter?.id) {
      throw APIError.permissionDenied(
        "Only Admin and Staff can update market centers"
      );
    }

    let where: any = {
      ...scopeFilter,
    };

    const marketCenter = await prisma.marketCenter.findUnique({
      where,
      include: { users: true },
    });
    if (!marketCenter) {
      throw APIError.notFound("Cannot find Market Center");
    }

    // const updatedMarketCenter = await prisma.marketCenter.update({
    //   where,
    //   include: { users: true },
    //   data: {
    //     users: {
    //       disconnect: req.users.map((u) => ({ id: u.id })),
    //     },
    //   },
    // });

    const result = await prisma.$transaction(async (pr) => {
      const updatedMarketCenter = await pr.marketCenter.update({
        where: { id: req.id },
        include: { users: true },
        data: {
          users: {
            disconnect: req.users.map((u) => ({ id: u.id })),
          },
        },
      });

      const removedUsersData = req.users.map((user) => {
        const removedUser = {
          marketCenterId: marketCenter.id,
          changedById: userContext.userId,
          action: "REMOVE",
          field: "team",
          previousValue: JSON.stringify({id: user.id,name: user.name}),
        };
        return removedUser;
      });

      const marketCenterLog = await pr.marketCenterHistory.createMany({
        data: removedUsersData,
      });

      // const settingsAuditLog = await pr.settingsAuditLog.createMany({
      //   data: [
      //     {
      //       marketCenterId: marketCenter.id,
      //       action: "REMOVE",
      //       section: "team",
      //       previousValue: {
      //         old: marketCenter?.users
      //           ? marketCenter.users.map((u) => ({ userId: u.id }))
      //           : {},
      //       },
      //       newValue: {
      //         new: updatedMarketCenter.users
      //           ? updatedMarketCenter.users.map((u) => ({ userId: u.id }))
      //           : {},
      //       },
      //       userId: userContext.userId,
      //     },
      //   ],
      // });

      return { updatedMarketCenter, marketCenterLog };
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
