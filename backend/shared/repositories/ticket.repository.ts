/**
 * Ticket Repository - Raw SQL queries for ticket operations
 */

import { db, fromTimestamp, toJson, fromJson, withTransaction } from "../../ticket/db";
import type { Ticket, TicketStatus, Urgency, TicketHistory, Comment, Attachment } from "../../ticket/types";
import type { User, UserRole } from "../../user/types";
import type { TicketCategory } from "../../marketCenters/types";
import type { Todo } from "../../todos/types";

// Database row types (snake_case from PostgreSQL)
interface TicketRow {
  id: string;
  title: string | null;
  description: string | null;
  status: TicketStatus | null;
  urgency: Urgency | null;
  creator_id: string;
  assignee_id: string | null;
  due_date: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  category_id: string | null;
  survey_id: string | null;
  email_message_id: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  market_center_id: string | null;
  clerk_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  market_center_id: string;
  default_assignee_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    marketCenterId: row.market_center_id,
    clerkId: row.clerk_id,
    isActive: row.is_active,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

function rowToCategory(row: CategoryRow): TicketCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    marketCenterId: row.market_center_id,
    defaultAssigneeId: row.default_assignee_id,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

function rowToTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status ?? "CREATED",
    urgency: row.urgency ?? "MEDIUM",
    creatorId: row.creator_id,
    assigneeId: row.assignee_id,
    dueDate: fromTimestamp(row.due_date),
    resolvedAt: fromTimestamp(row.resolved_at),
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
    categoryId: row.category_id,
    surveyId: row.survey_id,
    emailMessageId: row.email_message_id,
  };
}

