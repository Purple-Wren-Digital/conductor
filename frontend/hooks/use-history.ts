import { API_BASE } from "@/lib/api/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

type FetchHistoryType = {
  id?: string;
  queryKey: readonly [string, string | undefined, Record<string, string>];
  queryParams: URLSearchParams;
};

// USER HISTORY
export function useFetchUserHistory({
  id,
  queryKey,
  queryParams,
}: FetchHistoryType) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        if (!id) {
          throw new Error("Missing user id");
        }

        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/users/${id}/history${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch user history");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching user history:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// USER TICKET HISTORY
export function useFetchUserTicketHistory({
  id,
  queryKey,
  queryParams,
}: FetchHistoryType) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        if (!id) {
          throw new Error("Missing user id");
        }
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/users/${id}/history/tickets${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok)
          throw new Error("Failed to fetch user ticket history");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching user ticket history:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// TICKET HISTORY
export function useFetchTicketHistory({
  id,
  queryKey,
  queryParams,
  showHistoryModal,
}: {
  id?: string;
  queryKey: readonly [string, string | undefined, Record<string, string>];
  queryParams: URLSearchParams;
  showHistoryModal: boolean;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        if (!id) {
          throw new Error("Missing ticket id");
        }

        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/tickets/${id}/history${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch ticket history");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching ticket history:", error);
        throw error;
      }
    },
    enabled: !!id && !!showHistoryModal,
  });
}

// MARKET CENTER HISTORY
export function useFetchMarketCenterHistory({
  id,
  queryKey,
  queryParams,
}: FetchHistoryType) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        if (!id) {
          throw new Error("Missing market center id");
        }
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(
          `${API_BASE}/marketCenter/${id}/history${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch market center history");
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching market center history:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}
