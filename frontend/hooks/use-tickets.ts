import { getAccessToken } from "@auth0/nextjs-auth0";
import { API_BASE } from "@/lib/api/utils";
import { TicketsResponse, UserRole } from "@/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const getAuth0AccessToken = async () => {
  if (process.env.NODE_ENV === "development") return "local";
  return await getAccessToken();
};

type AgentSearchTicketsQuery = {
  queryParams: URLSearchParams;
  agentTicketsQueryKey: readonly [string, Record<string, string>];
  userId?: string;
};

export function useFetchAgentTickets({
  queryParams,
  agentTicketsQueryKey,
  userId,
}: AgentSearchTicketsQuery) {
  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: agentTicketsQueryKey,
    queryFn: async () => {
      if (!userId) {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
      try {
        const accessToken =
          process.env.NODE_ENV === "development"
            ? "local"
            : await getAccessToken();
        const response = await fetch(
          `/api/tickets/search?assigneeId=${userId}${queryParams ? `&${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
    enabled: !!userId,
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
  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: staffTicketsQueryKey,
    queryFn: async () => {
      try {
        if (!marketCenterId || !userId)
          return { tickets: [], total: 0 } as TicketsResponse;
        const accessToken = await getAuth0AccessToken();
        const response = await fetch(
          `/api/tickets/search?${marketCenterId ? `marketCenterId=${marketCenterId}&` : ""}${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
    enabled: !!marketCenterId || !!userId,
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
  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: adminTicketsQueryKey,
    queryFn: async (): Promise<TicketsResponse> => {
      if (!role || role !== "ADMIN") {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
      try {
        const accessToken = await getAuth0AccessToken();
        const res = await fetch(
          `/api/tickets/search?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
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
