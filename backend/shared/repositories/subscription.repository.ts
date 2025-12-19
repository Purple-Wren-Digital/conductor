/**
 * Subscription Repository - Raw SQL queries for subscription operations
 */

import { db, fromTimestamp, toJson, fromJson } from "../../ticket/db";
import { SubscriptionStatus, SubscriptionPlan } from "../../subscription/types";

// Database row types
interface SubscriptionRow {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  market_center_id: string;
  status: SubscriptionStatus;
  plan_type: SubscriptionPlan;
  price_id: string;
  included_seats: number;
  additional_seats: number;
  seat_price: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at: Date | null;
  canceled_at: Date | null;
  trial_end: Date | null;
  features: any;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  marketCenterId: string;
  status: SubscriptionStatus;
  planType: SubscriptionPlan;
  priceId: string;
  includedSeats: number;
  additionalSeats: number;
  seatPrice: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt: Date | null;
  canceledAt: Date | null;
  trialEnd: Date | null;
  features: any;
  createdAt: Date;
  updatedAt: Date;
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeCustomerId: row.stripe_customer_id,
    marketCenterId: row.market_center_id,
    status: row.status,
    planType: row.plan_type,
    priceId: row.price_id,
    includedSeats: row.included_seats,
    additionalSeats: row.additional_seats,
    seatPrice: parseFloat(row.seat_price),
    currentPeriodStart: fromTimestamp(row.current_period_start)!,
    currentPeriodEnd: fromTimestamp(row.current_period_end)!,
    cancelAt: fromTimestamp(row.cancel_at),
    canceledAt: fromTimestamp(row.canceled_at),
    trialEnd: fromTimestamp(row.trial_end),
    features: fromJson(row.features),
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

export const subscriptionRepository = {
  // Find subscription by market center ID
  async findByMarketCenterId(
    marketCenterId: string | null
  ): Promise<Subscription | null> {
    if (!marketCenterId) return null;
    const row = await db.queryRow<SubscriptionRow>`
      SELECT * FROM subscriptions WHERE market_center_id = ${marketCenterId}
    `;
    return row ? rowToSubscription(row) : null;
  },

  // Find subscription by ID
  async findById(id: string): Promise<Subscription | null> {
    const row = await db.queryRow<SubscriptionRow>`
      SELECT * FROM subscriptions WHERE id = ${id}
    `;
    return row ? rowToSubscription(row) : null;
  },

  // Find subscription by Stripe subscription ID
  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<Subscription | null> {
    const row = await db.queryRow<SubscriptionRow>`
      SELECT * FROM subscriptions WHERE stripe_subscription_id = ${stripeSubscriptionId}
    `;
    return row ? rowToSubscription(row) : null;
  },

  // Find subscription with market center user count (includes pending invitations)
  // Note: AGENT role users are free and don't count against paid seat limits
  async findByMarketCenterIdWithUserCount(marketCenterId: string): Promise<{
    subscription: Subscription;
    activeUserCount: number;
    agentCount: number;
    pendingInvitationCount: number;
    totalUsedSeats: number;
  } | null> {
    const subscription = await this.findByMarketCenterId(marketCenterId);
    if (!subscription) return null;

    // Count only non-AGENT users against seat limits (paid seats)
    const paidUserCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM users
      WHERE market_center_id = ${marketCenterId} AND is_active = true AND role != 'AGENT'
    `;

    // Count AGENT users separately (they're free)
    const agentUserCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM users
      WHERE market_center_id = ${marketCenterId} AND is_active = true AND role = 'AGENT'
    `;

    const invitationCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM team_invitations
      WHERE market_center_id = ${marketCenterId} AND status = 'PENDING'
    `;

    const paidUsers = paidUserCount?.count ?? 0;
    const agents = agentUserCount?.count ?? 0;
    const pendingInvitations = invitationCount?.count ?? 0;

    return {
      subscription,
      activeUserCount: paidUsers,
      agentCount: agents,
      pendingInvitationCount: pendingInvitations,
      totalUsedSeats: paidUsers + pendingInvitations, // Agents don't count
    };
  },

  // Find subscription with market center category count
  async findByMarketCenterIdWithCategoryCount(marketCenterId: string): Promise<{
    subscription: Subscription;
    categoryCount: number;
  } | null> {
    const subscription = await this.findByMarketCenterId(marketCenterId);
    if (!subscription) return null;

    const categoryCount = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM ticket_categories
      WHERE market_center_id = ${marketCenterId}
    `;

    return {
      subscription,
      categoryCount: categoryCount?.count ?? 0,
    };
  },

  // Create subscription
  async create(data: {
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    marketCenterId: string;
    status: SubscriptionStatus;
    planType: SubscriptionPlan;
    priceId: string;
    includedSeats?: number;
    additionalSeats?: number;
    seatPrice?: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEnd?: Date | null;
    features?: any;
    cancelAt: Date | null;
    canceledAt: Date | null;
  }): Promise<Subscription> {
    const row = await db.queryRow<SubscriptionRow>`
      INSERT INTO subscriptions (
        stripe_subscription_id, stripe_customer_id, market_center_id, status, plan_type,
        price_id, included_seats, additional_seats, seat_price,
        current_period_start, current_period_end, trial_end, features, created_at, updated_at, cancel_at, canceled_at
      ) VALUES (
        ${data.stripeSubscriptionId},
        ${data.stripeCustomerId},
        ${data.marketCenterId},
        ${data.status},
        ${data.planType},
        ${data.priceId},
        ${data.includedSeats ?? 5},
        ${data.additionalSeats ?? 0},
        ${data.seatPrice ?? 10.0},
        ${data.currentPeriodStart},
        ${data.currentPeriodEnd},
        ${data.trialEnd ?? null},
        ${toJson(data.features ?? {})}::jsonb,
        ${data.cancelAt ?? null},
        ${data.canceledAt ?? null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToSubscription(row!);
  },

  // Update subscription
  async update(
    id: string,
    data: Partial<{
      status: SubscriptionStatus;
      planType: SubscriptionPlan;
      priceId: string;
      includedSeats: number;
      additionalSeats: number;
      seatPrice: number;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAt: Date | null;
      canceledAt: Date | null;
      trialEnd: Date | null;
      features: any;
    }>
  ): Promise<Subscription | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.planType !== undefined) {
      updates.push(`plan_type = $${paramIndex++}`);
      values.push(data.planType);
    }
    if (data.priceId !== undefined) {
      updates.push(`price_id = $${paramIndex++}`);
      values.push(data.priceId);
    }
    if (data.includedSeats !== undefined) {
      updates.push(`included_seats = $${paramIndex++}`);
      values.push(data.includedSeats);
    }
    if (data.additionalSeats !== undefined) {
      updates.push(`additional_seats = $${paramIndex++}`);
      values.push(data.additionalSeats);
    }
    if (data.seatPrice !== undefined) {
      updates.push(`seat_price = $${paramIndex++}`);
      values.push(data.seatPrice);
    }
    if (data.currentPeriodStart !== undefined) {
      updates.push(`current_period_start = $${paramIndex++}`);
      values.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== undefined) {
      updates.push(`current_period_end = $${paramIndex++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.cancelAt !== undefined) {
      updates.push(`cancel_at = $${paramIndex++}`);
      values.push(data.cancelAt);
    }
    if (data.canceledAt !== undefined) {
      updates.push(`canceled_at = $${paramIndex++}`);
      values.push(data.canceledAt);
    }
    if (data.trialEnd !== undefined) {
      updates.push(`trial_end = $${paramIndex++}`);
      values.push(data.trialEnd);
    }
    if (data.features !== undefined) {
      updates.push(`features = $${paramIndex++}::jsonb`);
      values.push(toJson(data.features));
    }

    values.push(id);

    const sql = `
      UPDATE subscriptions
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<SubscriptionRow>(sql, ...values);
    return row ? rowToSubscription(row) : null;
  },

  // Delete subscription
  async delete(id: string): Promise<boolean> {
    await db.exec`DELETE FROM subscriptions WHERE id = ${id}`;
    return true;
  },

  // Find all market center IDs that share the same stripe_customer_id
  // Used for Enterprise subscriptions with multiple market centers
  async findMarketCenterIdsByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<string[]> {
    const rows = await db.queryAll<{ market_center_id: string }>`
      SELECT market_center_id FROM subscriptions
      WHERE stripe_customer_id = ${stripeCustomerId}
    `;
    return rows.map((row) => row.market_center_id);
  },

  // Get all market center IDs accessible to a user based on their subscription
  // - Non-Enterprise: Only their own market center
  // - Enterprise: All market centers under the same stripe_customer_id
  async getAccessibleMarketCenterIds(
    userMarketCenterId: string | null
  ): Promise<string[]> {
    if (!userMarketCenterId) {
      return [];
    }

    // Get the user's subscription
    const subscription = await this.findByMarketCenterId(userMarketCenterId);

    if (!subscription) {
      // No subscription - only their own market center
      return [userMarketCenterId];
    }

    // Check if Enterprise plan
    if (subscription.planType !== "ENTERPRISE") {
      // Non-Enterprise: Only their own market center
      return [userMarketCenterId];
    }

    // Enterprise: Get all market centers under the same stripe_customer_id
    return this.findMarketCenterIdsByStripeCustomerId(
      subscription.stripeCustomerId
    );
  },

  // Check if a user can access a specific market center based on subscription
  async canAccessMarketCenter(
    userMarketCenterId: string | null,
    targetMarketCenterId: string
  ): Promise<boolean> {
    if (!userMarketCenterId) {
      return false;
    }

    // Same market center - always allowed
    if (userMarketCenterId === targetMarketCenterId) {
      return true;
    }

    // Get accessible market centers
    const accessibleIds = await this.getAccessibleMarketCenterIds(
      userMarketCenterId
    );
    return accessibleIds.includes(targetMarketCenterId);
  },
};
