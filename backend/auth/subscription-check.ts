import { APIError } from "encore.dev/api";
import { PrismaClient, SubscriptionStatus, User } from "@prisma/client";
import { checkSubscriptionLimit } from "../subscription/subscription";

const prisma = new PrismaClient();

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
  const subscription = await prisma.subscription.findUnique({
    where: { marketCenterId },
  });

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
 * Check if adding a new user would exceed subscription limits
 */
export async function checkCanAddUser(marketCenterId: string): Promise<void> {
  const canAdd = await checkSubscriptionLimit(marketCenterId, "users");

  if (!canAdd) {
    const subscription = await prisma.subscription.findUnique({
      where: { marketCenterId },
      include: {
        marketCenter: {
          include: {
            users: { where: { isActive: true } },
          },
        },
      },
    });

    if (!subscription) {
      throw APIError.failedPrecondition(
        "No subscription found. Please subscribe to continue."
      );
    }

    const totalSeats = subscription.includedSeats + subscription.additionalSeats;
    const usedSeats = subscription.marketCenter.users.length;

    throw APIError.resourceExhausted(
      `User limit reached (${usedSeats}/${totalSeats} seats). Please upgrade your subscription or purchase additional seats.`
    );
  }
}

/**
 * Check if creating a new ticket would exceed subscription limits
 */
export async function checkCanCreateTicket(marketCenterId: string): Promise<void> {
  const canCreate = await checkSubscriptionLimit(marketCenterId, "tickets");

  if (!canCreate) {
    const subscription = await prisma.subscription.findUnique({
      where: { marketCenterId },
    });

    const features = subscription?.features as any;
    const maxTickets = features?.maxTicketsPerMonth || 0;

    throw APIError.resourceExhausted(
      `Monthly ticket limit reached (${maxTickets} tickets). Please upgrade your subscription for unlimited tickets.`
    );
  }
}

/**
 * Check if adding a new category would exceed subscription limits
 */
export async function checkCanAddCategory(marketCenterId: string): Promise<void> {
  const canAdd = await checkSubscriptionLimit(marketCenterId, "categories");

  if (!canAdd) {
    const subscription = await prisma.subscription.findUnique({
      where: { marketCenterId },
      include: {
        marketCenter: {
          include: {
            ticketCategories: true,
          },
        },
      },
    });

    const features = subscription?.features as any;
    const maxCategories = features?.customCategories || 0;
    const currentCategories = subscription?.marketCenter.ticketCategories.length || 0;

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

  const subscription = await prisma.subscription.findUnique({
    where: { marketCenterId: user.marketCenterId },
  });

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
  const subscription = await prisma.subscription.findUnique({
    where: { marketCenterId },
  });

  if (!subscription ||
      (subscription.status !== SubscriptionStatus.ACTIVE &&
       subscription.status !== SubscriptionStatus.TRIALING)) {
    return false;
  }

  const features = subscription.features as any;
  return features[feature] === true || features[feature] === -1; // -1 means unlimited
}