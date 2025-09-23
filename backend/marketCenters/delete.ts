import { api, APIError, Query } from "encore.dev/api";
// import { canCreateMarketCenters } from "../auth/permissions";
// import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
import { MarketCenter } from "./types";
import { User } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { canDeleteMarketCenters } from "../auth/permissions";

export interface DeleteMarketCenterRequest {
  id: string; // Query<string>;
}

export interface DeleteMarketCenterResponse {
  success: boolean;
  message: string;
}

export const deleteMarketCenter = api<
  DeleteMarketCenterRequest,
  DeleteMarketCenterResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/marketCenters/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canDeleteMC = await canDeleteMarketCenters(userContext);
    if (!canDeleteMC) {
      throw APIError.permissionDenied(
        "You do not have permission to delete market centers"
      );
    }

    if (!req.id) {
      throw APIError.invalidArgument("Missing request data");
    }

    const marketCenter = await prisma.marketCenter.findUnique({
      where: { id: req.id },
    });

    if (!marketCenter) {
      throw APIError.notFound("Market Center not found");
    }

    await prisma.marketCenter.delete({
      where: { id: req.id },
    });

    return {
      success: true,
      message: "Market Center deleted successfully",
    };
  }
);
