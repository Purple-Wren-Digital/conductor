import { APIError, api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { getAuthData } from "~encore/auth";
import type { IncomingMessage } from "node:http";
import Stripe from "stripe";
import { db, userRepository, subscriptionRepository } from "../ticket/db";
import { SubscriptionStatus, SubscriptionPlan, InvoiceStatus } from "./types";
import { getUserContext } from "../auth/user-context";

// Setup Stripe client
const stripeSecretKey = secret("StripeSecretKey");
const stripeWebhookSigningSecret = secret("StripeWebhookSigningSecret");
const frontendUrl = secret("FRONTEND_URL");

const stripe = new Stripe(stripeSecretKey());

// Pricing configuration (seat-based)
export const PRICING_PLANS = {
  EARLY_BIRD: {
    name: "Early Bird",
    priceId: "price_1THTb23o7cHR3Cbv2eCwsYFF",
    includedSeats: 50,
    monthlyPrice: 399,
    additionalSeatPrice: 6,
    features: {
      maxTicketsPerMonth: -1, // Unlimited
      prioritySupport: true,
      customCategories: -1, // Unlimited
      apiAccess: true,
      advancedReporting: true,
    },
  },
  STANDARD: {
    name: "Standard",
    priceId: "price_1THThI3o7cHR3CbvxyLObRXp",
    includedSeats: 50,
    monthlyPrice: 499,
    additionalSeatPrice: 6,
    features: {
      maxTicketsPerMonth: -1, // Unlimited
      prioritySupport: true,
      customCategories: -1, // Unlimited
      apiAccess: true,
      advancedReporting: true,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceId: "price_1THTj83o7cHR3CbvNxlmxmyb",
    includedSeats: -1, // Unlimited
    monthlyPrice: -1, // Custom
    additionalSeatPrice: -1, // Custom
    features: {
      maxTicketsPerMonth: -1,
      prioritySupport: true,
      customCategories: -1,
      apiAccess: true,
      advancedReporting: true,
    },
  },
};

// Helper function to extract the body from an incoming request
function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const bodyParts: Uint8Array[] = [];
    req
      .on("data", (chunk) => {
        bodyParts.push(chunk);
      })
      .on("end", () => {
        resolve(Buffer.concat(bodyParts).toString());
      });
  });
}

// Helper function to map Stripe status to our SubscriptionStatus enum
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: { [key: string]: SubscriptionStatus } = {
    active: SubscriptionStatus.ACTIVE,
    canceled: SubscriptionStatus.CANCELED,
    incomplete: SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    past_due: SubscriptionStatus.PAST_DUE,
    paused: SubscriptionStatus.PAUSED,
    trialing: SubscriptionStatus.TRIALING,
    unpaid: SubscriptionStatus.UNPAID,
  };
  return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
}

// Helper function to determine plan type from price ID
function getPlanTypeFromPriceId(priceId: string): SubscriptionPlan {
  for (const [key, plan] of Object.entries(PRICING_PLANS)) {
    if (plan.priceId === priceId) {
      return key as SubscriptionPlan;
    }
  }
  return SubscriptionPlan.EARLY_BIRD; // Default
}

