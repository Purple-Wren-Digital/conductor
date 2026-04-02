export const plans = [
  {
    name: "Early Bird",
    planType: "EARLY_BIRD" as const,
    description: "Limited time pricing for early adopters",
    monthlyPrice: 399,
    includedSeats: 50,
    additionalSeatPrice: 6,
    features: [
      "Single market center",
      "Unlimited team members",
      "Unlimited tickets",
      "Unlimited categories",
      "Priority support",
      "Full API access",
      "Advanced analytics & reporting",
    ],
    highlights: {
      maxTicketsPerMonth: -1, // Unlimited
      prioritySupport: true,
      customCategories: -1, // Unlimited
      apiAccess: true,
      advancedReporting: true,
    },
    stripeProductId: "prod_UGP13ZOXGBR5t1",
    stripePriceId: "price_1THsCy3o7cHR3Cbv9L9iBuNk",
    popular: true,
  },
  {
    name: "Standard",
    planType: "STANDARD" as const,
    description: "Full-featured plan for your market center",
    monthlyPrice: 499,
    includedSeats: 50,
    additionalSeatPrice: 6,
    features: [
      "Single market center",
      "Unlimited team members",
      "Unlimited tickets",
      "Unlimited categories",
      "Priority support",
      "Full API access",
      "Advanced analytics & reporting",
    ],
    highlights: {
      maxTicketsPerMonth: -1, // Unlimited
      prioritySupport: true,
      customCategories: -1, // Unlimited
      apiAccess: true,
      advancedReporting: true,
    },
    stripeProductId: "prod_UFzgUEcj5Unm7n",
    stripePriceId: "price_1THThI3o7cHR3CbvxyLObRXp",
  },
  {
    name: "Enterprise",
    planType: "ENTERPRISE" as const,

    description: "For organizations with multiple market centers",
    monthlyPrice: null, // Contact for pricing
    includedSeats: null, // Unlimited
    additionalSeatPrice: 0,
    features: [
      "Multiple market centers",
      "Unlimited team members",
      "Unlimited tickets",
      "Unlimited categories",
      "24/7 dedicated support",
      "Full API access",
      "Advanced analytics & reporting",
      "Custom integrations",
      "Dedicated account manager",
    ],
    highlights: {
      maxTicketsPerMonth: -1, // Unlimited
      prioritySupport: true,
      customCategories: -1, // Unlimited
      apiAccess: true,
      advancedReporting: true,
    },
    stripeProductId: "prod_UFzi1TDzaRv17B",
    stripePriceId: "price_1THTj83o7cHR3CbvNxlmxmyb",
  },
] as const;

export type PlanName = (typeof plans)[number]["name"];

export function getPlanByName(name: string) {
  return plans.find((plan) => plan.name.toLowerCase() === name.toLowerCase());
}

export function getPlanByPriceId(priceId: string) {
  return plans.find((plan) => plan.stripePriceId === priceId);
}
