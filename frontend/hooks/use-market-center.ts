import { API_BASE } from "@/lib/api/utils";
import { MarketCenter, PrismaUser, UserRole } from "@/lib/types";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

// GET ALL MARKET CENTERS
export function useFetchAllMarketCenters(role: UserRole | undefined) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["all-market-centers"],
    queryFn: async () => {
      if (!role || role === "AGENT") {
        throw new Error(
          "Only Admin and Staff users can view all market centers"
        );
      }
      if (!clerkUser?.id) throw new Error("Not authenticated");

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(`${API_BASE}/marketCenters/search`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return { marketCenters: [] };

      const data = await response.json();
      return { marketCenters: data?.marketCenters };
    },
    enabled: !!role && role !== "AGENT" && !!clerkUser?.id,
  });
}

type SearchMarketCentersType = {
  role?: UserRole;
  queryParams: URLSearchParams;
  marketCentersQueryKey: readonly [
    "market-center-search",
    Record<string, string>,
  ];
};

// GET ALL MARKET CENTERS
export function useSearchMarketCenters({
  role,
  queryParams,
  marketCentersQueryKey,
}: SearchMarketCentersType) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  //pass in role and do not fetch if not admin!
  return useQuery({
    queryKey: marketCentersQueryKey,
    queryFn: async () => {
      if (!role || role === "AGENT") {
        throw new Error(
          "Only Admin and Staff users can view all market centers"
        );
      }
      if (!clerkUser?.id) throw new Error("Not authenticated");

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(
        `${API_BASE}/marketCenters/search?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) return { marketCenters: [] };

      const data = await response.json();

      return {
        marketCenters: data?.marketCenters as MarketCenter[],
        total: data?.total,
      };
    },
    enabled: role && role === "ADMIN" && !!clerkUser?.id,
  });
}

// GET MARKET CENTER BY ID
export function useFetchMarketCenter(
  role: UserRole | undefined,
  marketCenterId?: string
) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["get-market-center", marketCenterId],
    queryFn: async () => {
      if (!role || role === "AGENT") {
        throw new Error("Only Admin and Staff users can fetch a market center");
      }
      if (!marketCenterId) {
        throw new Error("No Market Center ID");
      }
      if (!clerkUser?.id) throw new Error("Not authenticated");

      try {
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/marketCenters/${marketCenterId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response || !response.ok)
          throw new Error("Failed to market center");
        const data = await response.json();
        return data?.marketCenter;
      } catch (error) {
        console.error("Failed to fetch market center - ", error);
        return null;
      }
    },
    enabled: !!marketCenterId && role && role !== "AGENT" && !!clerkUser?.id,
  });
}

export function useFetchMarketCenterCategories(marketCenterId?: string) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["get-market-center-categories", marketCenterId],
    queryFn: async () => {
      if (!clerkUser?.id) throw new Error("Not authenticated");

      try {
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/marketCenters/ticketCategories${marketCenterId ? `?marketCenterId=${marketCenterId}` : ""}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response || !response.ok)
          throw new Error(
            "Failed to fetch ticket categories for market center"
          );
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch market center - ", error);
        return null;
      }
    },
    enabled: !!marketCenterId && !!clerkUser?.id,
  });
}

type MarketCenterSearchTickets = {
  marketCenterId?: string;
  queryParams: URLSearchParams | null;
  queryKeyParams: Record<string, string> | null;
};
// STAFF: GET TICKETS WITHIN MARKET CENTER
export function useFetchMarketCenterTickets({
  queryParams,
  marketCenterId,
}: MarketCenterSearchTickets) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["market-center-tickets", marketCenterId, queryParams],
    queryFn: async () => {
      if (!marketCenterId || !clerkUser?.id) {
        return [];
      }

      try {
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/tickets/search?marketCenterId=${marketCenterId}&${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response || !response.ok)
          throw new Error("Failed to fetch tickets");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Staff Dashboard - Failed to fetch team tickets", error);
        return [];
      }
    },
    enabled: !!marketCenterId && !!clerkUser?.id,
  });
}

type UpdateMarketCenterProps = {
  role: UserRole | undefined;
  marketCenterId?: string;
  name?: string;
  users?: PrismaUser[];
};

// UPDATE MARKET CENTER
export function useUpdateMarketCenter({
  role,
  marketCenterId,
  name,
  users,
}: UpdateMarketCenterProps) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["get-market-center", marketCenterId],
    queryFn: async () => {
      if (!role || role === "AGENT") {
        throw new Error(
          "Only Admin and Staff users can update a market center"
        );
      }
      if (!marketCenterId || !users || !name) {
        throw new Error("Missing data");
      }
      if (!clerkUser?.id) throw new Error("Not authenticated");

      try {
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/marketCenters/${marketCenterId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name,
              users: users,
            }),
          }
        );
        if (!response || !response.ok)
          throw new Error("Failed to update market center");
        const data = await response.json();
        return await data?.marketCenter;
      } catch (error) {
        console.error("Failed to update market center - ", error);
        return null;
      }
    },
    enabled: !!marketCenterId && role && role !== "AGENT" && !!clerkUser?.id,
  });
}
