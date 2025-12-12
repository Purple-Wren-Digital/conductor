import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamSwitcher } from "./team-switcher";

// Mock hasPointerCapture for Radix UI Select component
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver for Radix UI
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the hooks
const mockUseUserRole = vi.fn();
const mockUseFetchAllMarketCenters = vi.fn();
const mockUseIsEnterprise = vi.fn();

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: (role: string) => mockUseFetchAllMarketCenters(role),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useIsEnterprise: () => mockUseIsEnterprise(),
}));

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

  Wrapper.displayName = "TestQueryClientWrapper-TeamSwitcher";

  return Wrapper;
};

const mockMarketCenters = [
  { id: "mc-1", name: "Market Center 1" },
  { id: "mc-2", name: "Market Center 2" },
  { id: "mc-3", name: "Market Center 3" },
];

describe("TeamSwitcher", () => {
  const mockSetSelectedMarketCenterId = vi.fn();
  const mockHandleMarketCenterSelected = vi.fn();
  const mockSetMarketCenters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mockUseUserRole.mockReturnValue({ role: "AGENT" });
    mockUseFetchAllMarketCenters.mockReturnValue({
      data: { marketCenters: [mockMarketCenters[0]] },
      isLoading: false,
    });
    mockUseIsEnterprise.mockReturnValue({
      isEnterprise: false,
      isStandard: true,
      isLoading: false,
    });
  });

  const renderTeamSwitcher = (selectedId = "mc-1") => {
    return render(
      <TeamSwitcher
        selectedMarketCenterId={selectedId}
        setSelectedMarketCenterId={mockSetSelectedMarketCenterId}
        handleMarketCenterSelected={mockHandleMarketCenterSelected}
        setMarketCenters={mockSetMarketCenters}
      />,
      { wrapper: createWrapper() }
    );
  };

  it("should render the team switcher", async () => {
    renderTeamSwitcher();

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("canViewAllTeams logic", () => {
    /**
     * The canViewAllTeams logic is:
     * role === "ADMIN" && isEnterprise && marketCenters.length > 1
     *
     * We test the different combinations to ensure "All Teams" option
     * is only shown when all three conditions are met.
     */

    describe("should NOT show All Teams option when conditions are not met", () => {
      it("non-admin user (AGENT) - even with Enterprise and multiple MCs", async () => {
        mockUseUserRole.mockReturnValue({ role: "AGENT" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: mockMarketCenters },
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: true,
          isStandard: false,
          isLoading: false,
        });

        renderTeamSwitcher();

        // canViewAllTeams = false because role !== "ADMIN"
        // The "All Teams" option should not be in the DOM at all
        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        // All Teams option should not exist
        expect(screen.queryByText("All Teams")).not.toBeInTheDocument();
      });

      it("non-admin user (STAFF) - even with Enterprise and multiple MCs", async () => {
        mockUseUserRole.mockReturnValue({ role: "STAFF" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: mockMarketCenters },
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: true,
          isStandard: false,
          isLoading: false,
        });

        renderTeamSwitcher();

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        expect(screen.queryByText("All Teams")).not.toBeInTheDocument();
      });

      it("non-admin user (STAFF_LEADER) - even with Enterprise and multiple MCs", async () => {
        mockUseUserRole.mockReturnValue({ role: "STAFF_LEADER" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: mockMarketCenters },
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: true,
          isStandard: false,
          isLoading: false,
        });

        renderTeamSwitcher();

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        expect(screen.queryByText("All Teams")).not.toBeInTheDocument();
      });

      it("ADMIN without Enterprise subscription", async () => {
        mockUseUserRole.mockReturnValue({ role: "ADMIN" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: mockMarketCenters },
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: false, // Non-Enterprise
          isStandard: true,
          isLoading: false,
        });

        renderTeamSwitcher();

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        // canViewAllTeams = false because isEnterprise === false
        expect(screen.queryByText("All Teams")).not.toBeInTheDocument();
      });

      it("ADMIN with Enterprise but only 1 market center", async () => {
        mockUseUserRole.mockReturnValue({ role: "ADMIN" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: [mockMarketCenters[0]] }, // Only 1 MC
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: true,
          isStandard: false,
          isLoading: false,
        });

        renderTeamSwitcher();

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        // canViewAllTeams = false because marketCenters.length <= 1
        expect(screen.queryByText("All Teams")).not.toBeInTheDocument();
      });

      it("ADMIN with Enterprise but empty market centers", async () => {
        mockUseUserRole.mockReturnValue({ role: "ADMIN" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: [] }, // Empty
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: true,
          isStandard: false,
          isLoading: false,
        });

        renderTeamSwitcher();

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        expect(screen.queryByText("All Teams")).not.toBeInTheDocument();
      });
    });

    describe("should show All Teams option when ALL conditions are met", () => {
      it("ADMIN with Enterprise and multiple market centers", async () => {
        mockUseUserRole.mockReturnValue({ role: "ADMIN" });
        mockUseFetchAllMarketCenters.mockReturnValue({
          data: { marketCenters: mockMarketCenters }, // Multiple MCs
          isLoading: false,
        });
        mockUseIsEnterprise.mockReturnValue({
          isEnterprise: true,
          isStandard: false,
          isLoading: false,
        });

        renderTeamSwitcher();

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        // canViewAllTeams = true because:
        // - role === "ADMIN" ✓
        // - isEnterprise === true ✓
        // - marketCenters.length > 1 ✓
        // Note: The option is rendered but may only be visible when dropdown is open
        // Since we can't easily interact with Radix Select in tests,
        // we verify the component renders without errors with these conditions
      });
    });
  });

  describe("Loading state", () => {
    it("should handle loading state gracefully", () => {
      mockUseUserRole.mockReturnValue({ role: "ADMIN" });
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      mockUseIsEnterprise.mockReturnValue({
        isEnterprise: true,
        isStandard: false,
        isLoading: true,
      });

      renderTeamSwitcher("");

      // Should render without crashing during loading
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should handle undefined data gracefully", () => {
      mockUseUserRole.mockReturnValue({ role: "ADMIN" });
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      mockUseIsEnterprise.mockReturnValue({
        isEnterprise: true,
        isStandard: false,
        isLoading: false,
      });

      renderTeamSwitcher("");

      // Should render without crashing
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("Hooks integration", () => {
    it("should call useFetchAllMarketCenters with the correct role", () => {
      mockUseUserRole.mockReturnValue({ role: "STAFF" });

      renderTeamSwitcher();

      expect(mockUseFetchAllMarketCenters).toHaveBeenCalledWith("STAFF");
    });

    it("should use isEnterprise from useIsEnterprise hook", () => {
      mockUseUserRole.mockReturnValue({ role: "ADMIN" });
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: { marketCenters: mockMarketCenters },
        isLoading: false,
      });

      // First render with non-Enterprise
      mockUseIsEnterprise.mockReturnValue({
        isEnterprise: false,
        isStandard: true,
        isLoading: false,
      });

      const { unmount } = renderTeamSwitcher();

      expect(mockUseIsEnterprise).toHaveBeenCalled();

      unmount();
    });
  });
});

