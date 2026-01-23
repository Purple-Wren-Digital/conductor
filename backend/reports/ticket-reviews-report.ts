import { api, APIError, Query } from "encore.dev/api";
import { db, fromTimestamp, subscriptionRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface TicketReviewsRequest {
  marketCenterIds?: Query<string[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  assigneeIds?: Query<string[]>;
}

export interface TicketReview {
  id: string;
  ticketId: string;
  ticketTitle: string;
  surveyorName: string;
  assigneeName: string | null;
  marketCenterName: string | null;
  overallRating: number | null;
  assigneeRating: number | null;
  marketCenterRating: number | null;
  comment: string | null;
  completedAt: string;
}

export interface TicketReviewsResponse {
  reviews: TicketReview[];
  totalReviews: number;
  averageOverallRating: number | null;
  averageAssigneeRating: number | null;
  averageMarketCenterRating: number | null;
}

interface ReviewRow {
  id: string;
  ticket_id: string;
  ticket_title: string;
  surveyor_name: string;
  assignee_name: string | null;
  market_center_name: string | null;
  overall_rating: string | null;
  assignee_rating: string | null;
  market_center_rating: string | null;
  comment: string | null;
  updated_at: Date;
}

export const ticketReviews = api<TicketReviewsRequest, TicketReviewsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/ticket-reviews",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (userContext.role === "AGENT") {
      throw APIError.permissionDenied(
        "User not permitted to view ticket reviews"
      );
    }
    const subscription = await subscriptionRepository.findByMarketCenterId(
      userContext?.marketCenterId
    );
    const isEnterprise =
      subscription && subscription?.planType === "ENTERPRISE";

    // Convert arrays to filter params (null if empty)
    const categoryIds =
      req.categoryIds !== undefined && req.categoryIds.length > 0
        ? req.categoryIds
        : null;
    const marketCenterIds =
      req.marketCenterIds !== undefined && req.marketCenterIds.length > 0
        ? req.marketCenterIds
        : null;
    const assigneeIds =
      req.assigneeIds !== undefined && req.assigneeIds.length > 0
        ? req.assigneeIds
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

    let reviewsFound: ReviewRow[] | null = null;

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          // Staff without market center can only see reviews for tickets they were assigned to
          reviewsFound = await db.queryAll<ReviewRow>`
            SELECT
              tr.id,
              tr.ticket_id,
              t.title as ticket_title,
              surveyor.name as surveyor_name,
              assignee.name as assignee_name,
              mc.name as market_center_name,
              tr.overall_rating,
              tr.assignee_rating,
              tr.market_center_rating,
              tr.comment,
              tr.updated_at
            FROM ticket_ratings tr
            JOIN tickets t ON tr.ticket_id = t.id
            LEFT JOIN users surveyor ON tr.surveyor_id = surveyor.id
            LEFT JOIN users assignee ON tr.assignee_id = assignee.id
            LEFT JOIN market_centers mc ON tr.market_center_id = mc.id
            WHERE tr.completed = true
            AND tr.assignee_id = ${userContext.userId}
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR tr.updated_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR tr.updated_at <= ${dateTo})
            ORDER BY tr.updated_at DESC
          `;
        } else {
          // Staff with market center can see reviews for their market center
          reviewsFound = await db.queryAll<ReviewRow>`
            SELECT
              tr.id,
              tr.ticket_id,
              t.title as ticket_title,
              surveyor.name as surveyor_name,
              assignee.name as assignee_name,
              mc.name as market_center_name,
              tr.overall_rating,
              tr.assignee_rating,
              tr.market_center_rating,
              tr.comment,
              tr.updated_at
            FROM ticket_ratings tr
            JOIN tickets t ON tr.ticket_id = t.id
            LEFT JOIN users surveyor ON tr.surveyor_id = surveyor.id
            LEFT JOIN users assignee ON tr.assignee_id = assignee.id
            LEFT JOIN market_centers mc ON tr.market_center_id = mc.id
            WHERE tr.completed = true
            AND tr.market_center_id = ${userContext.marketCenterId}
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR tr.assignee_id = ANY(${assigneeIds}))
            AND (${dateFrom}::timestamp IS NULL OR tr.updated_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR tr.updated_at <= ${dateTo})
            ORDER BY tr.updated_at DESC
          `;
        }
        break;
      case "ADMIN":
        if (isEnterprise && marketCenterIds && marketCenterIds.length > 0) {
          reviewsFound = await db.queryAll<ReviewRow>`
            SELECT
              tr.id,
              tr.ticket_id,
              t.title as ticket_title,
              surveyor.name as surveyor_name,
              assignee.name as assignee_name,
              mc.name as market_center_name,
              tr.overall_rating,
              tr.assignee_rating,
              tr.market_center_rating,
              tr.comment,
              tr.updated_at
            FROM ticket_ratings tr
            JOIN tickets t ON tr.ticket_id = t.id
            LEFT JOIN users surveyor ON tr.surveyor_id = surveyor.id
            LEFT JOIN users assignee ON tr.assignee_id = assignee.id
            LEFT JOIN market_centers mc ON tr.market_center_id = mc.id
            WHERE tr.completed = true
            AND tr.market_center_id = ANY(${marketCenterIds})
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR tr.assignee_id = ANY(${assigneeIds}))
            AND (${dateFrom}::timestamp IS NULL OR tr.updated_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR tr.updated_at <= ${dateTo})
            ORDER BY tr.updated_at DESC
          `;
        } else if (userContext?.marketCenterId) {
          reviewsFound = await db.queryAll<ReviewRow>`
            SELECT
              tr.id,
              tr.ticket_id,
              t.title as ticket_title,
              surveyor.name as surveyor_name,
              assignee.name as assignee_name,
              mc.name as market_center_name,
              tr.overall_rating,
              tr.assignee_rating,
              tr.market_center_rating,
              tr.comment,
              tr.updated_at
            FROM ticket_ratings tr
            JOIN tickets t ON tr.ticket_id = t.id
            LEFT JOIN users surveyor ON tr.surveyor_id = surveyor.id
            LEFT JOIN users assignee ON tr.assignee_id = assignee.id
            LEFT JOIN market_centers mc ON tr.market_center_id = mc.id
            WHERE tr.completed = true
            AND tr.market_center_id = ${userContext.marketCenterId}
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${assigneeIds}::text[] IS NULL OR tr.assignee_id = ANY(${assigneeIds}))
            AND (${dateFrom}::timestamp IS NULL OR tr.updated_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR tr.updated_at <= ${dateTo})
            ORDER BY tr.updated_at DESC
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          reviewsFound = await db.queryAll<ReviewRow>`
            SELECT
              tr.id,
              tr.ticket_id,
              t.title as ticket_title,
              surveyor.name as surveyor_name,
              assignee.name as assignee_name,
              mc.name as market_center_name,
              tr.overall_rating,
              tr.assignee_rating,
              tr.market_center_rating,
              tr.comment,
              tr.updated_at
            FROM ticket_ratings tr
            JOIN tickets t ON tr.ticket_id = t.id
            LEFT JOIN users surveyor ON tr.surveyor_id = surveyor.id
            LEFT JOIN users assignee ON tr.assignee_id = assignee.id
            LEFT JOIN market_centers mc ON tr.market_center_id = mc.id
            WHERE tr.completed = true
            AND tr.assignee_id = ${userContext.userId}
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR tr.updated_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR tr.updated_at <= ${dateTo})
            ORDER BY tr.updated_at DESC
          `;
        }

        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to view ticket reviews"
        );
    }

    // Calculate averages
    let totalOverall = 0;
    let countOverall = 0;
    let totalAssignee = 0;
    let countAssignee = 0;
    let totalMarketCenter = 0;
    let countMarketCenter = 0;

    const validRows = (reviewsFound ?? []).filter(
      (row): row is ReviewRow => !!row?.id
    );
    if (!validRows || !validRows.length) {
      return {
        reviews: [],
        totalReviews: 0,
        averageOverallRating: null,
        averageAssigneeRating: null,
        averageMarketCenterRating: null,
      };
    }

    const reviews: TicketReview[] = validRows.map((row) => {
      if (!row || !row.id) {
        return {} as TicketReview;
      }

      const overallRating =
        row?.overall_rating && row.overall_rating !== null
          ? parseFloat(row.overall_rating)
          : null;
      const assigneeRating =
        row?.assignee_rating && row.assignee_rating !== null
          ? parseFloat(row.assignee_rating)
          : null;
      const marketCenterRating =
        row?.market_center_rating && row.market_center_rating !== null
          ? parseFloat(row.market_center_rating)
          : null;

      if (overallRating) {
        totalOverall += overallRating;
        countOverall++;
      }
      if (assigneeRating) {
        totalAssignee += assigneeRating;
        countAssignee++;
      }
      if (marketCenterRating) {
        totalMarketCenter += marketCenterRating;
        countMarketCenter++;
      }

      return {
        id: row?.id,
        ticketId: row?.ticket_id,
        ticketTitle: row?.ticket_title ?? "Ticket",
        surveyorName: row?.surveyor_name ?? "Surveyor",
        assigneeName: row?.assignee_name ?? "Assignee",
        marketCenterName: row?.market_center_name ?? "Market Center",
        overallRating,
        assigneeRating,
        marketCenterRating,
        comment: row.comment,
        completedAt: fromTimestamp(row.updated_at)?.toISOString() ?? "",
      };
    });

    return {
      reviews,
      totalReviews: reviews.length,
      averageOverallRating:
        countOverall > 0
          ? Math.round((totalOverall / countOverall) * 100) / 100
          : null,
      averageAssigneeRating:
        countAssignee > 0
          ? Math.round((totalAssignee / countAssignee) * 100) / 100
          : null,
      averageMarketCenterRating:
        countMarketCenter > 0
          ? Math.round((totalMarketCenter / countMarketCenter) * 100) / 100
          : null,
    };
  }
);
