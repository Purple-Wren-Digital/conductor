/**
 * SLA Reports API
 */

import { api, APIError, Query } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { slaRepository } from "../shared/repositories";
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

    const [metrics, byUrgency, byAssignee, trends] = await Promise.all([
      slaRepository.getSlaMetrics({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByUrgency({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByAssignee({ dateFrom, dateTo }),
      slaRepository.getSlaTrends({
        dateFrom,
        dateTo,
        groupBy: groupBy as "day" | "week" | "month",
      }),
    ]);

    return {
      metrics,
      byUrgency,
      byAssignee,
      trends,
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

    // Only ADMIN can export SLA reports
    if (userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "You do not have permission to export SLA reports"
      );
    }

    const dateFrom = req.dateFrom
      ? new Date(req.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = req.dateTo ? new Date(req.dateTo) : new Date();

    const [metrics, byUrgency, byAssignee] = await Promise.all([
      slaRepository.getSlaMetrics({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByUrgency({ dateFrom, dateTo }),
      slaRepository.getSlaMetricsByAssignee({ dateFrom, dateTo }),
    ]);

    // Build CSV content
    const lines: string[] = [];

    // Summary section
    lines.push("SLA Report Summary");
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

    // By Urgency section
    lines.push("By Urgency");
    lines.push("Urgency,Total,Met,Breached,Compliance Rate");
    for (const u of byUrgency) {
      lines.push(
        `${u.urgency},${u.totalTickets},${u.ticketsMet},${u.ticketsBreached},${u.complianceRate}%`
      );
    }
    lines.push("");

    // By Assignee section
    lines.push("By Assignee");
    lines.push(
      "Assignee,Total,Met,Breached,Compliance Rate,Avg Response (min)"
    );
    for (const a of byAssignee) {
      lines.push(
        `${a.assigneeName || "Unassigned"},${a.totalTickets},${a.ticketsMet},${a.ticketsBreached},${a.complianceRate}%,${a.avgResponseTimeMinutes ?? "N/A"}`
      );
    }

    const csv = lines.join("\n");
    const filename = `sla-report-${dateFrom.toISOString().split("T")[0]}-${dateTo.toISOString().split("T")[0]}.csv`;

    return { csv, filename };
  }
);