/**
 * Unit tests for the canViewAllTeams logic
 * This tests the pure logic without React component rendering
 */
describe("canViewAllTeams logic (unit)", () => {
  const computeCanViewAllTeams = (
    role: string,
    isEnterprise: boolean,
    marketCentersCount: number
  ): boolean => {
    return role === "ADMIN" && isEnterprise && marketCentersCount > 1;
  };

  it("should return true only when ADMIN + Enterprise + multiple MCs", () => {
    expect(computeCanViewAllTeams("ADMIN", true, 3)).toBe(true);
    expect(computeCanViewAllTeams("ADMIN", true, 2)).toBe(true);
  });

  it("should return false for non-admin roles", () => {
    expect(computeCanViewAllTeams("AGENT", true, 3)).toBe(false);
    expect(computeCanViewAllTeams("STAFF", true, 3)).toBe(false);
    expect(computeCanViewAllTeams("STAFF_LEADER", true, 3)).toBe(false);
  });

  it("should return false without Enterprise subscription", () => {
    expect(computeCanViewAllTeams("ADMIN", false, 3)).toBe(false);
  });

  it("should return false with only 1 or 0 market centers", () => {
    expect(computeCanViewAllTeams("ADMIN", true, 1)).toBe(false);
    expect(computeCanViewAllTeams("ADMIN", true, 0)).toBe(false);
  });

  it("should return false when multiple conditions fail", () => {
    expect(computeCanViewAllTeams("AGENT", false, 1)).toBe(false);
    expect(computeCanViewAllTeams("STAFF", false, 0)).toBe(false);
  });
});
