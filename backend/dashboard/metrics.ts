import { api } from "encore.dev/api";
import { db } from "../ticket/db";
import type { DashboardMetrics, TicketStatus, Urgency } from "../ticket/types";

export interface GetMetricsResponse {
  metrics: DashboardMetrics;
}

export const getMetrics = api<void, GetMetricsResponse>(
  { expose: true, method: "GET", path: "/dashboard/metrics" },
  async () => {
    const totalTicketsResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM tickets
    `;
    const totalTickets = totalTicketsResult?.count ?? 0;

    const openTicketsResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count
      FROM tickets
      WHERE status != 'RESOLVED'
    `;
    const openTickets = openTicketsResult?.count ?? 0;

    const overdueTicketsResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count
      FROM tickets
      WHERE due_date < NOW()
        AND status != 'RESOLVED'
    `;
    const overdueTickets = overdueTicketsResult?.count ?? 0;

    const statusCountsRows = await db.queryAll<{ status: TicketStatus; count: number }>`
      SELECT status, COUNT(*)::int as count
      FROM tickets
      GROUP BY status
    `;

    const ticketsByStatus: Record<TicketStatus, number> = {
      DRAFT: 0,
      CREATED: 0,
      ASSIGNED: 0,
      UNASSIGNED: 0,
      AWAITING_RESPONSE: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };

    statusCountsRows.forEach((row) => {
      if (row.status !== null) {
        ticketsByStatus[row.status] = row.count;
      }
    });

    const urgencyCountsRows = await db.queryAll<{ urgency: Urgency; count: number }>`
      SELECT urgency, COUNT(*)::int as count
      FROM tickets
      WHERE status != 'RESOLVED'
      GROUP BY urgency
    `;

    const ticketsByUrgency: Record<Urgency, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    urgencyCountsRows.forEach((row) => {
      ticketsByUrgency[row.urgency] = row.count;
    });

    const metrics: DashboardMetrics = {
      totalTickets,
      openTickets,
      overdueTickets,
      avgResponseTime: 2.5,
      ticketsByStatus,
      ticketsByUrgency,
    };

    return { metrics };
  }
);