// Handle Stripe webhook events
export const webhookHandler = api.raw(
  {
    method: "POST",
    expose: true,
    path: "/stripe/webhook",
  },
  async (req, res) => {
    try {
      const body = await getBody(req);
      const stripeSignature = req.headers["stripe-signature"] as string;

      if (!stripeSignature) {
        res.writeHead(400);
        res.write(JSON.stringify({ error: "No stripe-signature header" }));
        res.end();
        return;
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          body,
          stripeSignature,
          stripeWebhookSigningSecret()
        );
      } catch (err: any) {
        res.writeHead(400);
        res.write(
          JSON.stringify({ error: "Webhook signature verification failed" })
        );
        res.end();
        return;
      }

      log.info("received stripe webhook", { event: event.type, id: event.id });

      switch (event.type) {
        // Handle subscription creation/update
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;

          // Extract market center ID from metadata
          const marketCenterId = subscription.metadata?.marketCenterId;
          if (!marketCenterId) {
            log.error("No marketCenterId in subscription metadata", {
              subscriptionId: subscription.id,
            });

            // Try to respond with success anyway to prevent retries
            res.writeHead(200);
            res.write(
              JSON.stringify({ received: true, warning: "No marketCenterId" })
            );
            res.end();
            return;
          }

          const priceId = subscription.items.data[0].price.id;
          const planType = getPlanTypeFromPriceId(priceId);
          const planConfig =
            PRICING_PLANS[planType as keyof typeof PRICING_PLANS];

          // For trial subscriptions, use trial_end as the period end if period dates aren't set
          const periodStart = subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : new Date(); // Default to now if not set

          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now

          // Check if subscription exists
          const existingSub =
            await subscriptionRepository.findByStripeSubscriptionId(
              subscription.id
            );

          if (existingSub) {
            // Update existing subscription
            await subscriptionRepository.update(existingSub.id, {
              status: mapStripeStatus(subscription.status),
              planType,
              priceId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : null,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : null,
            });
          } else {
            // Create new subscription
            await subscriptionRepository.create({
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer as string,
              marketCenterId,
              status: mapStripeStatus(subscription.status),
              planType,
              priceId,
              includedSeats: planConfig.includedSeats,
              additionalSeats: 0, // Will be updated via portal
              seatPrice: planConfig.additionalSeatPrice,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : null,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : null,
              trialEnd: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : null,
              features: planConfig.features,
            });
          }

          break;
        }

        // Handle subscription deletion
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;

          const existingSub =
            await subscriptionRepository.findByStripeSubscriptionId(
              subscription.id
            );
          if (existingSub) {
            await subscriptionRepository.update(existingSub.id, {
              status: SubscriptionStatus.CANCELED,
              canceledAt: new Date(),
            });
          }
          break;
        }

        // Handle successful payment
        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;

          if (invoice.subscription) {
            const subscription =
              await subscriptionRepository.findByStripeSubscriptionId(
                invoice.subscription as string
              );

            if (subscription) {
              await db.exec`
                INSERT INTO subscription_invoices (
                  id, subscription_id, stripe_invoice_id, amount_due, amount_paid,
                  currency, status, line_items, period_start, period_end,
                  due_date, paid_at, created_at, updated_at
                )
                VALUES (
                  gen_random_uuid()::text, ${subscription.id}, ${invoice.id},
                  ${invoice.amount_due / 100}, ${invoice.amount_paid / 100},
                  ${invoice.currency}, ${InvoiceStatus.PAID},
                  ${JSON.stringify(invoice.lines.data)}::jsonb,
                  ${new Date(invoice.period_start * 1000)},
                  ${new Date(invoice.period_end * 1000)},
                  ${invoice.due_date ? new Date(invoice.due_date * 1000) : null},
                  NOW(), NOW(), NOW()
                )
              `;
            }
          }
          break;
        }

        // Handle failed payment
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;

          if (invoice.subscription) {
            const existingSub =
              await subscriptionRepository.findByStripeSubscriptionId(
                invoice.subscription as string
              );
            if (existingSub) {
              await subscriptionRepository.update(existingSub.id, {
                status: SubscriptionStatus.PAST_DUE,
              });
            }
          }
          break;
        }
      }

      res.writeHead(200);
      res.write(JSON.stringify({ received: true }));
      res.end();
    } catch (error: any) {
      log.error("stripe webhook error", error);
      res.writeHead(400);
      res.write(
        JSON.stringify({ error: error.message || "Webhook processing failed" })
      );
      res.end();
    }
  }
);

interface CreateCheckoutSessionParams {
  planType: "EARLY_BIRD" | "STANDARD";
  additionalSeats?: number;
  organizationName?: string; // Optional - for when creating a new organization
}

interface CreateCheckoutSessionResponse {
  url: string;
}

