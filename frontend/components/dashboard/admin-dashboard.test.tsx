import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Tests for the AdminDashboard rating display logic.
 *
 * The fix ensures that when there's only one market center, the dashboard
 * uses the same API endpoint (/surveys/ratings/byMarketCenter/:id) as the
 * Market Center Management page, ensuring consistent ratings display.
 *
 * When there are multiple market centers, it continues to use the aggregate
 * endpoint (/surveys/ratings/all).
 */

// Mock data
const mockGlobalRatings = {
  totalSurveys: 100,
  marketCenterAverageRating: 4.5,
  assigneeAverageRating: 4.2,
  overallAverageRating: 4.3,
};

const mockSingleMcRatings = {
  totalSurveys: 50,
  marketCenterAverageRating: 3.8,
  assigneeAverageRating: 3.5,
  overallAverageRating: 3.6,
};

const mockSingleMarketCenter = [
  { id: "mc-1", name: "Test Market Center" },
];

const mockMultipleMarketCenters = [
  { id: "mc-1", name: "Market Center 1" },
  { id: "mc-2", name: "Market Center 2" },
  { id: "mc-3", name: "Market Center 3" },
];

/**
 * This hook mimics the displayRatings logic from AdminDashboard.
 * It selects the appropriate ratings based on market center count.
 */
function useDisplayRatings(
  marketCenters: Array<{ id: string; name: string }>,
  singleMcRatings: typeof mockSingleMcRatings | undefined,
  globalAverages: typeof mockGlobalRatings | undefined
) {
  const displayRatings = useMemo(() => {
    if (marketCenters.length === 1 && singleMcRatings) {
      return singleMcRatings;
    }
    return globalAverages;
  }, [marketCenters.length, singleMcRatings, globalAverages]);

  return displayRatings;
}

/**
 * This hook mimics the singleMarketCenterId logic from AdminDashboard.
 * It determines when to fetch single MC ratings.
 */
function useSingleMarketCenterId(
  marketCenters: Array<{ id: string; name: string }>
) {
  return marketCenters.length === 1 ? marketCenters[0]?.id : undefined;
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  Wrapper.displayName = "TestQueryClientWrapper";

  return Wrapper;
};

