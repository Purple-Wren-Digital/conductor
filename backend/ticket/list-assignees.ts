import { api, Query } from "encore.dev/api";
import { ticketRepository } from "./db";
import { getUserContext } from "../auth/user-context";
import { getAccessibleMarketCenterIds } from "../auth/permissions";
import { userMarketCenterRepository } from "../shared/repositories/user-market-center.repository";

export interface ListTicketAssigneesRequest {
  marketCenterId?: Query<string>;
}

export interface TicketAssignee {
  id: string;
  name: string | null;
  role: string;
  isActive: boolean;
}

export interface ListTicketAssigneesResponse {
  assignees: TicketAssignee[];
}

// Returns the distinct set of users who are the assignee of at least one
// ticket within the caller's visible ticket scope. This mirrors the exact
// role-based scoping used by the main ticket list (`/tickets/search`) so
// that a user assigned to a ticket always appears in the assignee filter,
// even if they've since been deactivated, switched to the AGENT role, or
// left the market center.
export const listTicketAssignees = api<
  ListTicketAssigneesRequest,
  ListTicketAssigneesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/assignees",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);

    if (!accessibleMarketCenterIds.length) {
      return { assignees: [] };
    }

    let marketCenterIds: string[] = [];

    if (userContext.role === "ADMIN") {
      if (
        req.marketCenterId &&
        accessibleMarketCenterIds.includes(req.marketCenterId)
      ) {
        marketCenterIds = [req.marketCenterId];
      } else {
        marketCenterIds = accessibleMarketCenterIds;
      }
    }

    if (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") {
      if (req.marketCenterId) {
        const belongs =
          await userMarketCenterRepository.userBelongsToMarketCenter(
            userContext.userId,
            req.marketCenterId
          );
        if (belongs) {
          marketCenterIds = [req.marketCenterId];
        } else if (userContext.marketCenterId) {
          marketCenterIds = [userContext.marketCenterId];
        }
      } else if (userContext.marketCenterId) {
        marketCenterIds = [userContext.marketCenterId];
      }
    }

    const assignees = await ticketRepository.findAssignees({
      userId: userContext.userId,
      userRole: userContext.role,
      marketCenterIds,
    });

    return { assignees };
  }
);
