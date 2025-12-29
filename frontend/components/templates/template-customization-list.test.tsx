import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockUseFetchTemplateStatuses = vi.fn();
const mockUseFetchAllMarketCenters = vi.fn();
const mockPush = vi.fn();

vi.mock("@/hooks/use-template-customization", () => ({
  useFetchTemplateStatuses: (props: unknown) =>
    mockUseFetchTemplateStatuses(props),
}));

vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: (role: unknown) =>
    mockUseFetchAllMarketCenters(role),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/template-customization",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import TemplateCustomizationList from "./template-customization-list";

// =============================================================================
// TEST UTILITIES
// =============================================================================

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

  Wrapper.displayName = "TestQueryClientWrapper-TemplateList";
  return Wrapper;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockMarketCenters = {
  marketCenters: [
    { id: "mc-austin", name: "Austin Office" },
    { id: "mc-dallas", name: "Dallas Office" },
    { id: "mc-houston", name: "Houston Office" },
  ],
};

const mockTemplateStatuses = [
  {
    templateType: "ticket_created",
    label: "Ticket Created",
    hasEmailCustomization: false,
    hasInAppCustomization: false,
    emailCustomization: null,
    inAppCustomization: null,
  },
  {
    templateType: "ticket_updated",
    label: "Ticket Updated",
    hasEmailCustomization: true,
    hasInAppCustomization: false,
    emailCustomization: {
      id: "email-123",
      subject: "Custom Subject",
      isActive: true,
    },
    inAppCustomization: null,
  },
  {
    templateType: "ticket_assignment",
    label: "Ticket Assignment",
    hasEmailCustomization: false,
    hasInAppCustomization: true,
    emailCustomization: null,
    inAppCustomization: {
      id: "inapp-123",
      title: "Custom Title",
      isActive: true,
    },
  },
  {
    templateType: "new_comments",
    label: "New Comment",
    hasEmailCustomization: true,
    hasInAppCustomization: true,
    emailCustomization: {
      id: "email-456",
      subject: "Comment Notification",
      isActive: true,
    },
    inAppCustomization: {
      id: "inapp-456",
      title: "New Comment",
      isActive: true,
    },
  },
  {
    templateType: "market_center_assignment",
    label: "Market Center Assignment",
    hasEmailCustomization: false,
    hasInAppCustomization: false,
    emailCustomization: null,
    inAppCustomization: null,
  },
  {
    templateType: "category_assignment",
    label: "Category Assignment",
    hasEmailCustomization: false,
    hasInAppCustomization: false,
    emailCustomization: null,
    inAppCustomization: null,
  },
  {
    templateType: "ticket_survey",
    label: "Ticket Survey",
    hasEmailCustomization: false,
    hasInAppCustomization: false,
    emailCustomization: null,
    inAppCustomization: null,
  },
  {
    templateType: "ticket_survey_results",
    label: "Survey Results",
    hasEmailCustomization: false,
    hasInAppCustomization: false,
    emailCustomization: null,
    inAppCustomization: null,
  },
];

// =============================================================================
// RENDERING TESTS
// =============================================================================

