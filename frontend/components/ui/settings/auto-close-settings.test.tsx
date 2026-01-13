import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockGetToken = vi.fn().mockResolvedValue("mock-jwt-token");
const mockUseStore = vi.fn();
const mockUseUserRole = vi.fn();
const mockUseAutoCloseSettings = vi.fn();
const mockUseUpdateAutoCloseSettings = vi.fn();
const mockUseFetchAllMarketCenters = vi.fn();
const mockUseIsEnterprise = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

vi.mock("@/context/store-provider", () => ({
  useStore: () => mockUseStore(),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/hooks/use-settings", () => ({
  useAutoCloseSettings: () => mockUseAutoCloseSettings(),
  useUpdateAutoCloseSettings: () => mockUseUpdateAutoCloseSettings(),
}));

vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: () => mockUseFetchAllMarketCenters(),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useIsEnterprise: () => mockUseIsEnterprise(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import AutoCloseSettings from "./auto-close-settings";
import { toast } from "sonner";

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

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

// =============================================================================
// DEFAULT MOCK VALUES
// =============================================================================

const defaultMocks = () => {
  mockGetToken.mockResolvedValue("mock-jwt-token");

  mockUseStore.mockReturnValue({
    currentUser: { marketCenterId: "mc-123" },
  });

  mockUseUserRole.mockReturnValue({
    role: "STAFF_LEADER",
  });

  mockUseAutoCloseSettings.mockReturnValue({
    data: {
      autoClose: {
        enabled: true,
        awaitingResponseDays: 2,
      },
    },
    isLoading: false,
    error: null,
  });

  mockUseUpdateAutoCloseSettings.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });

  mockUseFetchAllMarketCenters.mockReturnValue({
    data: {
      marketCenters: [{ id: "mc-123", name: "Test Market Center" }],
    },
    isLoading: false,
  });

  mockUseIsEnterprise.mockReturnValue({
    isEnterprise: false,
  });
};

// =============================================================================
// TESTS
// =============================================================================

describe("AutoCloseSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultMocks();
  });

  describe("Rendering", () => {
    it("should render the auto-close settings card", () => {
      renderWithProviders(<AutoCloseSettings />);

      expect(screen.getByText("Auto-Close Settings")).toBeInTheDocument();
      expect(
        screen.getByText(/Configure automatic closing of tickets/)
      ).toBeInTheDocument();
    });

    it("should render the enable switch", () => {
      renderWithProviders(<AutoCloseSettings />);

      expect(screen.getByText("Enable Auto-Close")).toBeInTheDocument();
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("should render the days input", () => {
      renderWithProviders(<AutoCloseSettings />);

      expect(
        screen.getByText("Business Days Until Auto-Close")
      ).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("should render with initial values from API", () => {
      mockUseAutoCloseSettings.mockReturnValue({
        data: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 5,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<AutoCloseSettings />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(5);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("data-state", "checked");
    });
  });

  describe("Permission checks", () => {
    it("should show permission denied for AGENT users", () => {
      mockUseUserRole.mockReturnValue({
        role: "AGENT",
      });

      renderWithProviders(<AutoCloseSettings />);

      expect(
        screen.getByText(/You do not have permission/)
      ).toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });

    it("should show permission denied for STAFF users", () => {
      mockUseUserRole.mockReturnValue({
        role: "STAFF",
      });

      renderWithProviders(<AutoCloseSettings />);

      expect(
        screen.getByText(/You do not have permission/)
      ).toBeInTheDocument();
    });

    it("should render form for STAFF_LEADER users", () => {
      mockUseUserRole.mockReturnValue({
        role: "STAFF_LEADER",
      });

      renderWithProviders(<AutoCloseSettings />);

      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("should render form for ADMIN users", () => {
      mockUseUserRole.mockReturnValue({
        role: "ADMIN",
      });

      renderWithProviders(<AutoCloseSettings />);

      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
  });


  describe("Loading state", () => {
    it("should show loading spinner when fetching data", () => {
      mockUseAutoCloseSettings.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<AutoCloseSettings />);

      // Check for the loading spinner (Loader2 component with animate-spin class)
      const loader = document.querySelector(".animate-spin");
      expect(loader).toBeInTheDocument();
    });
  });

  describe("Form interactions", () => {
    it("should disable days input when auto-close is disabled", async () => {
      mockUseAutoCloseSettings.mockReturnValue({
        data: {
          autoClose: {
            enabled: false,
            awaitingResponseDays: 2,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<AutoCloseSettings />);

      const input = screen.getByRole("spinbutton");
      expect(input).toBeDisabled();
    });

    it("should enable days input when auto-close is enabled", () => {
      renderWithProviders(<AutoCloseSettings />);

      const input = screen.getByRole("spinbutton");
      expect(input).not.toBeDisabled();
    });

    it("should toggle the switch when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("data-state", "checked");

      await user.click(switchElement);

      expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });

    it("should update days input value", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "7");

      expect(input).toHaveValue(7);
    });
  });

  describe("Form submission", () => {
    it("should disable save button when form is not dirty", () => {
      renderWithProviders(<AutoCloseSettings />);

      const saveButton = screen.getByRole("button", { name: /save auto-close settings/i });
      // Button should be disabled because form is not dirty
      expect(saveButton).toBeDisabled();
    });

    it("should enable save button when form is dirty", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      const saveButton = screen.getByRole("button", { name: /save auto-close settings/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("should call mutateAsync on form submission", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateAutoCloseSettings.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      // Make the form dirty
      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      // Submit the form
      const saveButton = screen.getByRole("button", { name: /save auto-close settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          marketCenterId: "mc-123",
          enabled: false,
          awaitingResponseDays: 2,
        });
      });
    });

    it("should show success toast on successful update", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateAutoCloseSettings.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      const saveButton = screen.getByRole("button", { name: /save auto-close settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Auto-close settings updated successfully"
        );
      });
    });

    it("should show error toast on failed update", async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error("API Error"));
      mockUseUpdateAutoCloseSettings.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      const saveButton = screen.getByRole("button", { name: /save auto-close settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to update auto-close settings"
        );
      });
    });

    it("should show loading state during submission", async () => {
      mockUseUpdateAutoCloseSettings.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: true,
      });

      const user = userEvent.setup();
      renderWithProviders(<AutoCloseSettings />);

      // Make the form dirty first
      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("should have min attribute set to 1", () => {
      renderWithProviders(<AutoCloseSettings />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "1");
    });

    it("should have max attribute set to 30", () => {
      renderWithProviders(<AutoCloseSettings />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("max", "30");
    });
  });
});
