/**
 * Shared database utilities for Encore.ts
 * This replaces Prisma with raw SQL queries using Encore's SQLDatabase
 *
 * NOTE: The actual SQLDatabase instance is defined in ticket/db.ts
 * This module only provides helper utilities - it does NOT define the database.
 */

// Helper type for row results
export type Row<T> = T;

// Transaction helper
export interface Transaction {
  query<T>(strings: TemplateStringsArray, ...values: any[]): AsyncIterable<T>;
  queryRow<T>(strings: TemplateStringsArray, ...values: any[]): Promise<T | null>;
  queryAll<T>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]>;
  exec(strings: TemplateStringsArray, ...values: any[]): Promise<void>;
}

// SQL template tag helper for dynamic queries
export function sql(strings: TemplateStringsArray, ...values: any[]): { text: string; values: any[] } {
  let text = strings[0];
  const params: any[] = [];

  for (let i = 0; i < values.length; i++) {
    params.push(values[i]);
    text += `$${params.length}${strings[i + 1]}`;
  }

  return { text, values: params };
}

// Helper to build WHERE clauses dynamically
export interface WhereClause {
  conditions: string[];
  values: any[];
  paramIndex: number;
}

export function createWhereBuilder(startIndex: number = 1): WhereClause {
  return {
    conditions: [],
    values: [],
    paramIndex: startIndex,
  };
}

export function addCondition(
  where: WhereClause,
  condition: string,
  value: any
): void {
  where.conditions.push(condition.replace("?", `$${where.paramIndex}`));
  where.values.push(value);
  where.paramIndex++;
}

export function addArrayCondition(
  where: WhereClause,
  column: string,
  values: any[]
): void {
  if (values.length === 0) return;

  const placeholders = values.map((_, i) => `$${where.paramIndex + i}`).join(", ");
  where.conditions.push(`${column} IN (${placeholders})`);
  where.values.push(...values);
  where.paramIndex += values.length;
}

export function buildWhereClause(where: WhereClause): string {
  if (where.conditions.length === 0) return "";
  return `WHERE ${where.conditions.join(" AND ")}`;
}

// Helper for ORDER BY
export type SortDirection = "ASC" | "DESC" | "asc" | "desc";

export function buildOrderBy(
  column: string,
  direction: SortDirection = "DESC"
): string {
  const dir = direction.toUpperCase();
  // Sanitize column name to prevent SQL injection
  const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, "");
  return `ORDER BY ${safeColumn} ${dir}`;
}

// Helper for LIMIT/OFFSET
export function buildPagination(limit: number, offset: number): string {
  return `LIMIT ${Math.max(1, Math.min(limit, 1000))} OFFSET ${Math.max(0, offset)}`;
}

// Date formatting helper for PostgreSQL
export function toTimestamp(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Parse PostgreSQL timestamp to Date
export function fromTimestamp(value: any): Date | null {
  if (!value) return null;
  return new Date(value);
}

// JSON helper for JSONB columns
export function toJson(value: any): string {
  return JSON.stringify(value ?? {});
}

export function fromJson<T>(value: any): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}
