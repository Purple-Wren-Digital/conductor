import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockUseStore = vi.fn();
const mockUseUserRole = vi.fn();
const mockUseSponsorSlots = vi.fn();
const mockUseUpdateSponsorSlots = vi.fn();
const mockUseUploadSponsorAsset = vi.fn();
const mockUseFetchAllMarketCenters = vi.fn();
const mockUseIsEnterprise = vi.fn();

vi.mock("@/context/store-provider", () => ({
  useStore: () => mockUseStore(),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/hooks/use-sponsor-slots", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/use-sponsor-slots")>(
    "@/hooks/use-sponsor-slots"
  );
  return {
    ...actual,
    useSponsorSlots: () => mockUseSponsorSlots(),
    useUpdateSponsorSlots: () => mockUseUpdateSponsorSlots(),
    useUploadSponsorAsset: () => mockUseUploadSponsorAsset(),
  };
});

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
import SponsorSlotsSettings from "./sponsor-slots-settings";

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

  Wrapper.displayName = "TestQueryClientWrapper-SponsorSlotsSettings";
  return Wrapper;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

// =============================================================================
// DEFAULT MOCK VALUES
// =============================================================================

const emptySlot = { enabled: false, name: "", linkUrl: "" };

const defaultMocks = () => {
  mockUseStore.mockReturnValue({
    currentUser: { marketCenterId: "mc-123" },
  });

  mockUseUserRole.mockReturnValue({
    role: "STAFF_LEADER",
  });

  mockUseSponsorSlots.mockReturnValue({
    data: {
      sponsorSlots: {
        header: emptySlot,
        dashboardCard: emptySlot,
        ticketListRow: emptySlot,
      },
    },
    isLoading: false,
    error: null,
  });

  mockUseUpdateSponsorSlots.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });

  mockUseUploadSponsorAsset.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      imageKey: "img-1",
      imageUrl: "https://cdn.example.com/img-1.png",
    }),
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

