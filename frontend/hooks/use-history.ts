// import { API_BASE } from "@/lib/api/utils";
import { API_BASE } from "@/lib/api/utils";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useQuery } from "@tanstack/react-query";

const getAuth0AccessToken = async () => {
  if (process.env.NODE_ENV === "development") return "local";
  return await getAccessToken();
};

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
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        const accessToken = await getAuth0AccessToken();
        if (!id) {
          throw new Error("Missing user id");
        }
        const response = await fetch(
          `/api/users/${id}/history${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        const accessToken = await getAuth0AccessToken();
        if (!id) {
          throw new Error("Missing user id");
        }
        const response = await fetch(
          `/api/users/${id}/history/tickets${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
}: FetchHistoryType) {
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        const accessToken = await getAuth0AccessToken();
        if (!id) {
          throw new Error("Missing ticket id");
        }
        const response = await fetch(
          `/api/tickets/${id}/history${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
    enabled: !!id,
  });
}

// MARKET CENTER HISTORY
export function useFetchMarketCenterHistory({
  id,
  queryKey,
  queryParams,
}: FetchHistoryType) {
  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      try {
        const accessToken = await getAuth0AccessToken();
        if (!id) {
          throw new Error("Missing market center id");
        }
        const response = await fetch(
          `${API_BASE}/marketCenter/${id}/history${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch market center history");
        }
        const data = await response.json();
        console.log("MARKET CENTER HISTORY DATA", data);
        return data;
      } catch (error) {
        console.error("Error fetching market center history:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}
