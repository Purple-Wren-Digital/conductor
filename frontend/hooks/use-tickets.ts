import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import type {
  Survey,
  TicketsResponse,
  TicketStatus,
  UserRole,
} from "@/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const ticketsRefetchInterval = 300000; // 5 minutes in milliseconds

// AGENT QUERIES
export function useFetchAgentTickets({
  queryParams,
  agentTicketsQueryKey,
  hydrated,
}: {
  queryParams: URLSearchParams;
  agentTicketsQueryKey: readonly [string, Record<string, string>];
  hydrated: boolean;
}) {
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
      } catch {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    enabled: !!hydrated,
    refetchInterval: ticketsRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

// STAFF QUERIES
export function useFetchStaffTickets({
  queryParams,
  staffTicketsQueryKey,
  hydrated,
}: {
  queryParams: URLSearchParams;
  staffTicketsQueryKey: readonly [string, Record<string, string>];
  hydrated: boolean;
}) {
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
          `${API_BASE}/tickets/search${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching staff tickets: ", errorData);
          throw new Error(errorData?.message || "Failed to fetch tickets");
        }
        const data = await response.json();
        return data;
      } catch {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    enabled: !!hydrated,
    refetchInterval: ticketsRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

// ADMIN QUERIES
export function useFetchAdminTickets({
  role,
  adminTicketsQueryKey,
  queryParams,
  hydrated,
}: {
  role: UserRole | undefined;
  adminTicketsQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  hydrated: boolean;
}) {
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
          `${API_BASE}/tickets/search${queryParams ? `?${queryParams.toString()}` : ""}`,
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
      } catch {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    enabled: role === "ADMIN" && !!hydrated,
    refetchInterval: ticketsRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useListAdminTickets({
  role,
  adminTicketsQueryKey,
  queryParams,
}: {
  role: UserRole | undefined;
  adminTicketsQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
}) {
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
          `${API_BASE}/tickets${queryParams ? `?${queryParams.toString()}` : ""}`,
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
      } catch {
        return { tickets: [], total: 0 } as TicketsResponse;
      }
    },
    enabled: role === "ADMIN",
    placeholderData: keepPreviousData,
    refetchInterval: ticketsRefetchInterval,
  });
}

// SURVEYS + RATINGS QUERIES
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
        if (!data || !data?.survey) {
          throw new Error("No survey data found");
        }
        return data.survey as Survey;
      } catch (error) {
        throw error;
      }
    },
    enabled: ticketStatus === "RESOLVED" && !!surveyId,
    placeholderData: null,
  });
}

export function useListAllRatings(
  queryKey: readonly [string, string],
  role?: string
) {
  const { getToken } = useAuth();

  return useQuery<any, Error, any>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!role || role !== "ADMIN") {
        throw new Error("You do not have permission to access this data");
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const res = await fetch(`${API_BASE}/surveys/ratings/all`, {
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
        return data;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!role && role === "ADMIN",
    placeholderData: null,
  });
}

export function useFetchRatingsByAssignee(
  queryKey: readonly [string, string],
  shouldFetchRatings: boolean,
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
        if (!res.ok) {
          throw new Error("Failed to fetch survey data");
        }
        const data = await res.json();
        return data;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!shouldFetchRatings && !!assigneeId,
    placeholderData: null,
  });
}

export function useFetchRatingsByMarketCenter(
  queryKeyRatingsByMarketCenter: string[],
  marketCenterId?: string
) {
  const { getToken } = useAuth();

  return useQuery<any, Error, any>({
    queryKey: queryKeyRatingsByMarketCenter,
    queryFn: async () => {
      if (!marketCenterId) {
        throw new Error("No market center ID provided");
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const res = await fetch(
          `${API_BASE}/surveys/ratings/byMarketCenter/${marketCenterId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) {
          throw new Error("Failed to fetch survey data");
        }
        const data = await res.json();
        return data;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!marketCenterId,
    placeholderData: null,
  });
}