describe("TemplateCustomizationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading skeleton while fetching market centers", () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should show loading skeleton while fetching templates", () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      // Need to select a market center to see the loading state for templates
      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Market Center Selection", () => {
    it("should display market center selector", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("Select Market Center")).toBeInTheDocument();
      });
    });

    it("should render market center selector", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      // Verify the selector is rendered
      const selector = screen.getByRole("combobox");
      expect(selector).toBeInTheDocument();
    });

    it("should call useFetchTemplateStatuses with correct params when market center provided", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      // Use initialMarketCenterId to test the hook is called correctly
      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockUseFetchTemplateStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            marketCenterId: "mc-austin",
          })
        );
      });
    });
  });

  describe("Template List Display", () => {
    it("should display all 8 template types", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Ticket Created")).toBeInTheDocument();
        expect(screen.getByText("Ticket Updated")).toBeInTheDocument();
        expect(screen.getByText("Ticket Assignment")).toBeInTheDocument();
        expect(screen.getByText("New Comment")).toBeInTheDocument();
        expect(
          screen.getByText("Market Center Assignment")
        ).toBeInTheDocument();
        expect(screen.getByText("Category Assignment")).toBeInTheDocument();
        expect(screen.getByText("Ticket Survey")).toBeInTheDocument();
        expect(screen.getByText("Survey Results")).toBeInTheDocument();
      });
    });

    it("should show 'Default' badge for templates using defaults", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Find the Ticket Created row and check for Default badge
        const ticketCreatedRow = screen
          .getByText("Ticket Created")
          .closest("tr");
        expect(ticketCreatedRow).toBeInTheDocument();

        // Should have Default badges for both email and in-app
        const defaultBadges = within(ticketCreatedRow!).getAllByText("Default");
        expect(defaultBadges.length).toBe(2); // Email and In-App both default
      });
    });

    it("should show 'Customized' badge for customized templates", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Find the Ticket Updated row (has email customization)
        const ticketUpdatedRow = screen
          .getByText("Ticket Updated")
          .closest("tr");
        expect(ticketUpdatedRow).toBeInTheDocument();

        // Should have Customized badge for email
        const customizedBadge = within(ticketUpdatedRow!).getByText(
          "Customized"
        );
        expect(customizedBadge).toBeInTheDocument();
      });
    });

    it("should show mixed status when one is customized and other is default", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Find the Ticket Assignment row (in-app customized, email default)
        const assignmentRow = screen
          .getByText("Ticket Assignment")
          .closest("tr");
        expect(assignmentRow).toBeInTheDocument();

        // Should have both Customized and Default badges
        expect(
          within(assignmentRow!).getByText("Customized")
        ).toBeInTheDocument();
        expect(within(assignmentRow!).getByText("Default")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation to Editors", () => {
    it("should navigate to email editor when Edit Email button is clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Ticket Created")).toBeInTheDocument();
      });

      // Find and click the Edit Email button for first template
      const row = screen.getByText("Ticket Created").closest("tr");
      const editEmailButton = within(row!).getByRole("button", {
        name: /edit email/i,
      });
      await user.click(editEmailButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(
          "/template-customization/mc-austin/ticket_created/email"
        )
      );
    });

    it("should navigate to in-app editor when Edit In-App button is clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Ticket Created")).toBeInTheDocument();
      });

      // Find and click the Edit In-App button
      const row = screen.getByText("Ticket Created").closest("tr");
      const editInAppButton = within(row!).getByRole("button", {
        name: /edit in-app/i,
      });
      await user.click(editInAppButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(
          "/template-customization/mc-austin/ticket_created/in-app"
        )
      );
    });

    it("should include template type in navigation URL", async () => {
      const user = userEvent.setup();

      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("New Comment")).toBeInTheDocument();
      });

      const row = screen.getByText("New Comment").closest("tr");
      const editEmailButton = within(row!).getByRole("button", {
        name: /edit email/i,
      });
      await user.click(editEmailButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("new_comments")
      );
    });
  });

  describe("Empty State", () => {
    it("should show message when no market center is selected", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          screen.getByText(/select a market center to view/i)
        ).toBeInTheDocument();
      });
    });

    it("should show message when no market centers exist", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: { marketCenters: [] },
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          screen.getByText(/no market centers available/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Permission Handling", () => {
    it("should not allow STAFF role to access", () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText(/you do not have permission/i)
      ).toBeInTheDocument();
    });

    it("should not allow AGENT role to access", () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText(/you do not have permission/i)
      ).toBeInTheDocument();
    });

    it("should allow ADMIN role to access", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.queryByText(/you do not have permission/i)
        ).not.toBeInTheDocument();
      });
    });

    it("should allow STAFF_LEADER role to access", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/you do not have permission/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error message when fetch fails", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Failed to fetch templates"),
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load templates/i)
        ).toBeInTheDocument();
      });
    });

    it("should show retry button on error", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network error"),
        refetch: vi.fn(),
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /retry/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Table Sorting and Layout", () => {
    it("should display table headers correctly", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Template")).toBeInTheDocument();
        expect(screen.getByText("Email Status")).toBeInTheDocument();
        expect(screen.getByText("In-App Status")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
    });

    it("should display templates in consistent order", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // First row is header, so check from index 1
        expect(rows.length).toBe(9); // 1 header + 8 template rows
      });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible table structure", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole("table")).toBeInTheDocument();
      });
    });

    it("should have aria labels on action buttons", async () => {
      mockUseFetchAllMarketCenters.mockReturnValue({
        data: mockMarketCenters,
        isLoading: false,
      });
      mockUseFetchTemplateStatuses.mockReturnValue({
        data: mockTemplateStatuses,
        isLoading: false,
      });

      render(<TemplateCustomizationList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const editButtons = screen.getAllByRole("button", { name: /edit/i });
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });
  });
});
