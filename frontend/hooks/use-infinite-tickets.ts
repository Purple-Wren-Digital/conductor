import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import type { TicketsResponse, UserRole } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";

const ticketsRefetchInterval = 300000;
export const INFINITE_TICKETS_PAGE_SIZE = 25;

type QueryKey = readonly [string, Record<string, string>];

function buildPageParams(baseParams: URLSearchParams, offset: number) {
  const params = new URLSearchParams(baseParams);
  params.set("limit", String(INFINITE_TICKETS_PAGE_SIZE));
  params.set("offset", String(offset));
  return params;
}

function getNextPageParam(
  lastPage: TicketsResponse,
  allPages: TicketsResponse[]
) {
  const loaded = allPages.reduce((n, p) => n + (p.tickets?.length ?? 0), 0);
  return loaded < (lastPage.total ?? 0) ? loaded : undefined;
}

async function fetchTicketsPage(
  baseParams: URLSearchParams,
  offset: number,
  token: string | null
): Promise<TicketsResponse> {
  if (!token) return { tickets: [], total: 0 } as TicketsResponse;
  const params = buildPageParams(baseParams, offset);
  const res = await fetch(`${API_BASE}/tickets/search?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return (await res.json()) as TicketsResponse;
}

export function useInfiniteAgentTickets({
  queryParams,
  queryKey,
  hydrated,
}: {
  queryParams: URLSearchParams;
  queryKey: QueryKey;
  hydrated: boolean;
}) {
  const { getToken } = useAuth();
  return useInfiniteQuery<TicketsResponse, Error>({
    queryKey,
    queryFn: async ({ pageParam }) =>
      fetchTicketsPage(queryParams, Number(pageParam ?? 0), await getToken()),
    initialPageParam: 0,
    getNextPageParam,
    enabled: !!hydrated,
    refetchInterval: ticketsRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
}

export function useInfiniteStaffTickets({
  queryParams,
  queryKey,
  hydrated,
}: {
  queryParams: URLSearchParams;
  queryKey: QueryKey;
  hydrated: boolean;
}) {
  const { getToken } = useAuth();
  return useInfiniteQuery<TicketsResponse, Error>({
    queryKey,
    queryFn: async ({ pageParam }) =>
      fetchTicketsPage(queryParams, Number(pageParam ?? 0), await getToken()),
    initialPageParam: 0,
    getNextPageParam,
    enabled: !!hydrated,
    refetchInterval: ticketsRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
}

export function useInfiniteAdminTickets({
  role,
  queryParams,
  queryKey,
  hydrated,
}: {
  role: UserRole | undefined;
  queryParams: URLSearchParams;
  queryKey: QueryKey;
  hydrated: boolean;
}) {
  const { getToken } = useAuth();
  return useInfiniteQuery<TicketsResponse, Error>({
    queryKey,
    queryFn: async ({ pageParam }) =>
      fetchTicketsPage(queryParams, Number(pageParam ?? 0), await getToken()),
    initialPageParam: 0,
    getNextPageParam,
    enabled: role === "ADMIN" && !!hydrated,
    refetchInterval: ticketsRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
}
