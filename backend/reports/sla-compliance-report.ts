import { api, APIError, Query } from "encore.dev/api";
import { db } from "../ticket/db";
import type { TicketStatus } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { getAccessibleMarketCenterIds } from "../auth/permissions";
import { slaRepository } from "../shared/repositories";

export interface SLARequest {
  marketCenterIds?: Query<string[]>;
  status?: Query<TicketStatus[]>;
  categoryIds?: Query<string[]>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

export interface SLAResponse {
  response: {
    compliant: number;
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
  resolve: {
    compliant: number;
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
}

interface SLAResponseMetricRow {
  response_compliant: number;
  response_on_track: number;
  response_at_risk: number;
  response_breached: number;
}

interface SLAResolutionMetricRow {
  resolve_compliant: number;
  resolve_on_track: number;
  resolve_at_risk: number;
  resolve_breached: number;
}

export const slaCompliance = api<SLARequest, SLAResponse>(
  {
    expose: true,
    method: "GET",
    path: "/reports/sla-compliance",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (!userContext?.role || userContext.role === "AGENT") {
      throw APIError.permissionDenied(
        "User not permitted to generate SLA compliance reports"
      );
    }
    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);
    if (!accessibleMarketCenterIds.length) {
      throw APIError.internal("No accessible market centers found");
    }
    const policies = await slaRepository.findActivePolicies();
    if (!policies || !policies.length) {
      throw APIError.internal("No active SLA policies found");
    }

    // Convert arrays to filter params (null if empty)
    const categoryIds =
      req.categoryIds && req.categoryIds.length > 0 ? req.categoryIds : null;
    const statusList = req.status && req.status.length > 0 ? req.status : null;

    let marketCenterIds: string[] = [];

    if (
      userContext.role === "ADMIN" &&
      req.marketCenterIds &&
      req.marketCenterIds.length > 0
    ) {
      const filteredMCIds = req.marketCenterIds.filter((id) =>
        accessibleMarketCenterIds.includes(id)
      );
      marketCenterIds = filteredMCIds;
    } else if (userContext.role === "ADMIN") {
      marketCenterIds = accessibleMarketCenterIds;
    }
    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId
    ) {
      marketCenterIds = [userContext?.marketCenterId];
    }

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

    let responseSlaMetrics: SLAResponseMetricRow[] | null = null;
    let resolutionSlaMetrics: SLAResolutionMetricRow[] | null = null;

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          responseSlaMetrics = await db.queryAll<SLAResponseMetricRow>`
            SELECT
              COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as response_compliant,
              COUNT(CASE WHEN first_response_at IS NULL AND sla_breached = false THEN 1 END)::int as response_on_track,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
          `;
          resolutionSlaMetrics = await db.queryAll<SLAResolutionMetricRow>`
            SELECT
              COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as resolve_compliant,
              COUNT(CASE WHEN resolved_at IS NULL AND sla_resolution_breached = false THEN 1 END)::int as resolve_on_track,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
          `;
        } else {
          responseSlaMetrics = await db.queryAll<SLAResponseMetricRow>`
            SELECT
              COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as response_compliant,
              COUNT(CASE WHEN first_response_at IS NULL AND sla_breached = false THEN 1 END)::int as response_on_track,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
          `;
          resolutionSlaMetrics = await db.queryAll<SLAResolutionMetricRow>`
            SELECT
              COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as resolve_compliant,
              COUNT(CASE WHEN resolved_at IS NULL AND sla_resolution_breached = false THEN 1 END)::int as resolve_on_track,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ${userContext.marketCenterId}
              OR creator.market_center_id = ${userContext.marketCenterId}
              OR assignee.market_center_id = ${userContext.marketCenterId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
          `;
        }
        break;
      case "ADMIN":
        if (marketCenterIds && marketCenterIds.length > 0) {
          responseSlaMetrics = await db.queryAll<SLAResponseMetricRow>`
            SELECT
              COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as response_compliant,
              COUNT(CASE WHEN first_response_at IS NULL AND sla_breached = false THEN 1 END)::int as response_on_track,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ANY(${marketCenterIds})
              OR creator.market_center_id = ANY(${marketCenterIds})
              OR assignee.market_center_id = ANY(${marketCenterIds})
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
          `;
          resolutionSlaMetrics = await db.queryAll<SLAResolutionMetricRow>`
            SELECT
              COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as resolve_compliant,
              COUNT(CASE WHEN resolved_at IS NULL AND sla_resolution_breached = false THEN 1 END)::int as resolve_on_track,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN users creator ON t.creator_id = creator.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE (
              tc.market_center_id = ANY(${marketCenterIds})
              OR creator.market_center_id = ANY(${marketCenterIds})
              OR assignee.market_center_id = ANY(${marketCenterIds})
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
          `;
        } else {
          // No subscription or inactive subscription - limit to own tickets
          responseSlaMetrics = await db.queryAll<SLAResponseMetricRow>`
            SELECT
              COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as response_compliant,
              COUNT(CASE WHEN first_response_at IS NULL AND sla_breached = false THEN 1 END)::int as response_on_track,
              COUNT(CASE WHEN sla_breached = false AND (first_response_at IS NULL OR first_response_at > sla_response_due_at) THEN 1 END)::int as response_at_risk,
              COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as response_breached
            FROM tickets t
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_response_due_at IS NOT NULL
          `;
          resolutionSlaMetrics = await db.queryAll<SLAResolutionMetricRow>`
            SELECT
              COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as resolve_compliant,
              COUNT(CASE WHEN resolved_at IS NULL AND sla_resolution_breached = false THEN 1 END)::int as resolve_on_track,
              COUNT(CASE WHEN sla_resolution_breached = false AND (resolved_at IS NULL OR resolved_at > sla_resolution_due_at) THEN 1 END)::int as resolve_at_risk,
              COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as resolve_breached
            FROM tickets t1
            WHERE (
              t.assignee_id = ${userContext.userId}
              OR t.creator_id = ${userContext.userId}
              OR t.assignee_id IS NULL
            )
            AND (${statusList}::text[] IS NULL OR t.status = ANY(${statusList}))
            AND (${categoryIds}::text[] IS NULL OR t.category_id = ANY(${categoryIds}))
            AND (${dateFrom}::timestamp IS NULL OR t.created_at >= ${dateFrom})
            AND (${dateTo}::timestamp IS NULL OR t.created_at <= ${dateTo})
            AND sla_resolution_due_at IS NOT NULL
          `;
        }
        break;
      default:
        throw APIError.permissionDenied(
          "User not permitted to generate ticket reports"
        );
    }

    const report = {
      response: {
        compliant: Number(responseSlaMetrics?.[0]?.response_compliant ?? 0),
        onTrack: Number(responseSlaMetrics?.[0]?.response_on_track ?? 0),
        atRisk: Number(responseSlaMetrics?.[0]?.response_at_risk ?? 0),
        overdue: Number(responseSlaMetrics?.[0]?.response_breached ?? 0),
      },
      resolve: {
        compliant: Number(resolutionSlaMetrics?.[0]?.resolve_compliant ?? 0),
        onTrack: Number(resolutionSlaMetrics?.[0]?.resolve_on_track ?? 0),
        atRisk: Number(resolutionSlaMetrics?.[0]?.resolve_at_risk ?? 0),
        overdue: Number(resolutionSlaMetrics?.[0]?.resolve_breached ?? 0),
      },
    };
    console.log("SLA Compliance Report generated:", report);

    return report;
  }
);
