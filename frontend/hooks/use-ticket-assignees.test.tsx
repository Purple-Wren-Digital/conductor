import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useTicketAssignees } from "./use-ticket-assignees";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  Wrapper.displayName = "TestQueryClientWrapper-TicketAssignees";
  return Wrapper;
}

function jsonOk(body: any) {
  return { ok: true, json: async () => body } as Response;
}

const assigneesBody = {
  assignees: [
    { id: "user-1", name: "April Huang", role: "AGENT", isActive: true },
    { id: "user-2", name: "Bob Staff", role: "STAFF", isActive: false },
  ],
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("useTicketAssignees", () => {
  it("requests /tickets/assignees without query string when marketCenterId is omitted", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(assigneesBody));

    const { result } = renderHook(() => useTicketAssignees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/tickets/assignees");
    expect(url).not.toContain("?");
    expect(url).not.toContain("marketCenterId=");

    const headers = (mockFetch.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mock-token");
  });

  it("appends marketCenterId query param when provided", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(assigneesBody));

    const { result } = renderHook(() => useTicketAssignees("mc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/tickets/assignees?marketCenterId=mc-1");
  });

  it("unwraps the `assignees` envelope and returns the assignee list", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(assigneesBody));

    const { result } = renderHook(() => useTicketAssignees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe("April Huang");
    expect(result.current.data?.[1].isActive).toBe(false);
  });

  it("surfaces fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);

    const { result } = renderHook(() => useTicketAssignees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Failed to fetch/);
  });

  it("scopes the query cache by marketCenterId (different keys do not share data)", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonOk(assigneesBody))
      .mockResolvedValueOnce(
        jsonOk({
          assignees: [
            { id: "user-3", name: "Carl Other", role: "STAFF", isActive: true },
          ],
        })
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const a = renderHook(() => useTicketAssignees("mc-1"), { wrapper: Wrapper });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));

    const b = renderHook(() => useTicketAssignees("mc-2"), { wrapper: Wrapper });
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));

    expect(a.result.current.data).toHaveLength(2);
    expect(b.result.current.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
