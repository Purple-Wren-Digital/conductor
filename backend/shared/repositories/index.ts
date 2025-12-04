/**
 * Repository Index - Central export for all database repositories
 *
 * These repositories replace Prisma client with raw SQL queries using Encore's SQLDatabase.
 * Each repository provides type-safe database operations for its domain.
 *
 * NOTE: The database instance (db), withTransaction, and generateId are exported from ticket/db.ts
 * to avoid circular dependencies. Import them from there directly.
 */

export { userRepository } from "./user.repository";
export { ticketRepository } from "./ticket.repository";
export { commentRepository } from "./comment.repository";
export { notificationRepository } from "./notification.repository";
export { marketCenterRepository } from "./market-center.repository";
export { surveyRepository } from "./survey.repository";
export { todoRepository } from "./todo.repository";
export { subscriptionRepository } from "./subscription.repository";
export { settingsAuditRepository } from "./settings-audit.repository";
