import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import {
  db,
  userRepository,
  userMarketCenterRepository,
} from "../ticket/db";

export interface SwitchMarketCenterRequest {
  marketCenterId: string;
}

export interface SwitchMarketCenterResponse {
  marketCenterId: string;
  marketCenter: {
    id: string;
    name: string;
  };
}

export const switchMarketCenter = api<
  SwitchMarketCenterRequest,
  SwitchMarketCenterResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/users/me/switch-market-center",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!req.marketCenterId) {
      throw APIError.invalidArgument("marketCenterId is required");
    }

    // Verify user belongs to the target market center
    const belongs = await userMarketCenterRepository.userBelongsToMarketCenter(
      userContext.userId,
      req.marketCenterId
    );

    if (!belongs && !userContext.isSuperuser) {
      throw APIError.permissionDenied(
        "You do not belong to this market center"
      );
    }

    // Fetch the target market center to return its name
    const mcRow = await db.queryRow<{ id: string; name: string }>`
      SELECT id, name FROM market_centers WHERE id = ${req.marketCenterId}
    `;

    if (!mcRow) {
      throw APIError.notFound("Market center not found");
    }

    // Update the user's active market center
    await userRepository.update(userContext.userId, {
      marketCenterId: req.marketCenterId,
    });

    // Log the switch in user history
    await userRepository.createHistory({
      userId: userContext.userId,
      marketCenterId: req.marketCenterId,
      action: "SWITCH",
      field: "market center",
      previousValue: userContext.marketCenterId ?? null,
      newValue: req.marketCenterId,
      changedById: userContext.userId,
    });

    return {
      marketCenterId: mcRow.id,
      marketCenter: {
        id: mcRow.id,
        name: mcRow.name,
      },
    };
  }
);
