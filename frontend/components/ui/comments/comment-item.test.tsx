import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentItem } from "./comment-item";
import { Comment, PrismaUser } from "@/lib/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the hooks
vi.mock("@/hooks/use-comments", () => ({
  useUpdateComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock the store
const mockCurrentUser: PrismaUser = {
  id: "user-1",
  clerkId: "clerk-1",
  email: "test@example.com",
  name: "Test User",
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

vi.mock("@/context/store-provider", () => ({
  useStore: () => ({
    currentUser: mockCurrentUser,
  }),
}));

const createComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "comment-1",
  content: "This is a test comment",
  ticketId: "ticket-1",
  userId: "user-2",
  internal: false,
  createdAt: new Date("2024-01-15T10:00:00Z"),
  user: {
    id: "user-2",
    clerkId: "clerk-2",
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
  },
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

describe("CommentItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Chat-style alignment", () => {
    it("aligns other users' comments to the left", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("mr-auto");
      expect(wrapper.className).not.toContain("ml-auto");
    });

    it("aligns own comments to the right", () => {
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("ml-auto");
      expect(wrapper.className).toContain("flex-row-reverse");
    });

    it("has max-width constraint for bubble styling", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("max-w-[85%]");
    });
  });

  describe("Bubble styling", () => {
    it("applies muted background for others' comments", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      const bubble = container.querySelector(".bg-muted");
      expect(bubble).toBeInTheDocument();
    });

    it("applies conductor color background for own comments", () => {
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} />
      );

      // Check for the conductor color class
      const bubble = container.querySelector('[class*="bg-[#6D1C24]"]');
      expect(bubble).toBeInTheDocument();
    });

    it("applies violet background for internal comments", () => {
      const comment = createComment({ internal: true });
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      const bubble = container.querySelector(".bg-violet-100");
      expect(bubble).toBeInTheDocument();
    });

    it("applies rounded-bl-sm for others' comments (left side)", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      const bubble = container.querySelector(".rounded-bl-sm");
      expect(bubble).toBeInTheDocument();
    });

    it("applies rounded-br-sm for own comments (right side)", () => {
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} />
      );

      const bubble = container.querySelector(".rounded-br-sm");
      expect(bubble).toBeInTheDocument();
    });
  });

  describe("Content display", () => {
    it("displays the commenter name", () => {
      const comment = createComment({ user: { ...mockCurrentUser, name: "Jane Doe" } });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("displays 'Unknown User' when name is not available", () => {
      const comment = createComment({ user: undefined });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      expect(screen.getByText("Unknown User")).toBeInTheDocument();
    });

    it("displays the Internal badge for internal comments", () => {
      const comment = createComment({ internal: true });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      expect(screen.getByText("Internal")).toBeInTheDocument();
    });

    it("does not display Internal badge for non-internal comments", () => {
      const comment = createComment({ internal: false });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      expect(screen.queryByText("Internal")).not.toBeInTheDocument();
    });

    it("displays avatar with user initials", () => {
      const comment = createComment({
        user: { ...mockCurrentUser, name: "John Smith" },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      expect(screen.getByText("JS")).toBeInTheDocument();
    });
  });

  describe("Edit/Delete controls", () => {
    it("shows edit and delete buttons for own comments", () => {
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} />
      );

      // The buttons are icon-only, so we look for the svg icons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("does not show edit/delete buttons for others' comments", () => {
      const comment = createComment();
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} />
      );

      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });

    it("enters edit mode when edit button is clicked", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} />
      );

      const buttons = screen.getAllByRole("button");
      // First button should be edit
      await user.click(buttons[0]);

      // Should now show a textarea and save/cancel buttons
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });
});
