import { api } from "encore.dev/api";
import { prisma, ready } from "../ticket/db";
import type { DashboardMetrics, TicketStatus, Urgency } from "../ticket/types";

export interface GetMetricsResponse {
  metrics: DashboardMetrics;
}

export const getMetrics = api<void, GetMetricsResponse>(
  { expose: true, method: "GET", path: "/dashboard/metrics" },
  async () => {
    await ready; // ensure Prisma schema applied in preview

    const totalTickets = await prisma.ticket.count();

    const openTickets = await prisma.ticket.count({
      where: {
        status: { not: "RESOLVED" },
      },
    });

    const overdueTickets = await prisma.ticket.count({
      where: {
        dueDate: { lt: new Date() },
        status: { not: "RESOLVED" },
      },
    });

    const statusCounts = await prisma.ticket.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const ticketsByStatus: Record<TicketStatus, number> = {
      ASSIGNED: 0,
      AWAITING_RESPONSE: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };

    statusCounts.forEach((item) => {
      ticketsByStatus[item.status] = item._count.status;
    });

    // Get tickets by urgency
    const urgencyCounts = await prisma.ticket.groupBy({
      by: ["urgency"],
      _count: { urgency: true },
    });

    const ticketsByUrgency: Record<Urgency, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    urgencyCounts.forEach((item) => {
      ticketsByUrgency[item.urgency] = item._count.urgency;
    });

    const metrics: DashboardMetrics = {
      totalTickets,
      openTickets,
      overdueTickets,
      avgResponseTime: 2.5, //TODO: Mock value - would calculate from actual response times
      ticketsByStatus,
      ticketsByUrgency,
    };

    return { metrics };
  }
);
