import { getAccessToken } from "@auth0/nextjs-auth0";
import { API_BASE } from "@/lib/api/utils";
import { TicketsResponse } from "@/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const getAuth0AccessToken = async () => {
  if (process.env.NODE_ENV === "development") return "local";
  return await getAccessToken();
};

// TICKET DASHBOARD
type SearchTicketsQuery = {
  ticketsQueryKey: readonly ["tickets", Record<string, string>];
  queryParams: URLSearchParams;
};

export function useSearchTickets({
  ticketsQueryKey,
  queryParams,
}: SearchTicketsQuery) {
  return useQuery<
    TicketsResponse,
    Error,
    TicketsResponse,
    typeof ticketsQueryKey
  >({
    queryKey: ticketsQueryKey,
    queryFn: async (): Promise<TicketsResponse> => {
      try {
        const accessToken = await getAuth0AccessToken();
        const res = await fetch(
          `${API_BASE}/tickets/search?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          }
        );
        console.log("Fetch MC Tickets Response", res);
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch relevant tickets", error);
        return { tickets: [], total: 0 };
      }
    },
    enabled: true,
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
}