describe("SponsorSlotsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultMocks();
  });

  describe("Rendering", () => {
    it("should render the sponsors settings card", () => {
      renderWithProviders(<SponsorSlotsSettings />);

      expect(screen.getByText("Sponsors")).toBeInTheDocument();
    });

    it("should render all three sponsor slot sections", () => {
      renderWithProviders(<SponsorSlotsSettings />);

      expect(screen.getByText("Header Logo")).toBeInTheDocument();
      expect(screen.getByText("Dashboard Card")).toBeInTheDocument();
      expect(screen.getByText("Ticket List Ad")).toBeInTheDocument();
    });

    it("should show an empty-state upload prompt when no image exists", () => {
      renderWithProviders(<SponsorSlotsSettings />);

      expect(screen.getAllByText("No image uploaded")).toHaveLength(3);
    });
  });

  describe("Permission checks", () => {
    it("should show a permission message and hide controls for AGENT users", () => {
      mockUseUserRole.mockReturnValue({ role: "AGENT" });

      renderWithProviders(<SponsorSlotsSettings />);

      expect(
        screen.getByText(/you do not have permission/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.queryByText("Header Logo")).not.toBeInTheDocument();
    });

    it("should show a permission message for STAFF users", () => {
      mockUseUserRole.mockReturnValue({ role: "STAFF" });

      renderWithProviders(<SponsorSlotsSettings />);

      expect(
        screen.getByText(/you do not have permission/i)
      ).toBeInTheDocument();
    });

    it("should render controls for STAFF_LEADER users", () => {
      mockUseUserRole.mockReturnValue({ role: "STAFF_LEADER" });

      renderWithProviders(<SponsorSlotsSettings />);

      expect(screen.getByText("Header Logo")).toBeInTheDocument();
    });

    it("should render controls for ADMIN users", () => {
      mockUseUserRole.mockReturnValue({ role: "ADMIN" });

      renderWithProviders(<SponsorSlotsSettings />);

      expect(screen.getByText("Header Logo")).toBeInTheDocument();
    });
  });

  describe("Enabled toggle gating", () => {
    it("should disable the toggle when no image has been uploaded", () => {
      renderWithProviders(<SponsorSlotsSettings />);

      const headerSwitch = screen.getByRole("switch", {
        name: /enable header logo/i,
      });
      expect(headerSwitch).toBeDisabled();
    });

    it("should enable the toggle once an image exists", () => {
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-1",
              imageUrl: "https://cdn.example.com/img-1.png",
            },
            dashboardCard: emptySlot,
            ticketListRow: emptySlot,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const headerSwitch = screen.getByRole("switch", {
        name: /enable header logo/i,
      });
      expect(headerSwitch).not.toBeDisabled();
    });
  });

  describe("Validation", () => {
    it("should show a validation message and block save for an invalid link URL", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateSponsorSlots.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const linkInput = screen.getByRole("textbox", {
        name: /header logo link url/i,
      });
      await user.type(linkInput, "not-a-url");

      const saveButton = screen.getByRole("button", {
        name: /save sponsor settings/i,
      });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/must start with http:\/\/ or https:\/\//i)
        ).toBeInTheDocument();
      });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("Save", () => {
    it("should call the update mutation with the composed sponsor slots object", async () => {
      const user = userEvent.setup();
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-1",
              imageUrl: "https://cdn.example.com/img-1.png",
            },
            dashboardCard: emptySlot,
            ticketListRow: emptySlot,
          },
        },
        isLoading: false,
        error: null,
      });

      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateSponsorSlots.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const nameInput = screen.getByRole("textbox", {
        name: /header logo vendor name/i,
      });
      await user.type(nameInput, "Acme Corp");

      const headerSwitch = screen.getByRole("switch", {
        name: /enable header logo/i,
      });
      await user.click(headerSwitch);

      const saveButton = screen.getByRole("button", {
        name: /save sponsor settings/i,
      });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          marketCenterId: "mc-123",
          sponsorSlots: expect.objectContaining({
            header: expect.objectContaining({
              enabled: true,
              name: "Acme Corp",
              imageKey: "img-1",
            }),
          }),
        });
      });
    });

    it("should disable the save button while the market center is not selected", () => {
      mockUseStore.mockReturnValue({ currentUser: { marketCenterId: null } });
      mockUseIsEnterprise.mockReturnValue({ isEnterprise: true });

      renderWithProviders(<SponsorSlotsSettings />);

      const saveButton = screen.getByRole("button", {
        name: /save sponsor settings/i,
      });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Preview dialog", () => {
    it("disables the Preview button until an image is uploaded", () => {
      renderWithProviders(<SponsorSlotsSettings />);

      const previewButton = screen.getByRole("button", {
        name: /preview header logo/i,
      });
      expect(previewButton).toBeDisabled();
    });

    it("enables the Preview button once an image exists", () => {
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-1",
              imageUrl: "https://cdn.example.com/img-1.png",
            },
            dashboardCard: emptySlot,
            ticketListRow: emptySlot,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const previewButton = screen.getByRole("button", {
        name: /preview header logo/i,
      });
      expect(previewButton).not.toBeDisabled();
    });

    it("renders the header replica with the typed vendor name, uploaded image, and header page context", async () => {
      const user = userEvent.setup();
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-1",
              imageUrl: "https://cdn.example.com/img-1.png",
            },
            dashboardCard: emptySlot,
            ticketListRow: emptySlot,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const nameInput = screen.getByRole("textbox", {
        name: /header logo vendor name/i,
      });
      await user.type(nameInput, "Acme Corp");

      const previewButton = screen.getByRole("button", {
        name: /preview header logo/i,
      });
      await user.click(previewButton);

      // Distinctive header-page context from the replica chrome.
      expect(
        screen.getByAltText("Conductor — Agent Ticketing System")
      ).toBeInTheDocument();

      // Live unsaved form value + uploaded image reflected in the replica.
      const img = screen.getByAltText("Acme Corp") as HTMLImageElement;
      expect(img.src).toBe("https://cdn.example.com/img-1.png");
    });

    it("renders the dashboard card replica embedded in the stats row context", async () => {
      const user = userEvent.setup();
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: emptySlot,
            dashboardCard: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-2",
              imageUrl: "https://cdn.example.com/img-2.png",
            },
            ticketListRow: emptySlot,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const previewButton = screen.getByRole("button", {
        name: /preview dashboard card/i,
      });
      await user.click(previewButton);

      // Distinctive dashboard-page context from the replica chrome.
      expect(screen.getByText("Active Tickets")).toBeInTheDocument();

      const img = screen.getByAltText("Sponsor") as HTMLImageElement;
      expect(img.src).toBe("https://cdn.example.com/img-2.png");
    });

    it("renders the ticket list replica embedded in the mock ticket table context", async () => {
      const user = userEvent.setup();
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: emptySlot,
            dashboardCard: emptySlot,
            ticketListRow: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-3",
              imageUrl: "https://cdn.example.com/img-3.png",
            },
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      const previewButton = screen.getByRole("button", {
        name: /preview ticket list ad/i,
      });
      await user.click(previewButton);

      // Distinctive ticket-list-page context: a mock ticket title + the
      // sponsored row's Sponsored badge.
      expect(
        screen.getByText("AC not cooling in unit 204")
      ).toBeInTheDocument();
      expect(screen.getByText("Sponsored")).toBeInTheDocument();
    });

    it("keeps the dashboardCard and ticketListRow Preview buttons disabled independently of header's uploaded image", () => {
      mockUseSponsorSlots.mockReturnValue({
        data: {
          sponsorSlots: {
            header: {
              enabled: false,
              name: "",
              linkUrl: "",
              imageKey: "img-1",
              imageUrl: "https://cdn.example.com/img-1.png",
            },
            dashboardCard: emptySlot,
            ticketListRow: emptySlot,
          },
        },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<SponsorSlotsSettings />);

      expect(
        screen.getByRole("button", { name: /preview header logo/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /preview dashboard card/i })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /preview ticket list ad/i })
      ).toBeDisabled();
    });
  });
});
