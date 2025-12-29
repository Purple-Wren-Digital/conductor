import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MarketCenterNotificationPreferences from "./market-center-notification-preferences";
import type { NotificationPreferences } from "@/lib/types";

// Mock the hooks
const mockUseFetchMarketCenterNotificationPreferences = vi.fn();

vi.mock("@/hooks/use-market-center", () => ({
  useFetchMarketCenterNotificationPreferences: (props: unknown) =>
    mockUseFetchMarketCenterNotificationPreferences(props),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
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

  Wrapper.displayName =
    "TestQueryClientWrapper-MarketCenterNotificationPreferences";

  return Wrapper;
}

const mockNotificationPreferences: NotificationPreferences[] = [
  {
    id: "1",
    frequency: "INSTANT",
    category: "ACTIVITY",
    type: "ticket_created",
    email: true,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "mc-settings-1",
  },
  {
    id: "2",
    frequency: "INSTANT",
    category: "ACTIVITY",
    type: "ticket_assigned",
    email: true,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "mc-settings-1",
  },
  {
    id: "3",
    frequency: "INSTANT",
    category: "ACTIVITY",
    type: "ticket_resolved",
    email: false,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "mc-settings-1",
  },
  {
    id: "4",
    frequency: "INSTANT",
    category: "ACTIVITY",
    type: "comment_added",
    email: true,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "mc-settings-1",
  },
];

describe("MarketCenterNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while data is loading", () => {
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={false}
      />,
      {
        wrapper: createWrapper(),
      }
    );

    // Should show skeleton loading elements
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays notification preferences after data loads", async () => {
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: {
        notificationPreferences: mockNotificationPreferences,
      },
      isLoading: false,
    });

    render(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={false}
      />,
      {
        wrapper: createWrapper(),
      }
    );

    // Wait for data to be displayed
    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    // Check that the description is shown
    expect(
      screen.getByText(
        "Enable or disable app activity notifications for your market center"
      )
    ).toBeInTheDocument();

    // Check that preference types are shown (with underscores replaced by spaces)
    expect(screen.getByText("ticket created")).toBeInTheDocument();
    expect(screen.getByText("ticket assigned")).toBeInTheDocument();
  });

  it("syncs local state when fetched data changes", async () => {
    // Start with loading
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { rerender } = render(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={true}
      />,
      { wrapper: createWrapper() }
    );

    // Should show loading skeletons initially
    let skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);

    // Now simulate data loaded
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: {
        notificationPreferences: mockNotificationPreferences,
      },
      isLoading: false,
    });

    rerender(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={false}
      />
    );

    // Wait for data to be displayed - preference cards should be shown
    await waitFor(() => {
      expect(screen.getByText("ticket created")).toBeInTheDocument();
    });

    // Other preferences should also be visible
    expect(screen.getByText("ticket assigned")).toBeInTheDocument();
    expect(screen.getByText("ticket resolved")).toBeInTheDocument();
    expect(screen.getByText("comment added")).toBeInTheDocument();
  });

  it("shows Loading text on save button while loading", () => {
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={false}
      />,
      {
        wrapper: createWrapper(),
      }
    );

    const saveButton = screen.getByRole("button", { name: /loading/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when no changes have been made", async () => {
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: {
        notificationPreferences: mockNotificationPreferences,
      },
      isLoading: false,
    });

    render(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={false}
      />,
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", {
      name: /save preferences/i,
    });
    expect(saveButton).toBeDisabled();
  });

  it("renders 4 skeleton cards while loading", () => {
    mockUseFetchMarketCenterNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <MarketCenterNotificationPreferences
        marketCenterId="mc-123"
        isLoadingMarketCenters={false}
      />,
      {
        wrapper: createWrapper(),
      }
    );

    // The loading state renders 4 skeleton cards
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    // Each card has multiple skeleton elements (title + 3 rows with 2 skeletons each = 7 per card, 4 cards = 28)
    expect(skeletons.length).toBeGreaterThanOrEqual(20);
  });
});
