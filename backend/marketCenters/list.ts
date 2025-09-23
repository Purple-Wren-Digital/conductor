import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { MarketCenter } from "./types";
import { canManageMarketCenters } from "../auth/permissions";

export interface ListMarketCentersRequest {
  id?: Query<string>;
  name?: Query<string>;
  sort?: Query<string>;
  // username?: Query<string>;
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
    const userContext = await getUserContext();
    const canManage = canManageMarketCenters(userContext);

    if (!canManage) {
      throw APIError.permissionDenied("Only Admin can update market centers");
    }

    let where: any = {};

    if (req.name) {
      where.role = req.name;
    }

    if (req.id) {
      where.role = req.id;
    }

    const marketCenters = await prisma.marketCenter.findMany({
      orderBy: { name: "asc" },
      include: { users: true },
    });

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
