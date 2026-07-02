import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useDashboardMetrics } from "./use-dashboard-metrics";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  Wrapper.displayName = "TestQueryClientWrapper-DashboardMetrics";
  return Wrapper;
}

function jsonOk(body: any) {
  return { ok: true, json: async () => body } as Response;
}

const metricsBody = {
  metrics: {
    totalTickets: 145,
    openTickets: 113,
    overdueTickets: 37,
    highPriorityOpen: 12,
    unassignedOpen: 4,
    createdLast7Days: 9,
    resolvedLast7Days: 6,
    avgResponseTime: 2.5,
    ticketsByStatus: {
      DRAFT: 0,
      CREATED: 0,
      ASSIGNED: 50,
      UNASSIGNED: 4,
      AWAITING_RESPONSE: 19,
      IN_PROGRESS: 40,
      RESOLVED: 32,
    },
    ticketsByUrgency: { HIGH: 12, MEDIUM: 60, LOW: 41 },
  },
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("useDashboardMetrics", () => {
  it("requests /dashboard/metrics without query string when marketCenterId is omitted", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(metricsBody));

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/dashboard/metrics");
    expect(url).not.toContain("?");
    expect(url).not.toContain("marketCenterId=");

    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("appends marketCenterId query param when provided", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(metricsBody));

    const { result } = renderHook(() => useDashboardMetrics("mc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/dashboard/metrics?marketCenterId=mc-1");
  });

  it("unwraps the `metrics` envelope and returns the metrics object", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(metricsBody));

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalTickets).toBe(145);
    expect(result.current.data?.overdueTickets).toBe(37);
    expect(result.current.data?.ticketsByStatus.ASSIGNED).toBe(50);
    expect(result.current.data?.ticketsByUrgency.HIGH).toBe(12);
  });

  it("surfaces fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Failed to fetch/);
  });

  it("scopes the query cache by marketCenterId (different keys do not share data)", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonOk(metricsBody))
      .mockResolvedValueOnce(
        jsonOk({ metrics: { ...metricsBody.metrics, totalTickets: 999 } })
      );

    // Single shared QueryClient so cache scoping is observable.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const a = renderHook(() => useDashboardMetrics("mc-1"), { wrapper: Wrapper });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));

    const b = renderHook(() => useDashboardMetrics("mc-2"), { wrapper: Wrapper });
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));

    expect(a.result.current.data?.totalTickets).toBe(145);
    expect(b.result.current.data?.totalTickets).toBe(999);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
