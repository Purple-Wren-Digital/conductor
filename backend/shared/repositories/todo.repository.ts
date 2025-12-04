/**
 * Todo Repository - Raw SQL queries for todo/subtask operations
 */

import { db, fromTimestamp, toJson, fromJson } from "../../ticket/db";
import type { Todo } from "../../todos/types";

// Database row types
interface TodoRow {
  id: string;
  title: string;
  complete: boolean;
  ticket_id: string;
  created_at: Date;
  updated_at: Date;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_by: any;
  updated_by: any;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    complete: row.complete,
    ticketId: row.ticket_id,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at),
    createdById: row.created_by_user_id,
    updatedById: row.updated_by_user_id,
    createdBy: fromJson(row.created_by),
    updatedBy: fromJson(row.updated_by),
  };
}

export const todoRepository = {
  // Find todo by ID
  async findById(id: string): Promise<Todo | null> {
    const row = await db.queryRow<TodoRow>`
      SELECT * FROM todos WHERE id = ${id}
    `;
    return row ? rowToTodo(row) : null;
  },

  // Find todos by ticket ID
  async findByTicketId(ticketId: string): Promise<Todo[]> {
    const rows = await db.queryAll<TodoRow>`
      SELECT * FROM todos
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at ASC
    `;
    return rows.map(rowToTodo);
  },

  // Create todo
  async create(data: {
    title: string;
    ticketId: string;
    createdById: string;
    complete?: boolean;
    createdBy?: { id: string; name?: string };
  }): Promise<Todo> {
    const row = await db.queryRow<TodoRow>`
      INSERT INTO todos (
        title, complete, ticket_id, created_by_user_id, updated_by_user_id,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        ${data.title},
        ${data.complete ?? false},
        ${data.ticketId},
        ${data.createdById},
        ${data.createdById},
        ${toJson(data.createdBy ?? { id: data.createdById })}::jsonb,
        ${toJson(data.createdBy ?? { id: data.createdById })}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToTodo(row!);
  },

  // Create many todos
  async createMany(todos: Array<{
    title: string;
    ticketId: string;
    createdById: string;
    complete?: boolean;
  }>): Promise<number> {
    let count = 0;
    for (const todo of todos) {
      await this.create(todo);
      count++;
    }
    return count;
  },

  // Update todo
  async update(id: string, data: {
    title?: string;
    complete?: boolean;
    updatedById: string;
    updatedBy?: { id: string; name?: string };
  }): Promise<Todo | null> {
    const updates: string[] = [
      'updated_at = NOW()',
      `updated_by_user_id = $1`,
      `updated_by = $2::jsonb`,
    ];
    const values: any[] = [
      data.updatedById,
      toJson(data.updatedBy ?? { id: data.updatedById }),
    ];
    let paramIndex = 3;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.complete !== undefined) {
      updates.push(`complete = $${paramIndex++}`);
      values.push(data.complete);
    }

    values.push(id);

    const sql = `
      UPDATE todos
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<TodoRow>(sql, ...values);
    return row ? rowToTodo(row) : null;
  },

  // Toggle todo completion
  async toggleComplete(id: string, updatedById: string): Promise<Todo | null> {
    const row = await db.queryRow<TodoRow>`
      UPDATE todos
      SET complete = NOT complete, updated_at = NOW(), updated_by_user_id = ${updatedById}
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? rowToTodo(row) : null;
  },

  // Delete todo
  async delete(id: string): Promise<boolean> {
    await db.exec`DELETE FROM todos WHERE id = ${id}`;
    return true;
  },

  // Delete all todos for a ticket
  async deleteByTicketId(ticketId: string): Promise<number> {
    const result = await db.queryRow<{ count: number }>`
      WITH deleted AS (
        DELETE FROM todos WHERE ticket_id = ${ticketId} RETURNING id
      )
      SELECT COUNT(*)::int as count FROM deleted
    `;
    return result?.count ?? 0;
  },

  // Count todos by ticket
  async countByTicketId(ticketId: string, options?: { complete?: boolean }): Promise<number> {
    let sql = 'SELECT COUNT(*)::int as count FROM todos WHERE ticket_id = $1';
    const values: any[] = [ticketId];

    if (options?.complete !== undefined) {
      sql += ' AND complete = $2';
      values.push(options.complete);
    }

    const result = await db.rawQueryRow<{ count: number }>(sql, ...values);
    return result?.count ?? 0;
  },
};
