import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { UserRole } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { MarketCenter } from "./types";
import { canManageMarketCenters } from "../auth/permissions";

export interface ListMarketCentersRequest {
  role?: Query<UserRole>;
}

export interface ListMarketCentersResponse {
  marketCenters: MarketCenter[];
}

export const list = api<ListMarketCentersRequest, ListMarketCentersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters",
    auth: true,
  },
  async (req) => {
    const marketCenters = await prisma.marketCenter.findMany({
      orderBy: { name: "asc" },
      include: { users: true },
    });
    const userContext = await getUserContext();
    const canManage = canManageMarketCenters(userContext);

    if (!canManage) {
      throw APIError.permissionDenied("Only Admin can update market centers");
    }

    const formattedMarketCenters = marketCenters.map((mc) => ({
      ...mc,
      users: mc.users.map((user) => ({
        ...user,
        name: user.name ?? "",
      })),
    }));
    return { marketCenters: formattedMarketCenters };
  }
);