// Create a Stripe checkout session for new subscriptions
export const createCheckoutSession = api(
  {
    method: "POST",
    path: "/subscription/checkout",
    expose: true,
    auth: true,
  },
  async (
    params: CreateCheckoutSessionParams
  ): Promise<CreateCheckoutSessionResponse> => {
    const authData = getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("Not authenticated");
    }

    // Get user
    const user = await userRepository.findByClerkId(authData.userID);

    if (!user) {
      throw APIError.notFound("User not found");
    }

    let marketCenterId = user.marketCenterId;
    let marketCenterName: string | undefined;

    if (marketCenterId) {
      const mc = await db.queryRow<{ name: string }>`
        SELECT name FROM market_centers WHERE id = ${marketCenterId}
      `;
      marketCenterName = mc?.name;
    }

    // If user doesn't have a market center, create one for them
    if (!marketCenterId) {
      // Create a new market center for this user
      const newMarketCenter = await db.queryRow<{ id: string; name: string }>`
        INSERT INTO market_centers (id, name, created_at, updated_at)
        VALUES (
          gen_random_uuid()::text,
          ${params.organizationName || `${user.name || user.email}'s Organization`},
          NOW(), NOW()
        )
        RETURNING id, name
      `;

      if (newMarketCenter) {
        // Update user to be admin of this new market center
        await userRepository.update(user.id, {
          marketCenterId: newMarketCenter.id,
          role: "ADMIN", // Make them admin of their new organization
        });

        marketCenterId = newMarketCenter.id;
        marketCenterName = newMarketCenter.name;

        log.info("Created new market center for subscription", {
          userId: user.id,
          marketCenterId: newMarketCenter.id,
        });
      }
    } else {
      // Check if market center already has a subscription
      const existingSubscription =
        await subscriptionRepository.findByMarketCenterId(user?.marketCenterId);

      if (
        existingSubscription &&
        existingSubscription.status === SubscriptionStatus.ACTIVE
      ) {
        throw APIError.alreadyExists(
          "Your organization already has an active subscription"
        );
      }

      // Only admins can create subscriptions for existing market centers
      if (user.role !== "ADMIN") {
        throw APIError.permissionDenied(
          "Only organization admins can manage subscriptions"
        );
      }
    }

    const plan = PRICING_PLANS[params.planType];

    // Get or create Stripe customer
    let stripeCustomerId: string;

    if (!marketCenterId) {
      throw APIError.invalidArgument("Market center ID is required");
    }

    // Check if this market center already has a Stripe customer
    const existingSubscription =
      await subscriptionRepository.findByMarketCenterId(marketCenterId);

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        name: marketCenterName || user.email,
        email: user.email,
        metadata: {
          marketCenterId,
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ];

    // Add additional seats if requested
    if (params.additionalSeats && params.additionalSeats > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Additional Seats (${params.additionalSeats} seats)`,
            description: `Extra seats at $${plan.additionalSeatPrice}/seat/month`,
          },
          recurring: {
            interval: "month",
          },
          unit_amount: plan.additionalSeatPrice * 100, // Convert to cents
        },
        quantity: params.additionalSeats,
      });
    }

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "auto",
      customer: stripeCustomerId,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${frontendUrl()}/dashboard`,
      cancel_url: `${frontendUrl()}/dashboard/subscription?canceled=true`,
      subscription_data: {
        metadata: {
          marketCenterId, // Use the marketCenterId we determined earlier
          additionalSeats: params.additionalSeats?.toString() || "0",
        },
        trial_period_days: 14, // 14-day trial
      },
    });

    return { url: session.url || "" };
  }
);

interface CreatePortalSessionResponse {
  url: string;
}

// Create a Stripe customer portal session for managing subscriptions
export const createPortalSession = api(
  {
    method: "POST",
    path: "/subscription/portal",
    expose: true,
    auth: true,
  },
  async (): Promise<CreatePortalSessionResponse> => {
    const authData = getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("Not authenticated");
    }

    // Get user's market center and subscription
    const user = await userRepository.findByClerkId(authData.userID);

    if (!user || !user.marketCenterId) {
      throw APIError.notFound("User or market center not found");
    }

    const subscription = await subscriptionRepository.findByMarketCenterId(
      user.marketCenterId
    );

    if (!subscription) {
      throw APIError.notFound("No subscription found");
    }

    // Only admins can access the portal
    if (user.role !== "ADMIN") {
      throw APIError.permissionDenied("Only admins can manage subscriptions");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl()}/dashboard/subscription`,
    });

    return { url: session.url };
  }
);

interface GetSubscriptionResponse {
  id: string;
  status: SubscriptionStatus;
  planType: SubscriptionPlan;
  includedSeats: number;
  additionalSeats: number;
  totalSeats: number;
  usedSeats: number;
  agentCount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt: Date | null;
  trialEnd: Date | null;
  features: any;
}

// Get current subscription details
export const getSubscription = api(
  {
    method: "GET",
    path: "/subscription/current",
    expose: true,
    auth: true,
  },
  async (): Promise<GetSubscriptionResponse> => {
    // Use getUserContext which handles Clerk ID lookup with email fallback
    const userContext = await getUserContext();

    if (!userContext?.marketCenterId) {
      throw APIError.notFound("User or market center not found");
    }

    const marketCenterId =
      await subscriptionRepository.findPrimaryMarketCenterId(
        userContext.marketCenterId
      );

    if (!marketCenterId) {
      throw APIError.notFound("No market center found for subscription");
    }

    const result =
      await subscriptionRepository.findByMarketCenterIdWithUserCount(
        marketCenterId
      );

    if (!result) {
      throw APIError.notFound("No subscription found");
    }

    const { subscription, activeUserCount, agentCount } = result;

    return {
      id: subscription.id,
      status: subscription.status,
      planType: subscription.planType,
      includedSeats: subscription.includedSeats,
      additionalSeats: subscription.additionalSeats,
      totalSeats: subscription.includedSeats + subscription.additionalSeats,
      usedSeats: activeUserCount,
      agentCount: agentCount,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAt: subscription.cancelAt,
      trialEnd: subscription.trialEnd,
      features: subscription.features,
    };
  }
);

interface UpdateSeatsParams {
  additionalSeats: number;
}

