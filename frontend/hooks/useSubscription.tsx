import { useQuery } from "@tanstack/react-query";
import { useFetchWithAuth } from "@/lib/api/fetch-with-auth";

export interface SubscriptionData {
  id: string;
  status:
    | "ACTIVE"
    | "CANCELED"
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "PAST_DUE"
    | "PAUSED"
    | "TRIALING"
    | "UNPAID";
  planType: "STARTER" | "TEAM" | "BUSINESS" | "ENTERPRISE";
  includedSeats: number;
  additionalSeats: number;
  totalSeats: number;
  usedSeats: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt: Date | null;
  trialEnd: Date | null;
  features: {
    maxTicketsPerMonth: number;
    prioritySupport: boolean;
    customCategories: number;
    apiAccess: boolean;
    advancedReporting: boolean;
  };
}

export function useSubscription() {
  const fetchWithAuth = useFetchWithAuth();

  return useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetchWithAuth("/subscription/current");
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No subscription
        }
        throw new Error("Failed to fetch subscription");
      }
      // console.log("Subscription Response:", response);
      const data = await response.json();
      // console.log("Subscription Data:", data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useCanPerformAction(
  action: "createTicket" | "addUser" | "addCategory"
) {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading)
    return { canPerform: false, reason: "Loading...", isLoading: true };

  if (!subscription) {
    return {
      canPerform: false,
      reason: "No active subscription. Please subscribe to continue.",
      isLoading: false,
    };
  }

  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") {
    return {
      canPerform: false,
      reason: `Subscription is ${subscription.status}. Please update your billing.`,
      isLoading: false,
    };
  }

  switch (action) {
    case "createTicket":
      if (subscription.features.maxTicketsPerMonth === -1) {
        return { canPerform: true, reason: null, isLoading: false };
      }
      // You'd need to fetch current usage here
      return { canPerform: true, reason: null, isLoading: false };

    case "addUser":
      if (subscription.usedSeats >= subscription.totalSeats) {
        return {
          canPerform: false,
          reason: `User limit reached (${subscription.usedSeats}/${subscription.totalSeats} seats). Please upgrade or purchase additional seats.`,
          isLoading: false,
        };
      }
      return { canPerform: true, reason: null, isLoading: false };

    case "addCategory":
      if (subscription.features.customCategories === -1) {
        return { canPerform: true, reason: null, isLoading: false };
      }
      // You'd need to fetch current category count here
      return { canPerform: true, reason: null, isLoading: false };

    default:
      return { canPerform: false, reason: "Unknown action", isLoading: false };
  }
}

/**
 * Check if the user has an Enterprise subscription
 * Only Enterprise users can create multiple market centers
 */
export function useIsEnterprise() {
  const { data: subscription, isLoading } = useSubscription();
  console.log("Subscription Data:", subscription);

  return {
    isEnterprise: subscription?.planType === "ENTERPRISE",
    isStandard:
      subscription?.planType === "STARTER" ||
      subscription?.planType === "TEAM" ||
      subscription?.planType === "BUSINESS",
    isLoading,
  };
}