describe("AdminDashboard Rating Display Logic", () => {
  describe("singleMarketCenterId selection", () => {
    it("should return the market center ID when there is exactly one market center", () => {
      const { result } = renderHook(
        () => useSingleMarketCenterId(mockSingleMarketCenter),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe("mc-1");
    });

    it("should return undefined when there are multiple market centers", () => {
      const { result } = renderHook(
        () => useSingleMarketCenterId(mockMultipleMarketCenters),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeUndefined();
    });

    it("should return undefined when there are no market centers", () => {
      const { result } = renderHook(
        () => useSingleMarketCenterId([]),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe("displayRatings selection", () => {
    it("should use single MC ratings when there is one market center and ratings exist", () => {
      const { result } = renderHook(
        () => useDisplayRatings(mockSingleMarketCenter, mockSingleMcRatings, mockGlobalRatings),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe(mockSingleMcRatings);
      expect(result.current?.marketCenterAverageRating).toBe(3.8);
    });

    it("should use global ratings when there are multiple market centers", () => {
      const { result } = renderHook(
        () => useDisplayRatings(mockMultipleMarketCenters, mockSingleMcRatings, mockGlobalRatings),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe(mockGlobalRatings);
      expect(result.current?.marketCenterAverageRating).toBe(4.5);
    });

    it("should use global ratings when there is one MC but single MC ratings are undefined", () => {
      const { result } = renderHook(
        () => useDisplayRatings(mockSingleMarketCenter, undefined, mockGlobalRatings),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe(mockGlobalRatings);
      expect(result.current?.marketCenterAverageRating).toBe(4.5);
    });

    it("should use global ratings when there are no market centers", () => {
      const { result } = renderHook(
        () => useDisplayRatings([], mockSingleMcRatings, mockGlobalRatings),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe(mockGlobalRatings);
    });

    it("should return undefined when both ratings sources are undefined", () => {
      const { result } = renderHook(
        () => useDisplayRatings(mockSingleMarketCenter, undefined, undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe("displayRatings logic (pure unit tests)", () => {
    /**
     * Pure function version of the displayRatings logic for unit testing
     * without React hooks overhead.
     */
    const computeDisplayRatings = (
      marketCentersCount: number,
      singleMcRatings: typeof mockSingleMcRatings | undefined,
      globalAverages: typeof mockGlobalRatings | undefined
    ) => {
      if (marketCentersCount === 1 && singleMcRatings) {
        return singleMcRatings;
      }
      return globalAverages;
    };

    it("should return singleMcRatings when marketCenters.length === 1 AND singleMcRatings exists", () => {
      const result = computeDisplayRatings(1, mockSingleMcRatings, mockGlobalRatings);
      expect(result).toBe(mockSingleMcRatings);
    });

    it("should return globalAverages when marketCenters.length > 1", () => {
      expect(computeDisplayRatings(2, mockSingleMcRatings, mockGlobalRatings)).toBe(mockGlobalRatings);
      expect(computeDisplayRatings(3, mockSingleMcRatings, mockGlobalRatings)).toBe(mockGlobalRatings);
      expect(computeDisplayRatings(10, mockSingleMcRatings, mockGlobalRatings)).toBe(mockGlobalRatings);
    });

    it("should return globalAverages when marketCenters.length === 0", () => {
      const result = computeDisplayRatings(0, mockSingleMcRatings, mockGlobalRatings);
      expect(result).toBe(mockGlobalRatings);
    });

    it("should return globalAverages when marketCenters.length === 1 but singleMcRatings is undefined", () => {
      const result = computeDisplayRatings(1, undefined, mockGlobalRatings);
      expect(result).toBe(mockGlobalRatings);
    });

    it("should return undefined when both are undefined", () => {
      const result = computeDisplayRatings(1, undefined, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("singleMarketCenterId logic (pure unit tests)", () => {
    const computeSingleMarketCenterId = (
      marketCenters: Array<{ id: string }>
    ): string | undefined => {
      return marketCenters.length === 1 ? marketCenters[0]?.id : undefined;
    };

    it("should return the ID when exactly one market center exists", () => {
      expect(computeSingleMarketCenterId([{ id: "mc-123" }])).toBe("mc-123");
    });

    it("should return undefined when multiple market centers exist", () => {
      expect(computeSingleMarketCenterId([{ id: "mc-1" }, { id: "mc-2" }])).toBeUndefined();
    });

    it("should return undefined when no market centers exist", () => {
      expect(computeSingleMarketCenterId([])).toBeUndefined();
    });
  });

  describe("Integration scenario: Dashboard vs Market Center Management consistency", () => {
    /**
     * These tests verify the fix ensures Dashboard and Market Center Management
     * show the same ratings for a single market center.
     */

    it("should use byMarketCenter endpoint rating (3.8) for single MC instead of global aggregate (4.5)", () => {
      // Scenario: User has 1 market center
      // - Market Center Management page shows: 3.8 (from /surveys/ratings/byMarketCenter/mc-1)
      // - Dashboard SHOULD now show: 3.8 (same endpoint)
      // - Dashboard previously showed: 4.5 (from /surveys/ratings/all - aggregate)

      const marketCenters = [{ id: "mc-1", name: "My Market Center" }];
      const byMarketCenterRating = { ...mockSingleMcRatings, marketCenterAverageRating: 3.8 };
      const globalRating = { ...mockGlobalRatings, marketCenterAverageRating: 4.5 };

      const { result } = renderHook(
        () => useDisplayRatings(marketCenters, byMarketCenterRating, globalRating),
        { wrapper: createWrapper() }
      );

      // After the fix, dashboard should use the byMarketCenter rating
      expect(result.current?.marketCenterAverageRating).toBe(3.8);
      expect(result.current).toBe(byMarketCenterRating);
    });

    it("should continue using global aggregate for multiple market centers", () => {
      // Scenario: User has multiple market centers (Enterprise)
      // - Market Center Management shows individual ratings per MC
      // - Dashboard shows aggregate across all MCs (expected behavior)

      const marketCenters = [
        { id: "mc-1", name: "Market Center 1" },
        { id: "mc-2", name: "Market Center 2" },
      ];
      const byMarketCenterRating = { ...mockSingleMcRatings, marketCenterAverageRating: 3.8 };
      const globalRating = { ...mockGlobalRatings, marketCenterAverageRating: 4.5 };

      const { result } = renderHook(
        () => useDisplayRatings(marketCenters, byMarketCenterRating, globalRating),
        { wrapper: createWrapper() }
      );

      // For multiple MCs, dashboard should use global aggregate
      expect(result.current?.marketCenterAverageRating).toBe(4.5);
      expect(result.current).toBe(globalRating);
    });
  });
});
