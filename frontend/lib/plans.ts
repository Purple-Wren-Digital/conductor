export const plans = [
	{
		name: "Starter",
		description: "Perfect for small teams getting started",
		monthlyPrice: 50,
		includedSeats: 5,
		additionalSeatPrice: 10,
		features: [
			"Up to 5 team members",
			"100 tickets per month",
			"5 custom categories",
			"Email support",
			"Basic reporting",
		],
		highlights: {
			maxTicketsPerMonth: 100,
			prioritySupport: false,
			customCategories: 5,
			apiAccess: false,
			advancedReporting: false,
		},
		stripeProductId: "prod_RsP4IJeES8hBDu", // Keep your existing IDs for now
		stripePriceId: "price_1SX2iKBTrvJyFPSJvvyUAjUR",
	},
	{
		name: "Team",
		description: "For growing teams that need more features",
		monthlyPrice: 150,
		includedSeats: 15,
		additionalSeatPrice: 8,
		features: [
			"Up to 15 team members",
			"500 tickets per month",
			"20 custom categories",
			"Priority support",
			"API access",
			"Advanced reporting",
		],
		highlights: {
			maxTicketsPerMonth: 500,
			prioritySupport: true,
			customCategories: 20,
			apiAccess: true,
			advancedReporting: false,
		},
		stripeProductId: "prod_RsP2eL9TWCTqFR", // Keep your existing IDs for now
		stripePriceId: "price_1SXTrABTrvJyFPSJGkmOeY7z",
		popular: true,
	},
	{
		name: "Business",
		description: "For larger teams with advanced needs",
		monthlyPrice: 400,
		includedSeats: 50,
		additionalSeatPrice: 6,
		features: [
			"Up to 50 team members",
			"Unlimited tickets",
			"Unlimited categories",
			"24/7 priority support",
			"Full API access",
			"Advanced analytics & reporting",
			"Custom integrations",
		],
		highlights: {
			maxTicketsPerMonth: -1, // Unlimited
			prioritySupport: true,
			customCategories: -1, // Unlimited
			apiAccess: true,
			advancedReporting: true,
		},
		stripeProductId: "prod_RsP19mrNfkIeXG", // Keep your existing IDs for now
		stripePriceId: "price_1SXTrSBTrvJyFPSJF3xW6den",
	},
] as const;

export type PlanName = typeof plans[number]["name"];

export function getPlanByName(name: string) {
	return plans.find(plan => plan.name.toLowerCase() === name.toLowerCase());
}

export function getPlanByPriceId(priceId: string) {
	return plans.find(plan => plan.stripePriceId === priceId);
}
