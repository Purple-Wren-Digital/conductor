import { api, APIError, Query } from "encore.dev/api";
import { db, subscriptionRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export type Granularity = "daily" | "weekly" | "monthly";

export interface CreatedVolumeRequest {
  marketCenterIds?: Query<string[]>;
  creatorIds?: Query<string[]>;
  assigneeIds?: Query<string[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  granularity?: Query<Granularity>;
}

export interface CreatedVolumeResponse {
  ticketsCreated: {
    period: string;
    createdCount: number;
  }[];
  total: number;
  granularity: Granularity;
}

interface TicketRow {
  id: string;
  created_at: Date;
}

export const createdByMonth = api<CreatedVolumeRequest, CreatedVolumeResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/created-by-month",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const subscription = await subscriptionRepository.findByMarketCenterId(
      userContext?.marketCenterId
    );
    const isActive = subscription && subscription?.status === "ACTIVE";
    const isEnterprise =
      subscription && subscription?.planType === "ENTERPRISE";

    // Convert arrays to filter params (null if empty)
    const categoryIds =
      req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;
    const assigneeIds =
      req.assigneeIds && req.assigneeIds.length > 0 ? req.assigneeIds : null;
    const creatorIds =
      req.creatorIds && req.creatorIds.length > 0 ? req.creatorIds : null;
    const marketCenterIds =
      req.marketCenterIds && req.marketCenterIds.length > 0
        ? req.marketCenterIds
        : null;

    // Parse date filters
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (req.dateFrom) {
      const from = new Date(req.dateFrom);
      if (!isNaN(from.getTime())) dateFrom = from;
    }
    if (req.dateTo) {
      const to = new Date(req.dateTo);
      if (!isNaN(to.getTime())) dateTo = to;
    }

    // Default to last 6 months if no date range provided
    if (!dateFrom && !dateTo) {
      dateFrom = new Date();
      dateFrom.setDate(1);
      dateFrom.setMonth(dateFrom.getMonth() - 6);
    }

    let tickets: TicketRow[] = [];

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          tickets = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        }
        break;
      case "ADMIN":
        if (isActive && isEnterprise) {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ANY(${marketCenterIds})
              OR creator.market_center_id = ANY(${marketCenterIds})
              OR assignee.market_center_id = ANY(${marketCenterIds})
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else if (isActive && userContext?.marketCenterId) {
          tickets = await db.queryAll<TicketRow>`
            SELECT DISTINCT t.id, t.created_at
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          tickets = await db.queryAll<TicketRow>`
            SELECT t.id, t.created_at
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
            )
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR t.assignee_id = ANY(${assigneeIds}))
            AND (${creatorIds}::text[] IS NULL OR t.creator_id = ANY(${creatorIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
          `;
        }
        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to generate ticket reports"
        );
    }

    // Determine granularity - auto-detect if not provided
    let granularity: Granularity = req?.granularity
      ? (req.granularity as Granularity)
      : ("monthly" as Granularity);

    if (!req.granularity && dateFrom && dateTo) {
      const daysDiff = Math.ceil(
        (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 31) {
        granularity = "daily";
      } else if (daysDiff <= 90) {
        granularity = "weekly";
      } else {
        granularity = "monthly";
      }
    } else if (!req.granularity && dateFrom && !dateTo) {
      const daysDiff = Math.ceil(
        (new Date().getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 31) {
        granularity = "daily";
      } else if (daysDiff <= 90) {
        granularity = "weekly";
      } else {
        granularity = "monthly";
      }
    }

    const ticketsCreated: {
      period: string;
      createdCount: number;
    }[] = [];

    // Helper to get the period key based on granularity
    const getPeriodKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      switch (granularity) {
        case "daily":
          return `${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}/${year}`;
        case "weekly":
          // Get the Monday of the week
          const dayOfWeek = date.getDay();
          const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          const monday = new Date(date);
          monday.setDate(diff);
          const wMonth = monday.getMonth() + 1;
          const wDay = monday.getDate();
          const wYear = monday.getFullYear();
          return `Week of ${wMonth.toString().padStart(2, "0")}/${wDay.toString().padStart(2, "0")}/${wYear}`;
        case "monthly":
        default:
          return `${month.toString().padStart(2, "0")}/${year}`;
      }
    };

    // Sort the tickets into groups based on granularity
    tickets.forEach((ticket) => {
      const createdDate = new Date(ticket.created_at);
      const periodKey = getPeriodKey(createdDate);

      const existingGroup = ticketsCreated.find(
        (group) => group.period === periodKey
      );
      if (existingGroup) {
        existingGroup.createdCount += 1;
      } else {
        ticketsCreated.push({
          period: periodKey,
          createdCount: 1,
        });
      }
    });

    // Sort by period (chronologically)
    ticketsCreated.sort((a, b) => {
      // Parse the periods for comparison
      const parseDate = (period: string): Date => {
        if (period.startsWith("Week of ")) {
          const parts = period.replace("Week of ", "").split("/");
          return new Date(
            parseInt(parts[2]),
            parseInt(parts[0]) - 1,
            parseInt(parts[1])
          );
        } else if (period.split("/").length === 3) {
          // Daily: MM/DD/YYYY
          const parts = period.split("/");
          return new Date(
            parseInt(parts[2]),
            parseInt(parts[0]) - 1,
            parseInt(parts[1])
          );
        } else {
          // Monthly: MM/YYYY
          const parts = period.split("/");
          return new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
        }
      };
      return parseDate(a.period).getTime() - parseDate(b.period).getTime();
    });

    return { ticketsCreated, total: tickets?.length || 0, granularity };
  }
);
