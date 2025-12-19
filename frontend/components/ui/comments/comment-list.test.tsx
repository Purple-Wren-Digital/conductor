import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentList } from "./comment-list";
import { Comment, PrismaUser } from "@/lib/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock current user
const mockCurrentUser: PrismaUser = {
  id: "current-user-id",
  clerkId: "clerk-current",
  email: "current@example.com",
  name: "Current User",
  role: "AGENT",
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  comments: [],
  marketCenterId: null,
  _count: {
    assignedTickets: 0,
    createdTickets: 0,
    comments: 0,
    defaultForCategories: 0,
  },
};

const otherUser: PrismaUser = {
  id: "other-user-id",
  clerkId: "clerk-other",
  email: "other@example.com",
  name: "Other User",
  role: "STAFF",
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  comments: [],
  marketCenterId: null,
  _count: {
    assignedTickets: 0,
    createdTickets: 0,
    comments: 0,
    defaultForCategories: 0,
  },
};

// Mock store
vi.mock("@/context/store-provider", () => ({
  useStore: () => ({
    currentUser: mockCurrentUser,
  }),
}));

// Variable to control mock return values
let mockCommentsData: Comment[] | undefined;
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks/use-comments", () => ({
  useComments: () => ({
    data: mockCommentsData,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: vi.fn(),
  }),
  useUpdateComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const createComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "comment-1",
  content: "Test comment content",
  ticketId: "ticket-1",
  userId: "other-user-id",
  internal: false,
  source: "WEB",
  metadata: {},
  createdAt: new Date("2024-01-15T10:00:00Z"),
  user: otherUser,
  ...overrides,
});

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

describe("CommentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommentsData = undefined;
    mockIsLoading = false;
    mockError = null;
  });

  describe("Loading state", () => {
    it("shows loading skeleton when loading", () => {
      mockIsLoading = true;
      const { container } = renderWithProviders(
        <CommentList ticketId="ticket-1" />
      );

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("shows error message when there is an error", () => {
      mockError = new Error("Failed to load");
      renderWithProviders(<CommentList ticketId="ticket-1" />);

      expect(screen.getByText("Error loading comments")).toBeInTheDocument();
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when no comments", () => {
      mockCommentsData = [];
      renderWithProviders(<CommentList ticketId="ticket-1" />);

      expect(
        screen.getByText("No comments yet. Be the first to comment!")
      ).toBeInTheDocument();
    });
  });

  describe("Comment rendering with isOwn prop", () => {
    it("renders comments with correct isOwn prop for other users", () => {
      mockCommentsData = [createComment({ id: "comment-1" })];
      const { container } = renderWithProviders(
        <CommentList ticketId="ticket-1" />
      );

      // Other user's comment should be aligned left (mr-auto)
      const commentWrapper = container.querySelector(".mr-auto");
      expect(commentWrapper).toBeInTheDocument();
    });

    it("renders comments with correct isOwn prop for current user", () => {
      mockCommentsData = [
        createComment({
          id: "comment-own",
          userId: "current-user-id",
          user: mockCurrentUser,
        }),
      ];
      const { container } = renderWithProviders(
        <CommentList ticketId="ticket-1" />
      );

      // Own comment should be aligned right (ml-auto)
      const commentWrapper = container.querySelector(".ml-auto");
      expect(commentWrapper).toBeInTheDocument();
    });

    it("renders mixed comments with correct alignment", () => {
      mockCommentsData = [
        createComment({
          id: "comment-other",
          userId: "other-user-id",
          user: otherUser,
          content: "Message from other user",
        }),
        createComment({
          id: "comment-own",
          userId: "current-user-id",
          user: mockCurrentUser,
          content: "Message from current user",
        }),
      ];
      const { container } = renderWithProviders(
        <CommentList ticketId="ticket-1" />
      );

      // Should have one left-aligned and one right-aligned
      const leftAligned = container.querySelectorAll(".mr-auto");
      const rightAligned = container.querySelectorAll(".ml-auto");

      expect(leftAligned).toHaveLength(1);
      expect(rightAligned).toHaveLength(1);
    });

    it("handles multiple comments from the same user", () => {
      mockCommentsData = [
        createComment({
          id: "comment-1",
          userId: "current-user-id",
          user: mockCurrentUser,
        }),
        createComment({
          id: "comment-2",
          userId: "current-user-id",
          user: mockCurrentUser,
        }),
      ];
      const { container } = renderWithProviders(
        <CommentList ticketId="ticket-1" />
      );

      // Both should be right-aligned
      const rightAligned = container.querySelectorAll(".ml-auto");
      expect(rightAligned).toHaveLength(2);
    });
  });

  describe("Comment spacing", () => {
    it("has proper spacing between comments", () => {
      mockCommentsData = [
        createComment({ id: "comment-1" }),
        createComment({ id: "comment-2" }),
      ];
      const { container } = renderWithProviders(
        <CommentList ticketId="ticket-1" />
      );

      // Check for space-y-3 class on container
      const spacedContainer = container.querySelector(".space-y-3");
      expect(spacedContainer).toBeInTheDocument();
    });
  });
});