// Update additional seats for the subscription
export const updateSeats = api(
  {
    method: "PUT",
    path: "/subscription/seats",
    expose: true,
    auth: true,
  },
  async (params: UpdateSeatsParams): Promise<{ success: boolean }> => {
    const authData = getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("Not authenticated");
    }

    // Get user and verify admin
    const user = await userRepository.findByClerkId(authData.userID);

    if (!user || !user.marketCenterId) {
      throw APIError.notFound("User or market center not found");
    }

    const subscription = await subscriptionRepository.findByMarketCenterId(
      user.marketCenterId
    );

    if (!subscription) {
      throw APIError.notFound("No subscription found");
    }

    if (user.role !== "ADMIN") {
      throw APIError.permissionDenied("Only admins can update seats");
    }

    // Only count non-AGENT users - agents are free and don't consume paid seats
    const currentUsers = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count
      FROM users
      WHERE market_center_id = ${user.marketCenterId} AND is_active = true AND role != 'AGENT'
    `;

    const currentUsersCount = currentUsers?.count || 0;
    const newTotalSeats = subscription.includedSeats + params.additionalSeats;

    if (newTotalSeats < currentUsersCount) {
      throw APIError.invalidArgument(
        `Cannot reduce seats below current paid user count (${currentUsersCount})`
      );
    }

    // Update in Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Find the additional seats item if it exists
    const seatItem = stripeSubscription.items.data.find(
      (item) => item.price.product === "additional_seats" // You'll need to set this up in Stripe
    );

    if (seatItem) {
      // Update existing seat item
      await stripe.subscriptionItems.update(seatItem.id, {
        quantity: params.additionalSeats,
      });
    } else if (params.additionalSeats > 0) {
      // Add new seat item
      await stripe.subscriptionItems.create({
        subscription: subscription.stripeSubscriptionId,
        price_data: {
          currency: "usd",
          product: "additional_seats",
          recurring: {
            interval: "month",
          },
          unit_amount: subscription.seatPrice * 100,
        },
        quantity: params.additionalSeats,
      });
    }

    // Update in database
    await subscriptionRepository.update(subscription.id, {
      additionalSeats: params.additionalSeats,
    });

    return { success: true };
  }
);

// Check if user can perform action based on subscription
export async function checkSubscriptionLimit(
  marketCenterId: string,
  feature: "users" | "tickets" | "categories"
): Promise<boolean> {
  const subscription =
    await subscriptionRepository.findByMarketCenterId(marketCenterId);

  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return false;
  }

  const features = subscription.features as any;

  switch (feature) {
    case "users":
      const totalSeats =
        subscription.includedSeats + subscription.additionalSeats;
      const userCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count
        FROM users
        WHERE market_center_id = ${marketCenterId} AND is_active = true
      `;
      return (userCount?.count || 0) < totalSeats;

    case "tickets":
      const maxTickets = features.maxTicketsPerMonth;
      if (maxTickets === -1) return true; // Unlimited

      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const currentMonthUsage = await db.queryRow<{ tickets_created: number }>`
        SELECT tickets_created
        FROM subscription_usage
        WHERE subscription_id = ${subscription.id}
          AND month >= ${monthStart}
        LIMIT 1
      `;
      return (
        !currentMonthUsage || currentMonthUsage.tickets_created < maxTickets
      );

    case "categories":
      const maxCategories = features.customCategories;
      if (maxCategories === -1) return true; // Unlimited

      const categoryCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count
        FROM ticket_categories
        WHERE market_center_id = ${marketCenterId}
      `;
      return (categoryCount?.count || 0) < maxCategories;

    default:
      return false;
  }
}

// Track usage for billing
export async function trackUsage(
  marketCenterId: string,
  metric: "tickets" | "storage"
): Promise<void> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const subscription =
    await subscriptionRepository.findByMarketCenterId(marketCenterId);

  if (!subscription) return;

  // Check if usage record exists
  const existingUsage = await db.queryRow<{ id: string }>`
    SELECT id
    FROM subscription_usage
    WHERE subscription_id = ${subscription.id}
      AND month = ${monthStart}
  `;

  if (existingUsage) {
    // Update existing usage
    if (metric === "tickets") {
      await db.exec`
        UPDATE subscription_usage
        SET tickets_created = tickets_created + 1, updated_at = NOW()
        WHERE id = ${existingUsage.id}
      `;
    } else if (metric === "storage") {
      await db.exec`
        UPDATE subscription_usage
        SET storage_used_mb = storage_used_mb + 1, updated_at = NOW()
        WHERE id = ${existingUsage.id}
      `;
    }
  } else {
    // Create new usage record
    await db.exec`
      INSERT INTO subscription_usage (
        id, subscription_id, month, active_seats, tickets_created,
        storage_used_mb, created_at, updated_at
      )
      VALUES (
        gen_random_uuid()::text, ${subscription.id}, ${monthStart}, 0,
        ${metric === "tickets" ? 1 : 0}, ${metric === "storage" ? 1 : 0},
        NOW(), NOW()
      )
    `;
  }
}
