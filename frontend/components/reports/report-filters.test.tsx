import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportFilters, DEFAULT_FILTERS, ReportFiltersState } from "./report-filters";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PrismaUser } from "@/lib/types";

// Mock the store provider
const mockCurrentUser: Partial<PrismaUser> = {
  id: "user-1",
  role: "STAFF_LEADER",
  marketCenterId: "mc-123",
};

vi.mock("@/context/store-provider", () => ({
  useStore: vi.fn(() => ({
    currentUser: mockCurrentUser,
  })),
}));

// Mock the market center hooks
vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: vi.fn(() => ({
    data: {
      marketCenters: [
        { id: "mc-123", name: "Downtown MC" },
        { id: "mc-456", name: "Uptown MC" },
      ],
    },
    isLoading: false,
  })),
  useFetchMarketCenterCategories: vi.fn(() => ({
    data: { ticketCategories: [] },
    isLoading: false,
  })),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("ReportFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Market Center Default by Role", () => {
    it("should auto-set market center for STAFF_LEADER users", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-1",
          role: "STAFF_LEADER",
          marketCenterId: "mc-123",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const onFiltersChange = vi.fn();
      const filters: ReportFiltersState = { ...DEFAULT_FILTERS };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMarketCenterFilter={true}
        />
      );

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          ...filters,
          marketCenterIds: ["mc-123"],
        });
      });
    });

    it("should auto-set market center for STAFF users", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-2",
          role: "STAFF",
          marketCenterId: "mc-456",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const onFiltersChange = vi.fn();
      const filters: ReportFiltersState = { ...DEFAULT_FILTERS };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMarketCenterFilter={true}
        />
      );

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          ...filters,
          marketCenterIds: ["mc-456"],
        });
      });
    });

    it("should auto-set market center for AGENT users", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-3",
          role: "AGENT",
          marketCenterId: "mc-123",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const onFiltersChange = vi.fn();
      const filters: ReportFiltersState = { ...DEFAULT_FILTERS };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMarketCenterFilter={true}
        />
      );

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          ...filters,
          marketCenterIds: ["mc-123"],
        });
      });
    });

    it("should NOT auto-set market center for ADMIN users", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-admin",
          role: "ADMIN",
          marketCenterId: "mc-123",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const onFiltersChange = vi.fn();
      const filters: ReportFiltersState = { ...DEFAULT_FILTERS };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMarketCenterFilter={true}
        />
      );

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onFiltersChange).not.toHaveBeenCalled();
    });

    it("should NOT auto-set market center when user has no marketCenterId", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-no-mc",
          role: "STAFF_LEADER",
          marketCenterId: null,
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const onFiltersChange = vi.fn();
      const filters: ReportFiltersState = { ...DEFAULT_FILTERS };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMarketCenterFilter={true}
        />
      );

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onFiltersChange).not.toHaveBeenCalled();
    });

    it("should NOT auto-set market center when filter already has a value", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-1",
          role: "STAFF_LEADER",
          marketCenterId: "mc-123",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const onFiltersChange = vi.fn();
      const filters: ReportFiltersState = {
        ...DEFAULT_FILTERS,
        marketCenterIds: ["mc-existing"],
      };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMarketCenterFilter={true}
        />
      );

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onFiltersChange).not.toHaveBeenCalled();
    });
  });

  describe("Market Center Dropdown", () => {
    it("should disable market center dropdown for non-ADMIN users", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-1",
          role: "STAFF_LEADER",
          marketCenterId: "mc-123",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const filters: ReportFiltersState = {
        ...DEFAULT_FILTERS,
        marketCenterIds: ["mc-123"],
      };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={vi.fn()}
          showMarketCenterFilter={true}
          showDateFilter={false}
          showCategoryFilter={false}
        />
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeDisabled();
    });

    it("should enable market center dropdown for ADMIN users", async () => {
      const { useStore } = await import("@/context/store-provider");
      vi.mocked(useStore).mockReturnValue({
        currentUser: {
          id: "user-admin",
          role: "ADMIN",
          marketCenterId: "mc-123",
        } as PrismaUser,
        setCurrentUser: vi.fn(),
      });

      const filters: ReportFiltersState = { ...DEFAULT_FILTERS };

      renderWithProviders(
        <ReportFilters
          filters={filters}
          onFiltersChange={vi.fn()}
          showMarketCenterFilter={true}
          showDateFilter={false}
          showCategoryFilter={false}
        />
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).not.toBeDisabled();
    });
  });
});
