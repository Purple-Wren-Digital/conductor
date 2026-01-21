/**
 * SLA Reports API
 */

import { api, APIError, Query } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { slaRepository, subscriptionRepository } from "../shared/repositories";
import type { SlaReportRequest, SlaReportResponse, SlaMetrics } from "./types";

interface GetMetricsRequest {
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  assigneeId?: Query<string>;
  categoryId?: Query<string>;
}

interface GetMetricsResponse {
  metrics: SlaMetrics;
}

/**
 * Get SLA metrics summary
 */
export const getMetrics = api<GetMetricsRequest, GetMetricsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/sla/metrics",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );
    if (!accessibleMarketCenterIds || !accessibleMarketCenterIds.length) {
      return {
        metrics: {
          totalTickets: 0,
          ticketsWithSla: 0,
          ticketsMet: 0,
          ticketsBreached: 0,
          complianceRate: 0,
          avgResponseTimeMinutes: null,
        },
      };
    }

    // Only ADMIN and STAFF_LEADER can view SLA metrics
    if (userContext.role !== "ADMIN" && userContext.role !== "STAFF_LEADER") {
      throw APIError.permissionDenied(
        "You do not have permission to view SLA metrics"
      );
    }

    const metrics = await slaRepository.getSlaMetrics({
      dateFrom: req.dateFrom ? new Date(req.dateFrom) : undefined,
      dateTo: req.dateTo ? new Date(req.dateTo) : undefined,
      assigneeId: req.assigneeId,
      categoryId: req.categoryId,
    });

    return { metrics };
  }
);

interface GetReportRequest {
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  groupBy?: Query<"day" | "week" | "month">;
}

/**
 * Get full SLA report with breakdown by urgency, assignee, and trends
 */
