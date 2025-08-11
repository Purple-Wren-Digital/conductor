import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { DashboardMetrics, TicketStatus, Urgency } from "../ticket/types";

export interface GetMetricsResponse {
  metrics: DashboardMetrics;
}

// Retrieves dashboard metrics.
export const getMetrics = api<void, GetMetricsResponse>(
  { expose: true, method: "GET", path: "/dashboard/metrics" },
  async () => {
    // Get total tickets
    const totalTickets = await prisma.ticket.count();

    // Get open tickets
    const openTickets = await prisma.ticket.count({
      where: {
        status: { not: 'RESOLVED' },
      },
    });

    // Get overdue tickets
    const overdueTickets = await prisma.ticket.count({
      where: {
        dueDate: { lt: new Date() },
        status: { not: 'RESOLVED' },
      },
    });

    // Get tickets by status
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    
    const ticketsByStatus: Record<TicketStatus, number> = {
      ASSIGNED: 0,
      AWAITING_RESPONSE: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };
    
    statusCounts.forEach(item => {
      ticketsByStatus[item.status] = item._count.status;
    });

    // Get tickets by urgency
    const urgencyCounts = await prisma.ticket.groupBy({
      by: ['urgency'],
      _count: { urgency: true },
    });
    
    const ticketsByUrgency: Record<Urgency, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    
    urgencyCounts.forEach(item => {
      ticketsByUrgency[item.urgency] = item._count.urgency;
    });

    const metrics: DashboardMetrics = {
      totalTickets,
      openTickets,
      overdueTickets,
      avgResponseTime: 2.5, // Mock value - would calculate from actual response times
      ticketsByStatus,
      ticketsByUrgency,
    };

    return { metrics };
  }
);
