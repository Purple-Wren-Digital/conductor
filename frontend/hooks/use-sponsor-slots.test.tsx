import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockGetToken = vi.fn().mockResolvedValue("mock-token");

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import {
  useSponsorSlots,
  useUpdateSponsorSlots,
  useUploadSponsorAsset,
  sponsorSlotsKeys,
} from "./use-sponsor-slots";

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

  Wrapper.displayName = "TestQueryClientWrapper-SponsorSlots";
  return Wrapper;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockSponsorSlotsResponse = {
  sponsorSlots: {
    header: {
      enabled: true,
      name: "Acme Corp",
      imageKey: "img-1",
      imageUrl: "https://cdn.example.com/img-1.png",
      linkUrl: "https://acme.example.com",
    },
  },
};

// =============================================================================
// useSponsorSlots TESTS
// =============================================================================

describe("useSponsorSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  it("should fetch and map sponsor slots data successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSponsorSlotsResponse),
    });

    const { result } = renderHook(() => useSponsorSlots("mc-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSponsorSlotsResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/partner-slots/mc-123"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      })
    );
  });

  it("should not fetch when marketCenterId is undefined", () => {
    const { result } = renderHook(() => useSponsorSlots(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should surface an error when the request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Permission denied"),
    });

    const { result } = renderHook(() => useSponsorSlots("mc-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

// =============================================================================
// useUpdateSponsorSlots TESTS
// =============================================================================

describe("useUpdateSponsorSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  it("should call the update endpoint with the composed payload", async () => {
    const payload = {
      marketCenterId: "mc-123",
      sponsorSlots: {
        header: {
          enabled: true,
          name: "Acme Corp",
          imageKey: "img-1",
          linkUrl: "https://acme.example.com",
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sponsorSlots: payload.sponsorSlots }),
    });

    const { result } = renderHook(() => useUpdateSponsorSlots(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/partner-slots/mc-123"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ sponsorSlots: payload.sponsorSlots }),
      })
    );
  });

  it("should invalidate the sponsor-slots query for the market center on success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sponsorSlots: {} }),
    });

    const { result } = renderHook(() => useUpdateSponsorSlots(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        marketCenterId: "mc-123",
        sponsorSlots: {},
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: sponsorSlotsKeys.detail("mc-123"),
      })
    );
  });

  it("should surface mutation errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Invalid argument"),
    });

    const { result } = renderHook(() => useUpdateSponsorSlots(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          marketCenterId: "mc-123",
          sponsorSlots: {},
        });
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useUploadSponsorAsset TESTS
// =============================================================================

describe("useUploadSponsorAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  it("should return imageKey and imageUrl on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          imageKey: "img-42",
          imageUrl: "https://cdn.example.com/img-42.png",
        }),
    });

    const { result } = renderHook(() => useUploadSponsorAsset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        marketCenterId: "mc-123",
        slot: "header",
        fileName: "logo.png",
        mimeType: "image/png",
        content: "base64content",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      imageKey: "img-42",
      imageUrl: "https://cdn.example.com/img-42.png",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/settings/partner-slots/mc-123/asset"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          slot: "header",
          fileName: "logo.png",
          mimeType: "image/png",
          content: "base64content",
        }),
      })
    );
  });

  it("should surface upload errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Invalid file"),
    });

    const { result } = renderHook(() => useUploadSponsorAsset(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          marketCenterId: "mc-123",
          slot: "header",
          fileName: "logo.png",
          mimeType: "image/png",
          content: "base64content",
        });
      })
    ).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
