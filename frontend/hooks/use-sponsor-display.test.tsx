import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  useSponsorDisplay,
  useSponsorSlot,
  type SponsorSlotKey,
} from "./use-sponsor-display";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  Wrapper.displayName = "TestQueryClientWrapper-SponsorDisplay";
  return Wrapper;
}

function jsonOk(body: any) {
  return { ok: true, json: async () => body } as Response;
}

const slotsBody = {
  slots: [
    {
      slot: "header",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/header.png",
      linkUrl: "https://acme.example.com",
    },
    {
      slot: "dashboardCard",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/card.png",
    },
    {
      slot: "ticketListRow",
      imageUrl: "https://cdn.example.com/row.png",
    },
  ],
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("useSponsorDisplay", () => {
  it("requests /settings/partner-display and returns the slots array", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(slotsBody));

    const { result } = renderHook(() => useSponsorDisplay(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/settings/partner-display");

    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer mock-token");

    expect(result.current.data).toEqual(slotsBody.slots);
  });

  it("surfaces fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);

    const { result } = renderHook(() => useSponsorDisplay(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Failed to fetch/);
  });

  it("returns an empty array when there are no sponsor slots", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ slots: [] }));

    const { result } = renderHook(() => useSponsorDisplay(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useSponsorSlot", () => {
  function useTestable(slot: SponsorSlotKey) {
    const query = useSponsorDisplay();
    const found = useSponsorSlot(slot);
    return { query, found };
  }

  it("picks the matching slot entry by key", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk(slotsBody));

    const { result } = renderHook(() => useTestable("dashboardCard"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.found?.slot).toBe("dashboardCard");
    expect(result.current.found?.imageUrl).toBe(
      "https://cdn.example.com/card.png"
    );
  });

  it("returns undefined for a slot key not present in the response", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ slots: [slotsBody.slots[0]] }));

    const { result } = renderHook(() => useTestable("ticketListRow"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.found).toBeUndefined();
  });

  it("returns undefined for every slot when the response is empty", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ slots: [] }));

    const { result } = renderHook(() => useTestable("header"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.found).toBeUndefined();
  });
});
