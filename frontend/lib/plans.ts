export const plans = [
  {
    name: "Early Bird",
    planType: "BUSINESS" as const,
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
    stripeProductId: "prod_RsP4IJeES8hBDu", // Update with actual Stripe IDs
    stripePriceId: "price_1SX2iKBTrvJyFPSJvvyUAjUR",
    popular: true,
  },
  {
    name: "Standard",
    planType: "BUSINESS" as const,
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
    stripeProductId: "prod_RsP2eL9TWCTqFR", // Update with actual Stripe IDs
    stripePriceId: "price_1SXTrABTrvJyFPSJGkmOeY7z",
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
    stripeProductId: "prod_RsP19mrNfkIeXG", // Update with actual Stripe IDs
    stripePriceId: "price_1SXTrSBTrvJyFPSJF3xW6den",
  },
] as const;

export type PlanName = (typeof plans)[number]["name"];

export function getPlanByName(name: string) {
  return plans.find((plan) => plan.name.toLowerCase() === name.toLowerCase());
}

export function getPlanByPriceId(priceId: string) {
  return plans.find((plan) => plan.stripePriceId === priceId);
}