export const getReport = api<GetReportRequest, SlaReportResponse>(
  {
    expose: true,
    method: "GET",
    path: "/sla/reports",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );
    if (!accessibleMarketCenterIds || !accessibleMarketCenterIds.length) {
      return {
        metrics: {
          totalTickets: 0,
          ticketsWithSla: 0,
          ticketsMet: 0,
          ticketsBreached: 0,
          complianceRate: 0,
          avgResponseTimeMinutes: null,
        },
        byUrgency: [],
        byAssignee: [],
        trends: [],
        resolutionMetrics: {
          totalTickets: 0,
          ticketsWithSla: 0,
          ticketsMet: 0,
          ticketsBreached: 0,
          complianceRate: 0,
          avgResolutionTimeMinutes: null,
        },
        resolutionByUrgency: [],
        resolutionTrends: [],
      };
    }

    // Only ADMIN can view full SLA reports
    if (userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "You do not have permission to view SLA reports"
      );
    }

    const dateFrom = req.dateFrom
      ? new Date(req.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const dateTo = req.dateTo ? new Date(req.dateTo) : new Date();
    const groupBy = req.groupBy || "day";

    const [
      metrics,
      byUrgency,
      byAssignee,
      trends,
      resolutionMetrics,
      resolutionByUrgency,
      resolutionTrends,
    ] = await Promise.all([
      // Response SLA
      slaRepository.getSlaMetrics({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByUrgency({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByAssignee({ dateFrom, dateTo }),
      slaRepository.getSlaTrends({
        dateFrom,
        dateTo,
        groupBy: groupBy as "day" | "week" | "month",
      }),
      // Resolution SLA
      slaRepository.getResolutionSlaMetrics({ dateFrom, dateTo }),
      slaRepository.getResolutionSlaMetricsByUrgency({ dateFrom, dateTo }),
      slaRepository.getResolutionSlaTrends({
        dateFrom,
        dateTo,
        groupBy: groupBy as "day" | "week" | "month",
      }),
    ]);

    return {
      // Response SLA
      metrics,
      byUrgency,
      byAssignee,
      trends,
      // Resolution SLA
      resolutionMetrics,
      resolutionByUrgency,
      resolutionTrends,
    };
  }
);

interface ExportReportRequest {
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

interface ExportReportResponse {
  csv: string;
  filename: string;
}

/**
 * Export SLA report as CSV
 */
export const exportReport = api<ExportReportRequest, ExportReportResponse>(
  {
    expose: true,
    method: "GET",
    path: "/sla/reports/export",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );

    // Only ADMIN can export SLA reports
    if (
      userContext.role !== "ADMIN" ||
      !accessibleMarketCenterIds ||
      !accessibleMarketCenterIds.length
    ) {
      throw APIError.permissionDenied(
        "You do not have permission to export SLA reports"
      );
    }

    const dateFrom = req.dateFrom
      ? new Date(req.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = req.dateTo ? new Date(req.dateTo) : new Date();

    const [
      metrics,
      byUrgency,
      byAssignee,
      resolutionMetrics,
      resolutionByUrgency,
    ] = await Promise.all([
      slaRepository.getSlaMetrics({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByUrgency({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByAssignee({ dateFrom, dateTo }),
      slaRepository.getResolutionSlaMetrics({ dateFrom, dateTo }),
      slaRepository.getResolutionSlaMetricsByUrgency({ dateFrom, dateTo }),
    ]);

    // Build CSV content
    const lines: string[] = [];

    // Response SLA Summary section
    lines.push("RESPONSE SLA Report Summary");
    lines.push(
      `Date Range,${dateFrom.toISOString().split("T")[0]},${dateTo.toISOString().split("T")[0]}`
    );
    lines.push("");
    lines.push("Metric,Value");
    lines.push(`Total Tickets,${metrics.totalTickets}`);
    lines.push(`Tickets with SLA,${metrics.ticketsWithSla}`);
    lines.push(`SLA Met,${metrics.ticketsMet}`);
    lines.push(`SLA Breached,${metrics.ticketsBreached}`);
    lines.push(`Compliance Rate,${metrics.complianceRate}%`);
    lines.push(
      `Avg Response Time (min),${metrics.avgResponseTimeMinutes ?? "N/A"}`
    );
    lines.push("");

    // Response SLA By Urgency section
    lines.push("Response SLA By Urgency");
    lines.push("Urgency,Total,Met,Breached,Compliance Rate");
    for (const u of byUrgency) {
      lines.push(
        `${u.urgency},${u.totalTickets},${u.ticketsMet},${u.ticketsBreached},${u.complianceRate}%`
      );
    }
    lines.push("");

    // Response SLA By Assignee section
    lines.push("Response SLA By Assignee");
    lines.push(
      "Assignee,Total,Met,Breached,Compliance Rate,Avg Response (min)"
    );
    for (const a of byAssignee) {
      lines.push(
        `${a.assigneeName || "Unassigned"},${a.totalTickets},${a.ticketsMet},${a.ticketsBreached},${a.complianceRate}%,${a.avgResponseTimeMinutes ?? "N/A"}`
      );
    }
    lines.push("");

    // Resolution SLA Summary section
    lines.push("RESOLUTION SLA Report Summary");
    lines.push("");
    lines.push("Metric,Value");
    lines.push(`Total Tickets,${resolutionMetrics.totalTickets}`);
    lines.push(`Tickets with SLA,${resolutionMetrics.ticketsWithSla}`);
    lines.push(`SLA Met,${resolutionMetrics.ticketsMet}`);
    lines.push(`SLA Breached,${resolutionMetrics.ticketsBreached}`);
    lines.push(`Compliance Rate,${resolutionMetrics.complianceRate}%`);
    lines.push(
      `Avg Resolution Time (min),${resolutionMetrics.avgResolutionTimeMinutes ?? "N/A"}`
    );
    lines.push("");

    // Resolution SLA By Urgency section
    lines.push("Resolution SLA By Urgency");
    lines.push("Urgency,Total,Met,Breached,Compliance Rate");
    for (const u of resolutionByUrgency) {
      lines.push(
        `${u.urgency},${u.totalTickets},${u.ticketsMet},${u.ticketsBreached},${u.complianceRate}%`
      );
    }

    const csv = lines.join("\n");
    const filename = `sla-report-${dateFrom.toISOString().split("T")[0]}-${dateTo.toISOString().split("T")[0]}.csv`;

    return { csv, filename };
  }
);
