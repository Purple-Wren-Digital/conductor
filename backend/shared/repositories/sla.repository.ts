/**
 * SLA Repository - Raw SQL queries for SLA operations
 */

import { db, fromTimestamp } from "../../ticket/db";
import type {
  SlaPolicy,
  SlaEvent,
  SlaEventType,
  Urgency,
  Ticket,
} from "../../ticket/types";

// Database row types (snake_case from PostgreSQL)
interface SlaPolicyRow {
  id: string;
  urgency: Urgency;
  response_time_minutes: number;
  resolution_time_minutes: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface SlaEventRow {
  id: string;
  ticket_id: string;
  event_type: SlaEventType;
  notification_sent: boolean;
  created_at: Date;
}

interface TicketSlaRow {
  id: string;
  title: string | null;
  urgency: Urgency;
  status: string;
  creator_id: string;
  assignee_id: string | null;
  // Response SLA fields
  sla_response_due_at: Date | null;
  first_response_at: Date | null;
  sla_breached: boolean;
  sla_warning_50_sent: boolean;
  sla_warning_75_sent: boolean;
  // Resolution SLA fields
  sla_resolution_due_at: Date | null;
  resolved_at: Date | null;
  sla_resolution_breached: boolean;
  sla_resolution_warning_50_sent: boolean;
  sla_resolution_warning_75_sent: boolean;
  created_at: Date;
}

function rowToSlaPolicy(row: SlaPolicyRow): SlaPolicy {
  return {
    id: row.id,
    urgency: row.urgency,
    responseTimeMinutes: row.response_time_minutes,
    resolutionTimeMinutes: row.resolution_time_minutes,
    isActive: row.is_active,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

function rowToSlaEvent(row: SlaEventRow): SlaEvent {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    eventType: row.event_type,
    notificationSent: row.notification_sent,
    createdAt: fromTimestamp(row.created_at)!,
  };
}

export const slaRepository = {
  // ==================
  // SLA Policies
  // ==================

  async findAllPolicies(): Promise<SlaPolicy[]> {
    const rows = await db.query<SlaPolicyRow>`
      SELECT * FROM sla_policies ORDER BY urgency
    `;
    const allRows: SlaPolicyRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }

    return allRows.map(rowToSlaPolicy);
  },

  async findActivePolicies(): Promise<SlaPolicy[]> {
    const rows = await db.query<SlaPolicyRow>`
      SELECT * FROM sla_policies WHERE is_active = true ORDER BY urgency
    `;
    const allRows: SlaPolicyRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows.map(rowToSlaPolicy);
  },

  async findPolicyByUrgency(urgency: Urgency): Promise<SlaPolicy | null> {
    const row = await db.queryRow<SlaPolicyRow>`
      SELECT * FROM sla_policies WHERE urgency = ${urgency} AND is_active = true
    `;
    return row ? rowToSlaPolicy(row) : null;
  },

  async findPolicyById(id: string): Promise<SlaPolicy | null> {
    const row = await db.queryRow<SlaPolicyRow>`
      SELECT * FROM sla_policies WHERE id = ${id}
    `;
    return row ? rowToSlaPolicy(row) : null;
  },

  async updatePolicy(
    id: string,
    data: {
      responseTimeMinutes?: number;
      resolutionTimeMinutes?: number;
      isActive?: boolean;
    }
  ): Promise<SlaPolicy | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.responseTimeMinutes !== undefined) {
      updates.push(`response_time_minutes = $${paramIndex++}`);
      values.push(data.responseTimeMinutes);
    }
    if (data.resolutionTimeMinutes !== undefined) {
      updates.push(`resolution_time_minutes = $${paramIndex++}`);
      values.push(data.resolutionTimeMinutes);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    values.push(id);

    const sql = `
      UPDATE sla_policies
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<SlaPolicyRow>(sql, ...values);
    return row ? rowToSlaPolicy(row) : null;
  },

  // ==================
  // SLA Events
  // ==================

  async createEvent(data: {
    ticketId: string;
    eventType: SlaEventType;
    notificationSent?: boolean;
  }): Promise<SlaEvent> {
    const row = await db.queryRow<SlaEventRow>`
      INSERT INTO sla_events (ticket_id, event_type, notification_sent)
      VALUES (${data.ticketId}, ${data.eventType}, ${data.notificationSent ?? false})
      RETURNING *
    `;
    return rowToSlaEvent(row!);
  },

  async findEventsByTicketId(ticketId: string): Promise<SlaEvent[]> {
    const rows = await db.query<SlaEventRow>`
      SELECT * FROM sla_events WHERE ticket_id = ${ticketId} ORDER BY created_at DESC
    `;
    const allRows: SlaEventRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows.map(rowToSlaEvent);
  },

  async hasEvent(ticketId: string, eventType: SlaEventType): Promise<boolean> {
    const row = await db.queryRow<{ exists: boolean }>`
      SELECT EXISTS(
        SELECT 1 FROM sla_events WHERE ticket_id = ${ticketId} AND event_type = ${eventType}
      ) as exists
    `;
    return row?.exists ?? false;
  },

  // ==================
  // Ticket SLA Operations (Response)
  // ==================

  async setTicketSlaDueDate(
    ticketId: string,
    slaDueAt: Date,
    policyId: string
  ): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_response_due_at = ${slaDueAt},
          sla_policy_id = ${policyId},
          updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async setTicketResolutionSlaDueDate(
    ticketId: string,
    slaResolutionDueAt: Date
  ): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_resolution_due_at = ${slaResolutionDueAt},
          updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async recordFirstResponse(
    ticketId: string,
    respondedAt: Date
  ): Promise<void> {
    // Only set if not already set
    await db.exec`
      UPDATE tickets
      SET first_response_at = COALESCE(first_response_at, ${respondedAt}),
          updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async markSlaBreached(ticketId: string): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_breached = true, updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async markWarning50Sent(ticketId: string): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_warning_50_sent = true, updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async markWarning75Sent(ticketId: string): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_warning_75_sent = true, updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  // ==================
  // Ticket SLA Operations (Resolution)
  // ==================

  async recordResolution(
    ticketId: string,
    resolvedAt: Date
  ): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET resolved_at = ${resolvedAt},
          updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async markResolutionSlaBreached(ticketId: string): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_resolution_breached = true, updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async markResolutionWarning50Sent(ticketId: string): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_resolution_warning_50_sent = true, updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  async markResolutionWarning75Sent(ticketId: string): Promise<void> {
    await db.exec`
      UPDATE tickets
      SET sla_resolution_warning_75_sent = true, updated_at = NOW()
      WHERE id = ${ticketId}
    `;
  },

  // ==================
  // SLA Query Operations (Response)
  // ==================

  // Find tickets needing 50% response warning
  async findTicketsNeedingWarning50(): Promise<TicketSlaRow[]> {
    const rows = await db.query<TicketSlaRow>`
      SELECT id, title, urgency, status, creator_id, assignee_id,
             sla_response_due_at, first_response_at, sla_breached,
             sla_warning_50_sent, sla_warning_75_sent,
             sla_resolution_due_at, resolved_at, sla_resolution_breached,
             sla_resolution_warning_50_sent, sla_resolution_warning_75_sent,
             created_at
      FROM tickets
      WHERE sla_response_due_at IS NOT NULL
        AND first_response_at IS NULL
        AND sla_breached = false
        AND sla_warning_50_sent = false
        AND status NOT IN ('RESOLVED', 'DRAFT')
        AND NOW() >= created_at + (sla_response_due_at - created_at) * 0.5
    `;
    const allRows: TicketSlaRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows;
  },

  // Find tickets needing 75% response warning
  async findTicketsNeedingWarning75(): Promise<TicketSlaRow[]> {
    const rows = await db.query<TicketSlaRow>`
      SELECT id, title, urgency, status, creator_id, assignee_id,
             sla_response_due_at, first_response_at, sla_breached,
             sla_warning_50_sent, sla_warning_75_sent,
             sla_resolution_due_at, resolved_at, sla_resolution_breached,
             sla_resolution_warning_50_sent, sla_resolution_warning_75_sent,
             created_at
      FROM tickets
      WHERE sla_response_due_at IS NOT NULL
        AND first_response_at IS NULL
        AND sla_breached = false
        AND sla_warning_75_sent = false
        AND status NOT IN ('RESOLVED', 'DRAFT')
        AND NOW() >= created_at + (sla_response_due_at - created_at) * 0.75
    `;
    const allRows: TicketSlaRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows;
  },

  // Find tickets that have breached response SLA
  async findTicketsBreachingSla(): Promise<TicketSlaRow[]> {
    const rows = await db.query<TicketSlaRow>`
      SELECT id, title, urgency, status, creator_id, assignee_id,
             sla_response_due_at, first_response_at, sla_breached,
             sla_warning_50_sent, sla_warning_75_sent,
             sla_resolution_due_at, resolved_at, sla_resolution_breached,
             sla_resolution_warning_50_sent, sla_resolution_warning_75_sent,
             created_at
      FROM tickets
      WHERE sla_response_due_at IS NOT NULL
        AND first_response_at IS NULL
        AND sla_breached = false
        AND status NOT IN ('RESOLVED', 'DRAFT')
        AND NOW() > sla_response_due_at
    `;

    const allRows: TicketSlaRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows;
  },

  // ==================
  // SLA Query Operations (Resolution)
  // ==================

  // Find tickets needing 50% resolution warning
  async findTicketsNeedingResolutionWarning50(): Promise<TicketSlaRow[]> {
    const rows = await db.query<TicketSlaRow>`
      SELECT id, title, urgency, status, creator_id, assignee_id,
             sla_response_due_at, first_response_at, sla_breached,
             sla_warning_50_sent, sla_warning_75_sent,
             sla_resolution_due_at, resolved_at, sla_resolution_breached,
             sla_resolution_warning_50_sent, sla_resolution_warning_75_sent,
             created_at
      FROM tickets
      WHERE sla_resolution_due_at IS NOT NULL
        AND resolved_at IS NULL
        AND sla_resolution_breached = false
        AND sla_resolution_warning_50_sent = false
        AND status NOT IN ('RESOLVED', 'DRAFT')
        AND NOW() >= created_at + (sla_resolution_due_at - created_at) * 0.5
    `;
    const allRows: TicketSlaRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows;
  },

  // Find tickets needing 75% resolution warning
  async findTicketsNeedingResolutionWarning75(): Promise<TicketSlaRow[]> {
    const rows = await db.query<TicketSlaRow>`
      SELECT id, title, urgency, status, creator_id, assignee_id,
             sla_response_due_at, first_response_at, sla_breached,
             sla_warning_50_sent, sla_warning_75_sent,
             sla_resolution_due_at, resolved_at, sla_resolution_breached,
             sla_resolution_warning_50_sent, sla_resolution_warning_75_sent,
             created_at
      FROM tickets
      WHERE sla_resolution_due_at IS NOT NULL
        AND resolved_at IS NULL
        AND sla_resolution_breached = false
        AND sla_resolution_warning_75_sent = false
        AND status NOT IN ('RESOLVED', 'DRAFT')
        AND NOW() >= created_at + (sla_resolution_due_at - created_at) * 0.75
    `;
    const allRows: TicketSlaRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows;
  },

  // Find tickets that have breached resolution SLA
  async findTicketsBreachingResolutionSla(): Promise<TicketSlaRow[]> {
    const rows = await db.query<TicketSlaRow>`
      SELECT id, title, urgency, status, creator_id, assignee_id,
             sla_response_due_at, first_response_at, sla_breached,
             sla_warning_50_sent, sla_warning_75_sent,
             sla_resolution_due_at, resolved_at, sla_resolution_breached,
             sla_resolution_warning_50_sent, sla_resolution_warning_75_sent,
             created_at
      FROM tickets
      WHERE sla_resolution_due_at IS NOT NULL
        AND resolved_at IS NULL
        AND sla_resolution_breached = false
        AND status NOT IN ('RESOLVED', 'DRAFT')
        AND NOW() > sla_resolution_due_at
    `;

    const allRows: TicketSlaRow[] = [];
    for await (const row of rows) {
      allRows.push(row);
    }
    return allRows;
  },

  // ==================
  // SLA Reports & Metrics
  // ==================

  async getSlaMetrics(options?: {
    dateFrom?: Date;
    dateTo?: Date;
    assigneeId?: string;
    categoryId?: string;
  }): Promise<{
    totalTickets: number;
    ticketsWithSla: number;
    ticketsMet: number;
    ticketsBreached: number;
    complianceRate: number;
    avgResponseTimeMinutes: number | null;
  }> {
    let conditions = ["sla_response_due_at IS NOT NULL"];
    const values: any[] = [];
    let paramIndex = 1;

    if (options?.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(options.dateFrom);
    }
    if (options?.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(options.dateTo);
    }
    if (options?.assigneeId) {
      conditions.push(`assignee_id = $${paramIndex++}`);
      values.push(options.assigneeId);
    }
    if (options?.categoryId) {
      conditions.push(`category_id = $${paramIndex++}`);
      values.push(options.categoryId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN sla_response_due_at IS NOT NULL THEN 1 END)::int as tickets_with_sla,
        COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as tickets_breached,
        AVG(
          CASE WHEN first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60
          END
        ) as avg_response_time_minutes
      FROM tickets
      ${whereClause}
    `;

    const row = await db.rawQueryRow<{
      total_tickets: number;
      tickets_with_sla: number;
      tickets_met: number;
      tickets_breached: number;
      avg_response_time_minutes: number | null;
    }>(sql, ...values);

    const ticketsWithSla = row?.tickets_with_sla ?? 0;
    const ticketsMet = row?.tickets_met ?? 0;
    const complianceRate =
      ticketsWithSla > 0 ? (ticketsMet / ticketsWithSla) * 100 : 100;

    return {
      totalTickets: row?.total_tickets ?? 0,
      ticketsWithSla,
      ticketsMet,
      ticketsBreached: row?.tickets_breached ?? 0,
      complianceRate: Math.round(complianceRate * 100) / 100,
      avgResponseTimeMinutes: row?.avg_response_time_minutes
        ? Math.round(row.avg_response_time_minutes * 100) / 100
        : null,
    };
  },

  async getSlaMetricsByUrgency(options?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<
    Array<{
      urgency: Urgency;
      totalTickets: number;
      ticketsMet: number;
      ticketsBreached: number;
      complianceRate: number;
    }>
  > {
    let conditions = ["sla_response_due_at IS NOT NULL"];
    const values: any[] = [];
    let paramIndex = 1;

    if (options?.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(options.dateFrom);
    }
    if (options?.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(options.dateTo);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        urgency,
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as tickets_breached
      FROM tickets
      ${whereClause}
      GROUP BY urgency
      ORDER BY urgency
    `;

    const rows = await db.rawQueryAll<{
      urgency: Urgency;
      total_tickets: number;
      tickets_met: number;
      tickets_breached: number;
    }>(sql, ...values);

    return rows.map((row) => ({
      urgency: row.urgency,
      totalTickets: row.total_tickets,
      ticketsMet: row.tickets_met,
      ticketsBreached: row.tickets_breached,
      complianceRate:
        row.total_tickets > 0
          ? Math.round((row.tickets_met / row.total_tickets) * 10000) / 100
          : 100,
    }));
  },

  async getSlaMetricsByAssignee(options?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<
    Array<{
      assigneeId: string | null;
      assigneeName: string | null;
      totalTickets: number;
      ticketsMet: number;
      ticketsBreached: number;
      complianceRate: number;
      avgResponseTimeMinutes: number | null;
    }>
  > {
    let conditions = ["t.sla_response_due_at IS NOT NULL"];
    const values: any[] = [];
    let paramIndex = 1;

    if (options?.dateFrom) {
      conditions.push(`t.created_at >= $${paramIndex++}`);
      values.push(options.dateFrom);
    }
    if (options?.dateTo) {
      conditions.push(`t.created_at <= $${paramIndex++}`);
      values.push(options.dateTo);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        t.assignee_id,
        u.name as assignee_name,
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN t.first_response_at IS NOT NULL AND t.first_response_at <= t.sla_response_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN t.sla_breached = true THEN 1 END)::int as tickets_breached,
        AVG(
          CASE WHEN t.first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60
          END
        ) as avg_response_time_minutes
      FROM tickets t
      LEFT JOIN users u ON t.assignee_id = u.id
      ${whereClause}
      GROUP BY t.assignee_id, u.name
      ORDER BY total_tickets DESC
    `;

    const rows = await db.rawQueryAll<{
      assignee_id: string | null;
      assignee_name: string | null;
      total_tickets: number;
      tickets_met: number;
      tickets_breached: number;
      avg_response_time_minutes: number | null;
    }>(sql, ...values);

    return rows.map((row) => ({
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      totalTickets: row.total_tickets,
      ticketsMet: row.tickets_met,
      ticketsBreached: row.tickets_breached,
      complianceRate:
        row.total_tickets > 0
          ? Math.round((row.tickets_met / row.total_tickets) * 10000) / 100
          : 100,
      avgResponseTimeMinutes: row.avg_response_time_minutes
        ? Math.round(row.avg_response_time_minutes * 100) / 100
        : null,
    }));
  },

  async getSlaTrends(options: {
    dateFrom: Date;
    dateTo: Date;
    groupBy: "day" | "week" | "month";
  }): Promise<
    Array<{
      period: string;
      totalTickets: number;
      ticketsMet: number;
      ticketsBreached: number;
      complianceRate: number;
    }>
  > {
    const dateFormat =
      options.groupBy === "day"
        ? "YYYY-MM-DD"
        : options.groupBy === "week"
          ? "IYYY-IW"
          : "YYYY-MM";

    const sql = `
      SELECT
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN sla_breached = true THEN 1 END)::int as tickets_breached
      FROM tickets
      WHERE sla_response_due_at IS NOT NULL
        AND created_at >= $1
        AND created_at <= $2
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period
    `;

    const rows = await db.rawQueryAll<{
      period: string;
      total_tickets: number;
      tickets_met: number;
      tickets_breached: number;
    }>(sql, options.dateFrom, options.dateTo);

    return rows.map((row) => ({
      period: row.period,
      totalTickets: row.total_tickets,
      ticketsMet: row.tickets_met,
      ticketsBreached: row.tickets_breached,
      complianceRate:
        row.total_tickets > 0
          ? Math.round((row.tickets_met / row.total_tickets) * 10000) / 100
          : 100,
    }));
  },

  // ==================
  // Resolution SLA Reports & Metrics
  // ==================

  async getResolutionSlaMetrics(options?: {
    dateFrom?: Date;
    dateTo?: Date;
    assigneeId?: string;
    categoryId?: string;
  }): Promise<{
    totalTickets: number;
    ticketsWithSla: number;
    ticketsMet: number;
    ticketsBreached: number;
    complianceRate: number;
    avgResolutionTimeMinutes: number | null;
  }> {
    let conditions = ["sla_resolution_due_at IS NOT NULL"];
    const values: any[] = [];
    let paramIndex = 1;

    if (options?.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(options.dateFrom);
    }
    if (options?.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(options.dateTo);
    }
    if (options?.assigneeId) {
      conditions.push(`assignee_id = $${paramIndex++}`);
      values.push(options.assigneeId);
    }
    if (options?.categoryId) {
      conditions.push(`category_id = $${paramIndex++}`);
      values.push(options.categoryId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN sla_resolution_due_at IS NOT NULL THEN 1 END)::int as tickets_with_sla,
        COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as tickets_breached,
        AVG(
          CASE WHEN resolved_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
          END
        ) as avg_resolution_time_minutes
      FROM tickets
      ${whereClause}
    `;

    const row = await db.rawQueryRow<{
      total_tickets: number;
      tickets_with_sla: number;
      tickets_met: number;
      tickets_breached: number;
      avg_resolution_time_minutes: number | null;
    }>(sql, ...values);

    const ticketsWithSla = row?.tickets_with_sla ?? 0;
    const ticketsMet = row?.tickets_met ?? 0;
    const complianceRate =
      ticketsWithSla > 0 ? (ticketsMet / ticketsWithSla) * 100 : 100;

    return {
      totalTickets: row?.total_tickets ?? 0,
      ticketsWithSla,
      ticketsMet,
      ticketsBreached: row?.tickets_breached ?? 0,
      complianceRate: Math.round(complianceRate * 100) / 100,
      avgResolutionTimeMinutes: row?.avg_resolution_time_minutes
        ? Math.round(row.avg_resolution_time_minutes * 100) / 100
        : null,
    };
  },

  async getResolutionSlaMetricsByUrgency(options?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<
    Array<{
      urgency: Urgency;
      totalTickets: number;
      ticketsMet: number;
      ticketsBreached: number;
      complianceRate: number;
    }>
  > {
    let conditions = ["sla_resolution_due_at IS NOT NULL"];
    const values: any[] = [];
    let paramIndex = 1;

    if (options?.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(options.dateFrom);
    }
    if (options?.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(options.dateTo);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        urgency,
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as tickets_breached
      FROM tickets
      ${whereClause}
      GROUP BY urgency
      ORDER BY urgency
    `;

    const rows = await db.rawQueryAll<{
      urgency: Urgency;
      total_tickets: number;
      tickets_met: number;
      tickets_breached: number;
    }>(sql, ...values);

    return rows.map((row) => ({
      urgency: row.urgency,
      totalTickets: row.total_tickets,
      ticketsMet: row.tickets_met,
      ticketsBreached: row.tickets_breached,
      complianceRate:
        row.total_tickets > 0
          ? Math.round((row.tickets_met / row.total_tickets) * 10000) / 100
          : 100,
    }));
  },

  async getResolutionSlaTrends(options: {
    dateFrom: Date;
    dateTo: Date;
    groupBy: "day" | "week" | "month";
  }): Promise<
    Array<{
      period: string;
      totalTickets: number;
      ticketsMet: number;
      ticketsBreached: number;
      complianceRate: number;
    }>
  > {
    const dateFormat =
      options.groupBy === "day"
        ? "YYYY-MM-DD"
        : options.groupBy === "week"
          ? "IYYY-IW"
          : "YYYY-MM";

    const sql = `
      SELECT
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*)::int as total_tickets,
        COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due_at THEN 1 END)::int as tickets_met,
        COUNT(CASE WHEN sla_resolution_breached = true THEN 1 END)::int as tickets_breached
      FROM tickets
      WHERE sla_resolution_due_at IS NOT NULL
        AND created_at >= $1
        AND created_at <= $2
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period
    `;

    const rows = await db.rawQueryAll<{
      period: string;
      total_tickets: number;
      tickets_met: number;
      tickets_breached: number;
    }>(sql, options.dateFrom, options.dateTo);

    return rows.map((row) => ({
      period: row.period,
      totalTickets: row.total_tickets,
      ticketsMet: row.tickets_met,
      ticketsBreached: row.tickets_breached,
      complianceRate:
        row.total_tickets > 0
          ? Math.round((row.tickets_met / row.total_tickets) * 10000) / 100
          : 100,
    }));
  },
};
