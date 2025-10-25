import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { TicketsResponse, UserRole } from "@/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
  const { user: clerkUser } = useUser();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: agentTicketsQueryKey,
    queryFn: async () => {
      if (!userId || !clerkUser?.id) {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
      try {
        const response = await fetch(
          `${API_BASE}/tickets/search?assigneeId=${userId}${queryParams ? `&${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${clerkUser.id}`,
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
    enabled: !!userId && !!clerkUser?.id,
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
  const { user: clerkUser } = useUser();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: staffTicketsQueryKey,
    queryFn: async () => {
      try {
        if (!marketCenterId || !userId || !clerkUser?.id)
          return { tickets: [], total: 0 } as TicketsResponse;
        const response = await fetch(
          `${API_BASE}/tickets/search?${marketCenterId ? `marketCenterId=${marketCenterId}&` : ""}${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${clerkUser.id}`,
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
    enabled: (!!marketCenterId || !!userId) && !!clerkUser?.id,
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
  const { user: clerkUser } = useUser();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: adminTicketsQueryKey,
    queryFn: async (): Promise<TicketsResponse> => {
      if (!role || role !== "ADMIN" || !clerkUser?.id) {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
      try {
        const res = await fetch(
          `${API_BASE}/tickets/search?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${clerkUser.id}` },
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
    enabled: role === "ADMIN" && !!clerkUser?.id,
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
}
