import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TicketReviewsReport from "./ticket-reviews-report";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TicketReview, TicketReviewsResponse } from "@/hooks/use-reports";

// Mock the hooks
const mockReportData: TicketReviewsResponse = {
  reviews: [
    {
      id: "review-1",
      ticketId: "ticket-1",
      ticketTitle: "Login Issue",
      surveyorName: "John Agent",
      assigneeName: "Jane Staff",
      marketCenterName: "Downtown MC",
      overallRating: 4.5,
      assigneeRating: 5.0,
      marketCenterRating: 4.0,
      comment: "Great service, very helpful!",
      completedAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "review-2",
      ticketId: "ticket-2",
      ticketTitle: "Password Reset",
      surveyorName: "Bob Agent",
      assigneeName: "Jane Staff",
      marketCenterName: "Downtown MC",
      overallRating: 3.5,
      assigneeRating: 4.0,
      marketCenterRating: 3.0,
      comment: null,
      completedAt: "2024-01-20T14:30:00Z",
    },
  ],
  totalReviews: 2,
  averageOverallRating: 4.0,
  averageAssigneeRating: 4.5,
  averageMarketCenterRating: 3.5,
};

vi.mock("@/hooks/use-reports", () => ({
  useFetchTicketReviewsReport: vi.fn(() => ({
    data: mockReportData,
    isLoading: false,
    error: null,
  })),
  ticketReviewsDefaultValues: {
    reviews: [],
    totalReviews: 0,
    averageOverallRating: null,
    averageAssigneeRating: null,
    averageMarketCenterRating: null,
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const defaultFilters = {
  marketCenterIds: [],
  categoryIds: [],
  dateFrom: undefined,
  dateTo: undefined,
  selectedPreset: undefined,
};

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

describe("TicketReviewsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility", () => {
    it("should be hidden when not selected", () => {
      const { container } = renderWithProviders(
        <TicketReviewsReport isSelected={false} filters={defaultFilters} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("hidden");
    });

    it("should be visible when selected", () => {
      const { container } = renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass("hidden");
    });
  });

  describe("Header and Summary", () => {
    it("should display the report title", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("Ticket Reviews")).toBeInTheDocument();
    });

    it("should display the total reviews count", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("Total Reviews: 2")).toBeInTheDocument();
    });

    it("should display average rating cards", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("Avg. Overall Rating")).toBeInTheDocument();
      expect(screen.getByText("Avg. Assignee Rating")).toBeInTheDocument();
      expect(screen.getByText("Avg. Market Center Rating")).toBeInTheDocument();
    });

    it("should display average rating values", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("4.00")).toBeInTheDocument();
      expect(screen.getByText("4.50")).toBeInTheDocument();
      expect(screen.getByText("3.50")).toBeInTheDocument();
    });
  });

  describe("Reviews Table", () => {
    it("should display table headers", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      // Get all column headers and check they exist
      const headers = screen.getAllByRole("columnheader");
      const headerNames = headers.map((h) => h.textContent);

      expect(headerNames).toContain("Date");
      expect(headerNames).toContain("Ticket");
      expect(headerNames).toContain("Surveyor");
      expect(headerNames).toContain("Overall");
      expect(headerNames).toContain("Details");
    });

    it("should display review rows", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("Login Issue")).toBeInTheDocument();
      expect(screen.getByText("Password Reset")).toBeInTheDocument();
      expect(screen.getByText("John Agent")).toBeInTheDocument();
      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    });

    it("should display formatted dates", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
      expect(screen.getByText("Jan 20, 2024")).toBeInTheDocument();
    });

    it("should display ticket links", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const loginLink = screen.getByRole("link", { name: /Login Issue/i });
      expect(loginLink).toHaveAttribute(
        "href",
        "/dashboard/tickets/ticket-1"
      );

      const passwordLink = screen.getByRole("link", { name: /Password Reset/i });
      expect(passwordLink).toHaveAttribute(
        "href",
        "/dashboard/tickets/ticket-2"
      );
    });

    it("should display view details buttons", () => {
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      expect(detailButtons).toHaveLength(2);
    });
  });

  describe("Review Detail Modal", () => {
    it("should open modal when view details button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      await user.click(detailButtons[0]);

      expect(screen.getByText("Survey Details")).toBeInTheDocument();
    });

    it("should display review details in modal", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      await user.click(detailButtons[0]);

      // Check modal content
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("Submitted By");
      expect(dialog).toHaveTextContent("Ratings");
      expect(dialog).toHaveTextContent("Comments");
    });

    it("should display comment in modal when available", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      await user.click(detailButtons[0]);

      expect(
        screen.getByText("Great service, very helpful!")
      ).toBeInTheDocument();
    });

    it("should display 'No comments provided' when comment is null", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      // Click the second review (which has null comment)
      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      await user.click(detailButtons[1]);

      expect(screen.getByText("No comments provided")).toBeInTheDocument();
    });

    it("should close modal when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      // Open modal
      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      await user.click(detailButtons[0]);

      expect(screen.getByText("Survey Details")).toBeInTheDocument();

      // Close modal - get the Close button inside the dialog
      const dialog = screen.getByRole("dialog");
      const closeButton = dialog.querySelector('button:last-of-type');
      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText("Survey Details")).not.toBeInTheDocument();
      });
    });

    it("should display market center name in modal when available", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      const detailButtons = screen.getAllByRole("button", {
        name: /View details/i,
      });
      await user.click(detailButtons[0]);

      // Check that the modal contains "Downtown MC" which is the market center name
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("Downtown MC");
    });
  });

  describe("Empty State", () => {
    it("should display empty message when no reviews", async () => {
      // Override the mock for this test
      const useReportsModule = await import("@/hooks/use-reports");
      vi.mocked(useReportsModule.useFetchTicketReviewsReport).mockReturnValueOnce({
        data: {
          reviews: [],
          totalReviews: 0,
          averageOverallRating: null,
          averageAssigneeRating: null,
          averageMarketCenterRating: null,
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <TicketReviewsReport isSelected={true} filters={defaultFilters} />
      );

      expect(screen.getByText("No reviews found")).toBeInTheDocument();
    });
  });
});
