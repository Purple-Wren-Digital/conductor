import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import type {
  Survey,
  TicketsResponse,
  TicketStatus,
  UserRole,
} from "@/lib/types";
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
  queryParams: URLSearchParams;
  staffTicketsQueryKey: readonly [string, Record<string, string>];
};

export function useFetchStaffTickets({
  queryParams,
  staffTicketsQueryKey,
}: StaffSearchTicketsQuery) {
  const { getToken } = useAuth();

  return useQuery<TicketsResponse, Error, TicketsResponse>({
    queryKey: staffTicketsQueryKey,
    queryFn: async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const response = await fetch(
          `${API_BASE}/tickets/search?${queryParams ? `${queryParams.toString()}` : ""}`,
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
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
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

export function useListAdminTickets({
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
          `${API_BASE}/tickets?${queryParams.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
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

export function useFetchTicketSurveyResults(
  ticketStatus?: TicketStatus,
  surveyId?: string
) {
  const { getToken } = useAuth();

  return useQuery<any, Error, any>({
    queryKey: ["ticket-survey", surveyId],
    queryFn: async () => {
      if (!surveyId) {
        throw new Error("No survey ID provided");
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const res = await fetch(`${API_BASE}/surveys/${surveyId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch survey data");
        }
        const data = await res.json();
        // console.log("Fetched survey data:", data);
        if (!data || !data?.survey) {
          throw new Error("No survey data found");
        }
        return data.survey as Survey;
      } catch (error) {
        console.error("Error fetching ticket survey results:", error);
        throw error;
      }
    },
    enabled: ticketStatus === "RESOLVED" && !!surveyId,
    placeholderData: null,
  });
}

export function useFetchRatingsByAssignee(
  queryKey: readonly [string, string],
  assigneeId?: string
) {
  const { getToken } = useAuth();

  return useQuery<any, Error, any>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!assigneeId) {
        throw new Error("No assignee ID provided");
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const res = await fetch(
          `${API_BASE}/surveys/ratings/byAssignee/${assigneeId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        console.log("useFetchRatingsByAssignee - response", res);
        if (!res.ok) {
          throw new Error("Failed to fetch survey data");
        }
        const data = await res.json();
        console.log("useFetchRatingsByAssignee - data", data);
        return data;
      } catch (error) {
        console.error("Error fetching ticket survey results:", error);
        throw error;
      }
    },
    enabled: !!assigneeId,
    placeholderData: null,
  });
}