export const ticketRepository = {
  // Find ticket by ID
  async findById(id: string): Promise<Ticket | null> {
    const row = await db.queryRow<TicketRow>`
      SELECT * FROM tickets WHERE id = ${id}
    `;
    return row ? rowToTicket(row) : null;
  },

  // Find ticket by ID with relations
  async findByIdWithRelations(id: string): Promise<Ticket | null> {
    const row = await db.queryRow<TicketRow>`
      SELECT * FROM tickets WHERE id = ${id}
    `;

    if (!row) return null;

    const ticket = rowToTicket(row);

    // Get creator
    const creatorRow = await db.queryRow<UserRow>`
      SELECT * FROM users WHERE id = ${row.creator_id}
    `;
    if (creatorRow) {
      ticket.creator = rowToUser(creatorRow);
    }

    // Get assignee
    if (row.assignee_id) {
      const assigneeRow = await db.queryRow<UserRow>`
        SELECT * FROM users WHERE id = ${row.assignee_id}
      `;
      if (assigneeRow) {
        ticket.assignee = rowToUser(assigneeRow);
      }
    }

    // Get category
    if (row.category_id) {
      const categoryRow = await db.queryRow<CategoryRow>`
        SELECT * FROM ticket_categories WHERE id = ${row.category_id}
      `;
      if (categoryRow) {
        ticket.category = rowToCategory(categoryRow);
      }
    }

    return ticket;
  },

  // Find ticket with counts
  async findByIdWithCounts(id: string): Promise<Ticket | null> {
    const ticket = await this.findByIdWithRelations(id);
    if (!ticket) return null;

    const counts = await db.queryRow<{ comments: number; attachments: number }>`
      SELECT
        (SELECT COUNT(*)::int FROM comments WHERE ticket_id = ${id}) as comments,
        (SELECT COUNT(*)::int FROM attachments WHERE ticket_id = ${id}) as attachments
    `;

    ticket.commentCount = counts?.comments ?? 0;
    ticket.attachmentCount = counts?.attachments ?? 0;

    return ticket;
  },

  // Create a new ticket
  async create(data: {
    title?: string | null;
    description?: string | null;
    status?: TicketStatus;
    urgency?: Urgency;
    creatorId: string;
    assigneeId?: string | null;
    categoryId?: string | null;
    dueDate?: Date | null;
  }): Promise<Ticket> {
    const row = await db.queryRow<TicketRow>`
      INSERT INTO tickets (
        title, description, status, urgency, creator_id, assignee_id, category_id, due_date, created_at, updated_at
      ) VALUES (
        ${data.title ?? null},
        ${data.description ?? null},
        ${data.status ?? 'CREATED'},
        ${data.urgency ?? 'MEDIUM'},
        ${data.creatorId},
        ${data.assigneeId ?? null},
        ${data.categoryId ?? null},
        ${data.dueDate ?? null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToTicket(row!);
  },

  // Update ticket
  async update(id: string, data: Partial<{
    title: string | null;
    description: string | null;
    status: TicketStatus;
    urgency: Urgency;
    assigneeId: string | null;
    categoryId: string | null;
    dueDate: Date | null;
    resolvedAt: Date | null;
    surveyId: string | null;
  }>): Promise<Ticket | null> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.urgency !== undefined) {
      updates.push(`urgency = $${paramIndex++}`);
      values.push(data.urgency);
    }
    if (data.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      values.push(data.assigneeId);
    }
    if (data.categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(data.categoryId);
    }
    if (data.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(data.dueDate);
    }
    if (data.resolvedAt !== undefined) {
      updates.push(`resolved_at = $${paramIndex++}`);
      values.push(data.resolvedAt);
    }
    if (data.surveyId !== undefined) {
      updates.push(`survey_id = $${paramIndex++}`);
      values.push(data.surveyId);
    }

    values.push(id);

    const sql = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<TicketRow>(sql, ...values);
    return row ? rowToTicket(row) : null;
  },

  // Update many tickets
  async updateMany(ids: string[], data: Partial<{
    status: TicketStatus;
    assigneeId: string | null;
  }>): Promise<number> {
    if (ids.length === 0) return 0;

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      values.push(data.assigneeId);
    }

    const placeholders = ids.map((_, i) => `$${paramIndex + i}`).join(', ');
    values.push(...ids);

    const sql = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id IN (${placeholders})
    `;

    await db.rawExec(sql, ...values);

    // Return the count of updated rows
    return ids.length;
  },

  // Count tickets
  async count(where?: {
    creatorId?: string;
    assigneeId?: string;
    status?: TicketStatus[];
    categoryId?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*)::int as count FROM tickets WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (where?.creatorId) {
      sql += ` AND creator_id = $${paramIndex++}`;
      values.push(where.creatorId);
    }
    if (where?.assigneeId) {
      sql += ` AND assignee_id = $${paramIndex++}`;
      values.push(where.assigneeId);
    }
    if (where?.status && where.status.length > 0) {
      const placeholders = where.status.map((_, i) => `$${paramIndex + i}`).join(', ');
      sql += ` AND status IN (${placeholders})`;
      values.push(...where.status);
      paramIndex += where.status.length;
    }
    if (where?.categoryId) {
      sql += ` AND category_id = $${paramIndex++}`;
      values.push(where.categoryId);
    }

    const result = await db.rawQueryRow<{ count: number }>(sql, ...values);
    return result?.count ?? 0;
  },

  // Search tickets with complex filtering
  async search(params: {
    // Access control
    userId?: string;
    userRole?: UserRole;
    userMarketCenterId?: string | null;
    // Filters
    query?: string;
    status?: TicketStatus[];
    urgency?: Urgency[];
    assigneeId?: string | null;
    creatorId?: string;
    categoryId?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    // Sorting
    sortBy?: 'updatedAt' | 'createdAt' | 'urgency' | 'status';
    sortDir?: 'asc' | 'desc';
    // Pagination
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: Ticket[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Role-based access control
    if (params.userRole === 'AGENT' && params.userId) {
      conditions.push(`t.creator_id = $${paramIndex++}`);
      values.push(params.userId);
    } else if ((params.userRole === 'STAFF' || params.userRole === 'STAFF_LEADER') && params.userMarketCenterId) {
      conditions.push(`(
        tc.market_center_id = $${paramIndex} OR
        creator.market_center_id = $${paramIndex} OR
        assignee.market_center_id = $${paramIndex}
      )`);
      values.push(params.userMarketCenterId);
      paramIndex++;
    } else if ((params.userRole === 'STAFF' || params.userRole === 'STAFF_LEADER') && !params.userMarketCenterId && params.userId) {
      conditions.push(`(t.assignee_id = $${paramIndex} OR t.creator_id = $${paramIndex})`);
      values.push(params.userId);
      paramIndex++;
    }
    // ADMIN has no restrictions

    // Filter conditions
    if (params.status && params.status.length > 0) {
      const placeholders = params.status.map((_, i) => `$${paramIndex + i}`).join(', ');
      conditions.push(`t.status IN (${placeholders})`);
      values.push(...params.status);
      paramIndex += params.status.length;
    } else {
      // Default: exclude RESOLVED
      conditions.push(`t.status != 'RESOLVED'`);
    }

    if (params.urgency && params.urgency.length > 0) {
      const placeholders = params.urgency.map((_, i) => `$${paramIndex + i}`).join(', ');
      conditions.push(`t.urgency IN (${placeholders})`);
      values.push(...params.urgency);
      paramIndex += params.urgency.length;
    }

    if (params.assigneeId !== undefined) {
      if (params.assigneeId === null || params.assigneeId === 'Unassigned') {
        conditions.push(`t.assignee_id IS NULL`);
      } else {
        conditions.push(`t.assignee_id = $${paramIndex++}`);
        values.push(params.assigneeId);
      }
    }

    if (params.creatorId) {
      conditions.push(`t.creator_id = $${paramIndex++}`);
      values.push(params.creatorId);
    }

    if (params.categoryId && params.categoryId.length > 0) {
      const placeholders = params.categoryId.map((_, i) => `$${paramIndex + i}`).join(', ');
      conditions.push(`t.category_id IN (${placeholders})`);
      values.push(...params.categoryId);
      paramIndex += params.categoryId.length;
    }

    if (params.query) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      values.push(`%${params.query}%`);
      paramIndex++;
    }

    if (params.dateFrom) {
      conditions.push(`t.created_at >= $${paramIndex++}`);
      values.push(params.dateFrom);
    }

    if (params.dateTo) {
      conditions.push(`t.created_at <= $${paramIndex++}`);
      values.push(params.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    const sortColumnMap: Record<string, string> = {
      updatedAt: 't.updated_at',
      createdAt: 't.created_at',
      urgency: 't.urgency',
      status: 't.status',
    };
    const sortColumn = sortColumnMap[params.sortBy ?? 'updatedAt'] ?? 't.updated_at';
    const sortDir = params.sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    // Count total
    const countSql = `
      SELECT COUNT(*)::int as count
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      ${whereClause}
    `;
    const countResult = await db.rawQueryRow<{ count: number }>(countSql, ...values);
    const total = countResult?.count ?? 0;

    // Get tickets with relations
    const sql = `
      SELECT
        t.*,
        (SELECT COUNT(*)::int FROM comments WHERE ticket_id = t.id) as comment_count,
        (SELECT COUNT(*)::int FROM attachments WHERE ticket_id = t.id) as attachment_count
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}, t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await db.rawQueryAll<TicketRow & { comment_count: number; attachment_count: number }>(sql, ...values);

    // Fetch related data for each ticket
    const tickets: Ticket[] = [];

    for (const row of rows) {
      const ticket = rowToTicket(row);
      ticket.commentCount = row.comment_count;
      ticket.attachmentCount = row.attachment_count;

      // Get creator
      const creatorRow = await db.queryRow<UserRow>`SELECT * FROM users WHERE id = ${row.creator_id}`;
      if (creatorRow) ticket.creator = rowToUser(creatorRow);

      // Get assignee
      if (row.assignee_id) {
        const assigneeRow = await db.queryRow<UserRow>`SELECT * FROM users WHERE id = ${row.assignee_id}`;
        if (assigneeRow) ticket.assignee = rowToUser(assigneeRow);
      }

      // Get category
      if (row.category_id) {
        const categoryRow = await db.queryRow<CategoryRow>`SELECT * FROM ticket_categories WHERE id = ${row.category_id}`;
        if (categoryRow) ticket.category = rowToCategory(categoryRow);
      }

      tickets.push(ticket);
    }

    return { tickets, total };
  },

  // Create ticket history
  async createHistory(data: {
    ticketId: string;
    action: string;
    field?: string | null;
    previousValue?: string | null;
    newValue?: string | null;
    snapshot?: any;
    changedById: string;
  }): Promise<void> {
    await db.exec`
      INSERT INTO ticket_history (
        id, ticket_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
      ) VALUES (
        gen_random_uuid()::text,
        ${data.ticketId},
        ${data.action},
        ${data.field ?? null},
        ${data.previousValue ?? null},
        ${data.newValue ?? null},
        ${data.snapshot ? toJson(data.snapshot) : null}::jsonb,
        ${data.changedById},
        NOW()
      )
    `;
  },

  // Create many ticket history records
  async createManyHistory(records: Array<{
    ticketId: string;
    action: string;
    field?: string | null;
    previousValue?: string | null;
    newValue?: string | null;
    snapshot?: any;
    changedById: string;
  }>): Promise<void> {
    for (const record of records) {
      await this.createHistory(record);
    }
  },

  // Update many tickets by assignee ID
  async updateManyByAssignee(
    assigneeId: string,
    data: { assigneeId: string | null },
    options?: { statusIn?: TicketStatus[] }
  ): Promise<number> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    updates.push(`assignee_id = $${paramIndex++}`);
    values.push(data.assigneeId);

    values.push(assigneeId);

    let sql = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE assignee_id = $${paramIndex++}
    `;

    if (options?.statusIn && options.statusIn.length > 0) {
      const placeholders = options.statusIn.map((_, i) => `$${paramIndex + i}`).join(', ');
      sql += ` AND status IN (${placeholders})`;
      values.push(...options.statusIn);
    }

    await db.rawExec(sql, ...values);

    return 0; // Return count not available in raw exec
  },

  // Find tickets by IDs
  async findByIds(ids: string[]): Promise<Ticket[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM tickets WHERE id IN (${placeholders})`;
    const rows = await db.rawQueryAll<TicketRow>(sql, ...ids);

    return rows.map(rowToTicket);
  },

  // Find tickets by IDs with relations (for bulk operations)
  async findByIdsWithRelations(ids: string[], options?: {
    includeCreator?: boolean;
    includeAssignee?: boolean;
    includeCategory?: boolean;
  }): Promise<Ticket[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM tickets WHERE id IN (${placeholders})`;
    const rows = await db.rawQueryAll<TicketRow>(sql, ...ids);

    const tickets: Ticket[] = [];

    for (const row of rows) {
      const ticket = rowToTicket(row);

      if (options?.includeCreator) {
        const creatorRow = await db.queryRow<UserRow>`SELECT * FROM users WHERE id = ${row.creator_id}`;
        if (creatorRow) ticket.creator = rowToUser(creatorRow);
      }

      if (options?.includeAssignee && row.assignee_id) {
        const assigneeRow = await db.queryRow<UserRow>`SELECT * FROM users WHERE id = ${row.assignee_id}`;
        if (assigneeRow) ticket.assignee = rowToUser(assigneeRow);
      }

      if (options?.includeCategory && row.category_id) {
        const categoryRow = await db.queryRow<CategoryRow>`SELECT * FROM ticket_categories WHERE id = ${row.category_id}`;
        if (categoryRow) ticket.category = rowToCategory(categoryRow);
      }

      tickets.push(ticket);
    }

    return tickets;
  },
};
