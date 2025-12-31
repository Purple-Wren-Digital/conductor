import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/env/client-side", () => ({
  clientSideEnv: {
    NEXT_PUBLIC_VERCEL_ENV: "development",
    NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID: undefined,
  },
}));

// Import after mocks
import {
  useAutoCloseSettings,
  useUpdateAutoCloseSettings,
} from "./use-settings";

// Mock getToken function
const mockGetToken = vi.fn();

// =============================================================================
// TEST UTILITIES
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  Wrapper.displayName = "TestQueryClientWrapper-AutoCloseSettings";
  return Wrapper;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockAutoCloseSettings = {
  autoClose: {
    enabled: true,
    awaitingResponseDays: 5,
  },
};

const mockUpdatedSettings = {
  autoClose: {
    enabled: false,
    awaitingResponseDays: 3,
  },
};

// =============================================================================
// useAutoCloseSettings TESTS
// =============================================================================

describe("useAutoCloseSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-jwt-token");
  });

  it("should fetch auto-close settings successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAutoCloseSettings),
    });

    const { result } = renderHook(
      () => useAutoCloseSettings(mockGetToken, "mc-123"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAutoCloseSettings);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/auto-close/mc-123"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-jwt-token",
        }),
      })
    );
  });

  it("should not fetch when getToken is undefined", async () => {
    const { result } = renderHook(
      () => useAutoCloseSettings(undefined, "mc-123"),
      { wrapper: createWrapper() }
    );

    // Query should be disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not fetch when marketCenterId is undefined", async () => {
    const { result } = renderHook(
      () => useAutoCloseSettings(mockGetToken, undefined),
      { wrapper: createWrapper() }
    );

    // Query should be disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Permission denied"),
    });

    const { result } = renderHook(
      () => useAutoCloseSettings(mockGetToken, "mc-123"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

// =============================================================================
// useUpdateAutoCloseSettings TESTS
// =============================================================================

describe("useUpdateAutoCloseSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-jwt-token");
  });

  it("should update auto-close settings successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUpdatedSettings),
    });

    const { result } = renderHook(
      () => useUpdateAutoCloseSettings(mockGetToken),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync({
        marketCenterId: "mc-123",
        enabled: false,
        awaitingResponseDays: 3,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/auto-close/mc-123"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          marketCenterId: "mc-123",
          enabled: false,
          awaitingResponseDays: 3,
        }),
      })
    );
  });

  it("should handle mutation errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Invalid argument"),
    });

    const { result } = renderHook(
      () => useUpdateAutoCloseSettings(mockGetToken),
      { wrapper: createWrapper() }
    );

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          marketCenterId: "mc-123",
          enabled: true,
          awaitingResponseDays: 50, // Invalid
        });
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("should throw error when getToken is undefined", async () => {
    const { result } = renderHook(() => useUpdateAutoCloseSettings(undefined), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          marketCenterId: "mc-123",
          enabled: true,
        });
      })
    ).rejects.toThrow("Not authenticated");
  });
});
