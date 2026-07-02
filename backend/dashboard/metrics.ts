import { api } from "encore.dev/api";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { getAccessibleMarketCenterIds } from "../auth/permissions";
import type { TicketStatus, Urgency } from "../ticket/types";

export interface GetMetricsRequest {
  marketCenterId?: string;
}

export interface DashboardMetricsResponse {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  highPriorityOpen: number;
  unassignedOpen: number;
  createdLast7Days: number;
  resolvedLast7Days: number;
  avgResponseTime: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<Urgency, number>;
}

export interface GetMetricsResponse {
  metrics: DashboardMetricsResponse;
}

function buildScopeWhere(
  userContext: { role: string; userId: string; marketCenterId: string | null; isSuperuser: boolean },
  marketCenterIds: string[],
  startParamIndex: number
): { sql: string; values: any[]; nextParamIndex: number } {
  let paramIndex = startParamIndex;
  const values: any[] = [];

  if (userContext.isSuperuser) {
    return { sql: "TRUE", values, nextParamIndex: paramIndex };
  }

  if (userContext.role === "ADMIN") {
    if (!marketCenterIds.length) {
      return { sql: "FALSE", values, nextParamIndex: paramIndex };
    }
    const ph1 = marketCenterIds.map(() => `$${paramIndex++}`).join(", ");
    const ph2 = marketCenterIds.map(() => `$${paramIndex++}`).join(", ");
    const ph3 = marketCenterIds.map(() => `$${paramIndex++}`).join(", ");
    values.push(...marketCenterIds, ...marketCenterIds, ...marketCenterIds);
    return {
      sql: `(c.market_center_id IN (${ph1}) OR cr.market_center_id IN (${ph2}) OR asg.market_center_id IN (${ph3}))`,
      values,
      nextParamIndex: paramIndex,
    };
  }

  if (userContext.role === "STAFF_LEADER") {
    if (!userContext.marketCenterId) {
      return { sql: "FALSE", values, nextParamIndex: paramIndex };
    }
    const mcParam = `$${paramIndex++}`;
    values.push(userContext.marketCenterId);
    return {
      sql: `(c.market_center_id = ${mcParam} OR cr.market_center_id = ${mcParam} OR asg.market_center_id = ${mcParam})`,
      values,
      nextParamIndex: paramIndex,
    };
  }

  if (userContext.role === "STAFF") {
    const uidParam = `$${paramIndex++}`;
    values.push(userContext.userId);
    return {
      sql: `(t.assignee_id = ${uidParam} OR (t.assignee_id IS NULL AND t.creator_id = ${uidParam}))`,
      values,
      nextParamIndex: paramIndex,
    };
  }

  // AGENT: matches getTicketScopeFilter agent branch
  const uidParam = `$${paramIndex++}`;
  values.push(userContext.userId);
  return {
    sql: `t.creator_id = ${uidParam}`,
    values,
    nextParamIndex: paramIndex,
  };
}

export const getMetrics = api<GetMetricsRequest, GetMetricsResponse>(
  { expose: true, method: "GET", path: "/dashboard/metrics", auth: true },
  async (req) => {
    const userContext = await getUserContext();

    const accessibleMcIds = await getAccessibleMarketCenterIds(userContext);
    const marketCenterIds =
      userContext.role === "ADMIN" && req.marketCenterId
        ? accessibleMcIds.includes(req.marketCenterId)
          ? [req.marketCenterId]
          : []
        : accessibleMcIds;

    const scope = buildScopeWhere(userContext, marketCenterIds, 1);

    const scopedCte = `
      WITH scoped AS (
        SELECT t.*
        FROM tickets t
        LEFT JOIN ticket_categories c ON t.category_id = c.id
        LEFT JOIN users cr ON t.creator_id = cr.id
        LEFT JOIN users asg ON t.assignee_id = asg.id
        WHERE ${scope.sql}
      )
    `;

    const row = await db.rawQueryRow<{
      total_tickets: number;
      open_tickets: number;
      overdue_tickets: number;
      high_priority_open: number;
      unassigned_open: number;
      created_last_7_days: number;
      resolved_last_7_days: number;
    }>(
      `${scopedCte}
       SELECT
         COUNT(*)::int AS total_tickets,
         COUNT(*) FILTER (WHERE status != 'RESOLVED')::int AS open_tickets,
         COUNT(*) FILTER (WHERE status != 'RESOLVED' AND due_date IS NOT NULL AND due_date < NOW())::int AS overdue_tickets,
         COUNT(*) FILTER (WHERE status != 'RESOLVED' AND urgency = 'HIGH')::int AS high_priority_open,
         COUNT(*) FILTER (WHERE status != 'RESOLVED' AND (status = 'UNASSIGNED' OR (status = 'CREATED' AND assignee_id IS NULL)))::int AS unassigned_open,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS created_last_7_days,
         COUNT(*) FILTER (WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL AND resolved_at >= NOW() - INTERVAL '7 days')::int AS resolved_last_7_days
       FROM scoped`,
      ...scope.values
    );

    const statusRows = await db.rawQueryAll<{ status: TicketStatus; count: number }>(
      `${scopedCte}
       SELECT
         CASE
           WHEN status = 'CREATED' AND assignee_id IS NOT NULL THEN 'ASSIGNED'
           WHEN status = 'CREATED' AND assignee_id IS NULL THEN 'UNASSIGNED'
           ELSE status::text
         END AS status,
         COUNT(*)::int AS count
       FROM scoped
       GROUP BY 1`,
      ...scope.values
    );

    const urgencyRows = await db.rawQueryAll<{ urgency: Urgency; count: number }>(
      `${scopedCte}
       SELECT urgency::text AS urgency, COUNT(*)::int AS count
       FROM scoped
       WHERE status != 'RESOLVED'
       GROUP BY urgency`,
      ...scope.values
    );

    const ticketsByStatus: Record<TicketStatus, number> = {
      DRAFT: 0,
      CREATED: 0,
      ASSIGNED: 0,
      UNASSIGNED: 0,
      AWAITING_RESPONSE: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };
    statusRows.forEach((r) => {
      if (r.status) ticketsByStatus[r.status] = r.count;
    });

    const ticketsByUrgency: Record<Urgency, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    urgencyRows.forEach((r) => {
      if (r.urgency) ticketsByUrgency[r.urgency] = r.count;
    });

    return {
      metrics: {
        totalTickets: row?.total_tickets ?? 0,
        openTickets: row?.open_tickets ?? 0,
        overdueTickets: row?.overdue_tickets ?? 0,
        highPriorityOpen: row?.high_priority_open ?? 0,
        unassignedOpen: row?.unassigned_open ?? 0,
        createdLast7Days: row?.created_last_7_days ?? 0,
        resolvedLast7Days: row?.resolved_last_7_days ?? 0,
        avgResponseTime: 2.5,
        ticketsByStatus,
        ticketsByUrgency,
      },
    };
  }
);
