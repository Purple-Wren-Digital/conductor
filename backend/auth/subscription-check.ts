import { APIError } from "encore.dev/api";
import { subscriptionRepository } from "../shared/repositories";
import { SubscriptionStatus } from "../subscription/types";
import { checkSubscriptionLimit } from "../subscription/subscription";
import type { User } from "../user/types";

export interface SubscriptionContext {
  hasActiveSubscription: boolean;
  canAddUsers: boolean;
  canCreateTickets: boolean;
  canAddCategories: boolean;
  subscriptionStatus?: SubscriptionStatus;
  planType?: string;
  features?: any;
}

/**
 * Check if the market center has an active subscription
 */
export async function requireActiveSubscription(marketCenterId: string): Promise<void> {
  const subscription = await subscriptionRepository.findByMarketCenterId(marketCenterId);

  if (!subscription) {
    throw APIError.failedPrecondition(
      "No subscription found. Please subscribe to continue."
    );
  }

  // Allow grace period for past due subscriptions (7 days)
  if (subscription.status === SubscriptionStatus.PAST_DUE) {
    const gracePeriodEnd = new Date(subscription.currentPeriodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    if (new Date() > gracePeriodEnd) {
      throw APIError.failedPrecondition(
        "Subscription is past due. Please update your payment method."
      );
    }
  } else if (
    subscription.status !== SubscriptionStatus.ACTIVE &&
    subscription.status !== SubscriptionStatus.TRIALING
  ) {
    throw APIError.failedPrecondition(
      `Subscription is ${subscription.status}. Please contact support.`
    );
  }
}

/**
 * Check if adding a new user/invitation would exceed subscription limits
 * Counts both active users AND pending invitations against the seat limit
 *
 * @param marketCenterId - The market center to check
 * @param role - Optional role being added. If 'AGENT', the check is skipped since agents are free
 */
export async function checkCanAddUser(marketCenterId: string, role?: string): Promise<void> {
  // AGENT role users are free and don't count against seat limits
  if (role === "AGENT") {
    return;
  }

  const result = await subscriptionRepository.findByMarketCenterIdWithUserCount(marketCenterId);

  if (!result) {
    throw APIError.failedPrecondition(
      "No subscription found. Please subscribe to continue."
    );
  }

  const { subscription, totalUsedSeats } = result;
  const totalSeats = subscription.includedSeats + subscription.additionalSeats;

  if (totalUsedSeats >= totalSeats) {
    throw APIError.resourceExhausted(
      `Seat limit reached (${totalUsedSeats}/${totalSeats} seats used, including pending invitations). Please upgrade your subscription or purchase additional seats.`
    );
  }
}

/**
 * Check if creating a new ticket would exceed subscription limits
 * Note: Subscription usage tracking disabled - unlimited tickets allowed
 */
export async function checkCanCreateTicket(marketCenterId: string): Promise<void> {
  // Subscription usage tracking disabled - unlimited tickets allowed
  return;
}

/**
 * Check if adding a new category would exceed subscription limits
 */
export async function checkCanAddCategory(marketCenterId: string): Promise<void> {
  const canAdd = await checkSubscriptionLimit(marketCenterId, "categories");

  if (!canAdd) {
    const result = await subscriptionRepository.findByMarketCenterIdWithCategoryCount(marketCenterId);

    const features = result?.subscription.features as any;
    const maxCategories = features?.customCategories || 0;
    const currentCategories = result?.categoryCount || 0;

    throw APIError.resourceExhausted(
      `Category limit reached (${currentCategories}/${maxCategories} categories). Please upgrade your subscription for unlimited categories.`
    );
  }
}

/**
 * Get subscription context for a user
 */
export async function getSubscriptionContext(user: User): Promise<SubscriptionContext> {
  if (!user.marketCenterId) {
    return {
      hasActiveSubscription: false,
      canAddUsers: false,
      canCreateTickets: false,
      canAddCategories: false,
    };
  }

  const subscription = await subscriptionRepository.findByMarketCenterId(user.marketCenterId);

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      canAddUsers: false,
      canCreateTickets: false,
      canAddCategories: false,
    };
  }

  const isActive =
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.TRIALING;

  return {
    hasActiveSubscription: isActive,
    canAddUsers: isActive && await checkSubscriptionLimit(user.marketCenterId, "users"),
    canCreateTickets: isActive && await checkSubscriptionLimit(user.marketCenterId, "tickets"),
    canAddCategories: isActive && await checkSubscriptionLimit(user.marketCenterId, "categories"),
    subscriptionStatus: subscription.status,
    planType: subscription.planType,
    features: subscription.features,
  };
}

/**
 * Middleware to check feature access based on subscription
 */
export async function checkFeatureAccess(
  marketCenterId: string,
  feature: string
): Promise<boolean> {
  const subscription = await subscriptionRepository.findByMarketCenterId(marketCenterId);

  if (!subscription ||
      (subscription.status !== SubscriptionStatus.ACTIVE &&
       subscription.status !== SubscriptionStatus.TRIALING)) {
    return false;
  }

  const features = subscription.features as any;
  return features[feature] === true || features[feature] === -1; // -1 means unlimited
}

/**
 * Check if user can create additional market centers
 * Only Enterprise plan can have multiple market centers
 */
export async function checkCanCreateMarketCenter(marketCenterId: string | null): Promise<void> {
  // If user has no market center yet, they can create their first one
  if (!marketCenterId) {
    return;
  }

  const subscription = await subscriptionRepository.findByMarketCenterId(marketCenterId);

  // If no subscription exists, they can't create additional market centers
  if (!subscription) {
    throw APIError.failedPrecondition(
      "No active subscription found. Please subscribe to continue."
    );
  }

  // Check if subscription is active
  if (subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIALING) {
    throw APIError.failedPrecondition(
      `Subscription is ${subscription.status}. Please update your billing to continue.`
    );
  }

  // Only Enterprise plan can create multiple market centers
  if (subscription.planType !== "ENTERPRISE") {
    throw APIError.failedPrecondition(
      "Multiple market centers require an Enterprise subscription. Please upgrade to create additional market centers."
    );
  }
}
