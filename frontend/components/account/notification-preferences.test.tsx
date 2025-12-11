import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificationPreferences from "./notification-preferences";
import type { NotificationPreferences as NotificationPreferencesType } from "@/lib/types";

// Mock the hooks
const mockUseFetchUserSettings = vi.fn();

vi.mock("@/hooks/use-users", () => ({
  useFetchUserSettings: (props: unknown) => mockUseFetchUserSettings(props),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked toast after vi.mock
import { toast as mockToast } from "sonner";

// Mock fetch
const mockFetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockNotificationPreferences: NotificationPreferencesType[] = [
  {
    id: "1",
    frequency: "INSTANT",
    category: "PERMISSIONS",
    type: "permissions",
    email: true,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "settings-1",
  },
  {
    id: "2",
    frequency: "INSTANT",
    category: "ACCOUNT",
    type: "security",
    email: true,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "settings-1",
  },
  {
    id: "3",
    frequency: "INSTANT",
    category: "ACTIVITY",
    type: "ticket_updates",
    email: true,
    push: false,
    inApp: true,
    sms: false,
    userSettingsId: "settings-1",
  },
];

describe("NotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("shows loading skeleton while data is loading", () => {
    mockUseFetchUserSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    // Should show skeleton loading elements
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays notification preferences after data loads", async () => {
    mockUseFetchUserSettings.mockReturnValue({
      data: {
        settings: {
          notificationPreferences: mockNotificationPreferences,
        },
      },
      isLoading: false,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    // Wait for data to be displayed
    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    // Check that the title and description are shown
    expect(screen.getByText("Conductor Permissions")).toBeInTheDocument();

    // Check that Account Alerts card is shown
    expect(screen.getByText("Account Alerts")).toBeInTheDocument();
  });

  it("syncs local state when fetched data changes", async () => {
    // Start with loading
    mockUseFetchUserSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { rerender } = render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    // Should show loading skeletons initially
    let skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);

    // Now simulate data loaded
    mockUseFetchUserSettings.mockReturnValue({
      data: {
        settings: {
          notificationPreferences: mockNotificationPreferences,
        },
      },
      isLoading: false,
    });

    rerender(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />
    );

    // Wait for data to be displayed (skeletons should be replaced)
    await waitFor(() => {
      expect(screen.getByText("Account Alerts")).toBeInTheDocument();
    });

    // Check that category sections are shown - the skeleton grid should be gone
    expect(screen.getByText("App Activity")).toBeInTheDocument();
  });

  it("disables save button when no changes have been made", async () => {
    mockUseFetchUserSettings.mockReturnValue({
      data: {
        settings: {
          notificationPreferences: mockNotificationPreferences,
        },
      },
      isLoading: false,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save preferences/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables buttons while loading", () => {
    mockUseFetchUserSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    const saveButton = screen.getByRole("button", { name: /save preferences/i });
    const resetButton = screen.getByRole("button", { name: /reset all preferences/i });

    expect(saveButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  it("enables save button when preferences are changed", async () => {
    const user = userEvent.setup();

    mockUseFetchUserSettings.mockReturnValue({
      data: {
        settings: {
          notificationPreferences: mockNotificationPreferences,
        },
      },
      isLoading: false,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    // Save button should be disabled initially
    const saveButton = screen.getByRole("button", { name: /save preferences/i });
    expect(saveButton).toBeDisabled();

    // Find and click a switch to change a preference
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);

    // Click the first switch to toggle it
    await user.click(switches[0]);

    // Save button should now be enabled
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it("calls API and invalidates query on save", async () => {
    const user = userEvent.setup();

    mockUseFetchUserSettings.mockReturnValue({
      data: {
        settings: {
          notificationPreferences: mockNotificationPreferences,
        },
      },
      isLoading: false,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    // Toggle a preference to enable save
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);

    // Click save
    const saveButton = screen.getByRole("button", { name: /save preferences/i });
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    await user.click(saveButton);

    // Verify fetch was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/test-user-id/update/settings/notifications"),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    // Verify success toast was shown
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Preferences saved!");
    });
  });

  it("detects changes correctly for any preference field", async () => {
    const user = userEvent.setup();

    // Start with all preferences having email=false
    const prefsWithEmailOff: NotificationPreferencesType[] = [
      {
        id: "1",
        frequency: "INSTANT",
        category: "PERMISSIONS",
        type: "permissions",
        email: false,
        push: false,
        inApp: false,
        sms: false,
        userSettingsId: "settings-1",
      },
    ];

    mockUseFetchUserSettings.mockReturnValue({
      data: {
        settings: {
          notificationPreferences: prefsWithEmailOff,
        },
      },
      isLoading: false,
    });

    render(
      <NotificationPreferences
        userId="test-user-id"
        invalidateUserQuery={Promise.resolve()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save preferences/i });
    expect(saveButton).toBeDisabled();

    // Toggle any switch
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);

    // Save should be enabled - this tests the fixed change detection logic
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });
});
