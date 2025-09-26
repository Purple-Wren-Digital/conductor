import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { MarketCenter } from "./types";
import { getUserContext } from "../auth/user-context";
import { marketCenterScopeFilter } from "../auth/permissions";

export interface GetMarketCenterRequest {
  id: string;
}

export interface GetMarketCenterResponse {
  marketCenter: MarketCenter;
}

export const get = api<GetMarketCenterRequest, GetMarketCenterResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const scopeFilter = await marketCenterScopeFilter(userContext, req.id);

    if (userContext.role === "AGENT" || !scopeFilter || !scopeFilter?.id) {
      throw APIError.permissionDenied(
        "Only Admin and Staff can view market centers"
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
      throw APIError.notFound("Market Center not found");
    }
    return { marketCenter: marketCenter } as GetMarketCenterResponse;
  }
);
