// Type definitions for the subscription service
// These mirror the Prisma schema enums but are defined locally for Encore's static analyzer

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  INCOMPLETE = "INCOMPLETE",
  INCOMPLETE_EXPIRED = "INCOMPLETE_EXPIRED",
  PAST_DUE = "PAST_DUE",
  PAUSED = "PAUSED",
  TRIALING = "TRIALING",
  UNPAID = "UNPAID"
}

export enum SubscriptionPlan {
  STARTER = "STARTER",
  TEAM = "TEAM",
  BUSINESS = "BUSINESS",
  ENTERPRISE = "ENTERPRISE"
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  PAID = "PAID",
  UNCOLLECTIBLE = "UNCOLLECTIBLE",
  VOID = "VOID"
}

// These types match the Prisma schema and are compatible with Prisma operations
// They satisfy Encore's static analysis while still working with the Prisma client