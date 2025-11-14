import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { TicketsResponse, UserRole } from "@/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

type AgentSearchTicketsQuery = {
  queryParams: URLSearchParams;
  agentTicketsQueryKey: readonly [string, Record<string, string>];
};

export function useFetchAgentTickets({
  queryParams,
  agentTicketsQueryKey,
}: AgentSearchTicketsQuery) {
  const { getToken } = useAuth();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: agentTicketsQueryKey,
    queryFn: async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const response = await fetch(
          `${API_BASE}/tickets/search${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch tickets");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Agent - Failed to fetch user tickets", error);
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
}

type StaffSearchTicketsQuery = {
  marketCenterId?: string;
  userId?: string;
  queryParams: URLSearchParams;
  staffTicketsQueryKey: readonly [string, Record<string, string>];
};

export function useFetchStaffTickets({
  marketCenterId,
  userId,
  queryParams,
  staffTicketsQueryKey,
}: StaffSearchTicketsQuery) {
  const { getToken } = useAuth();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: staffTicketsQueryKey,
    queryFn: async () => {
      try {
        if (!userId) return { tickets: [], total: 0 } as TicketsResponse;

        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const response = await fetch(
          `${API_BASE}/tickets/search?${marketCenterId ? `&marketCenterId=${marketCenterId}` : ""}${queryParams.toString()}`,
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
        console.error("StaffDashboard - Failed to fetch team tickets", error);
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
}

type AdminSearchTicketsQuery = {
  role: UserRole | undefined;
  adminTicketsQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
};

export function useFetchAdminTickets({
  role,
  adminTicketsQueryKey,
  queryParams,
}: AdminSearchTicketsQuery) {
  const { getToken } = useAuth();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: adminTicketsQueryKey,
    queryFn: async (): Promise<TicketsResponse> => {
      if (!role || role !== "ADMIN") {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch(
          `${API_BASE}/tickets/search?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Admin - Failed to fetch all tickets", error);
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    enabled: role === "ADMIN",
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
}
