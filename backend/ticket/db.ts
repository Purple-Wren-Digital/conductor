/**
 * Ticket Database Module
 *
 * This module provides the database connection for the ticket service.
 * It uses Encore's native SQLDatabase instead of Prisma.
 *
 * All database operations are now handled through repositories in shared/repositories/
 */

import { SQLDatabase } from "encore.dev/storage/sqldb";

// Database instance for the ticket service - this is the ONLY place the database is defined
// NOTE: We use 'db' as the export name since that's what repositories expect
export const db = new SQLDatabase("ticket", {
  migrations: {
    path: "./migrations",
    source: "prisma", // Keep prisma format for existing migrations compatibility
  },
});

// Re-export utilities from shared/db (these don't need the database)
export {
  toTimestamp,
  fromTimestamp,
  toJson,
  fromJson,
  sql,
  createWhereBuilder,
  addCondition,
  addArrayCondition,
  buildWhereClause,
  buildOrderBy,
  buildPagination,
} from "../shared/db";

// Transaction helper using ticketDB
export interface Transaction {
  query<T>(strings: TemplateStringsArray, ...values: any[]): AsyncIterable<T>;
  queryRow<T>(strings: TemplateStringsArray, ...values: any[]): Promise<T | null>;
  queryAll<T>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]>;
  exec(strings: TemplateStringsArray, ...values: any[]): Promise<void>;
}

export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  const tx = await db.begin();
  try {
    const result = await fn(tx as unknown as Transaction);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

// Generate a UUID
export async function generateId(): Promise<string> {
  const result = await db.queryRow<{ id: string }>`SELECT gen_random_uuid()::text as id`;
  return result?.id ?? crypto.randomUUID();
}

// Re-export repositories for easy access - these will import from shared/repositories
// but use the db exported above
export {
  userRepository,
  ticketRepository,
  commentRepository,
  notificationRepository,
  marketCenterRepository,
  surveyRepository,
  todoRepository,
  subscriptionRepository,
  settingsAuditRepository,
} from "../shared/repositories";
