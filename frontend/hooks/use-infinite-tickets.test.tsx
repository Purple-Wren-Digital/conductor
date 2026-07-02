import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  useInfiniteAgentTickets,
  useInfiniteStaffTickets,
  useInfiniteAdminTickets,
  INFINITE_TICKETS_PAGE_SIZE,
} from "./use-infinite-tickets";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  Wrapper.displayName = "TestQueryClientWrapper-InfiniteTickets";
  return Wrapper;
}

function jsonOk(body: any) {
  return { ok: true, json: async () => body } as Response;
}

function makeTickets(n: number, startId: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `tkt-${startId + i}` }));
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("INFINITE_TICKETS_PAGE_SIZE", () => {
  it("is 25", () => {
    expect(INFINITE_TICKETS_PAGE_SIZE).toBe(25);
  });
});

describe("useInfiniteStaffTickets", () => {
  it("fetches the first page at offset=0 with limit=25", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({ tickets: makeTickets(25, 0), total: 145 })
    );

    const { result } = renderHook(
      () =>
        useInfiniteStaffTickets({
          queryParams: new URLSearchParams({ status: "ASSIGNED" }),
          queryKey: ["staff-tickets", { status: "ASSIGNED" }] as const,
          hydrated: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/tickets/search?");
    expect(url).toContain("status=ASSIGNED");
    expect(url).toContain("limit=25");
    expect(url).toContain("offset=0");
  });

  it("getNextPageParam advances offset by loaded count until total is reached", async () => {
    mockFetch.mockImplementation(async (input: any) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const remaining = Math.max(0, 60 - offset);
      const take = Math.min(25, remaining);
      return jsonOk({ tickets: makeTickets(take, offset), total: 60 });
    });

    const { result } = renderHook(
      () =>
        useInfiniteStaffTickets({
          queryParams: new URLSearchParams(),
          queryKey: ["staff-tickets", {}] as const,
          hydrated: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(false));

    const offsets = mockFetch.mock.calls.map((c) => {
      const url = new URL(c[0] as string);
      return url.searchParams.get("offset");
    });
    expect(offsets).toEqual(["0", "25", "50"]);
  });

  it("does not fetch when hydrated=false", async () => {
    renderHook(
      () =>
        useInfiniteStaffTickets({
          queryParams: new URLSearchParams(),
          queryKey: ["staff-tickets", {}] as const,
          hydrated: false,
        }),
      { wrapper: createWrapper() }
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("hasNextPage is false on first page when loaded >= total", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({ tickets: makeTickets(8, 0), total: 8 })
    );

    const { result } = renderHook(
      () =>
        useInfiniteStaffTickets({
          queryParams: new URLSearchParams(),
          queryKey: ["staff-tickets", {}] as const,
          hydrated: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("useInfiniteAgentTickets", () => {
  it("fetches with offset=0 when hydrated", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({ tickets: makeTickets(5, 0), total: 5 })
    );

    const { result } = renderHook(
      () =>
        useInfiniteAgentTickets({
          queryParams: new URLSearchParams({ assigneeId: "agent-1" }),
          queryKey: ["agent-tickets", { assigneeId: "agent-1" }] as const,
          hydrated: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("assigneeId=agent-1");
    expect(url).toContain("offset=0");
  });
});

describe("useInfiniteAdminTickets", () => {
  it("does not fetch when role is not ADMIN", async () => {
    renderHook(
      () =>
        useInfiniteAdminTickets({
          role: "STAFF",
          queryParams: new URLSearchParams(),
          queryKey: ["admin-tickets", {}] as const,
          hydrated: true,
        }),
      { wrapper: createWrapper() }
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches when role is ADMIN and hydrated", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonOk({ tickets: makeTickets(25, 0), total: 50 })
    );

    const { result } = renderHook(
      () =>
        useInfiniteAdminTickets({
          role: "ADMIN",
          queryParams: new URLSearchParams(),
          queryKey: ["admin-tickets", {}] as const,
          hydrated: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.hasNextPage).toBe(true);
  });
});
