import { api, APIError } from "encore.dev/api";
import { db, withTransaction } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canDeleteMarketCenters } from "../auth/permissions";

export interface DeleteMarketCenterRequest {
  id: string;
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

    const marketCenter = await db.queryRow<{ id: string }>`
      SELECT id FROM market_centers WHERE id = ${req.id}
    `;

    if (!marketCenter) {
      throw APIError.notFound("Market Center not found");
    }

    await withTransaction(async (tx) => {
      await tx.exec`
        DELETE FROM market_center_history
        WHERE market_center_id = ${req.id}
      `;

      await tx.exec`
        DELETE FROM market_centers
        WHERE id = ${req.id}
      `;
    });

    return {
      success: true,
      message: "Market Center deleted successfully",
    };
  }
);
