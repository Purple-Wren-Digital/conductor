import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentItem } from "./comment-item";
import { Comment, ConductorUser } from "@/lib/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the tiptap editor
vi.mock("@/components/ui/tiptap/basic-editor-and-toolbar", () => ({
  BasicEditorWithToolbar: ({
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      data-testid="tiptap-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
}));

// Mock the SafeHtml component
vi.mock("@/components/ui/safe-html", () => ({
  SafeHtml: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="safe-html" className={className}>
      {content}
    </div>
  ),
}));

// Mock the hooks
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@/hooks/use-comments", () => ({
  useUpdateComment: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteComment: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the store
const mockCurrentUser: ConductorUser = {
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
  source: "WEB",
  metadata: {},
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
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      const wrapper = container.querySelector(".mr-auto");
      expect(wrapper).toBeInTheDocument();
    });

    it("aligns own comments to the right", () => {
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      const wrapper = container.querySelector(".ml-auto");
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.className).toContain("flex-row-reverse");
    });

    it("has max-width constraint for bubble styling", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      const wrapper = container.querySelector('[class*="max-w-"]');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Bubble styling", () => {
    it("applies muted background for others' comments", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
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
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Check for the conductor color class
      const bubble = container.querySelector('[class*="bg-[#6D1C24]"]');
      expect(bubble).toBeInTheDocument();
    });

    it("applies violet background for internal comments", () => {
      const comment = createComment({ internal: true });
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      const bubble = container.querySelector(".bg-violet-100");
      expect(bubble).toBeInTheDocument();
    });

    it("applies rounded-bl-sm for others' comments (left side)", () => {
      const comment = createComment();
      const { container } = renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
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
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      const bubble = container.querySelector(".rounded-br-sm");
      expect(bubble).toBeInTheDocument();
    });
  });

  describe("Content display", () => {
    it("displays the commenter name", () => {
      const comment = createComment({ user: { ...mockCurrentUser, name: "Jane Doe" } });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("displays 'Unknown User' when name is not available", () => {
      const comment = createComment({ user: undefined });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      expect(screen.getByText("Unknown User")).toBeInTheDocument();
    });

    it("displays the Internal badge for internal comments", () => {
      const comment = createComment({ internal: true });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      expect(screen.getByText("Internal")).toBeInTheDocument();
    });

    it("does not display Internal badge for non-internal comments", () => {
      const comment = createComment({ internal: false });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      expect(screen.queryByText("Internal")).not.toBeInTheDocument();
    });

    it("displays avatar with user initials", () => {
      const comment = createComment({
        user: { ...mockCurrentUser, name: "John Smith" },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      expect(screen.getByText("JS")).toBeInTheDocument();
    });

    it("renders comment content using SafeHtml", () => {
      const comment = createComment({ content: "<p>Rich text content</p>" });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
      );

      const safeHtml = screen.getByTestId("safe-html");
      expect(safeHtml).toBeInTheDocument();
      expect(safeHtml).toHaveTextContent("<p>Rich text content</p>");
    });
  });

  describe("Edit/Delete controls", () => {
    it("shows edit and delete buttons for own comments", () => {
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // The buttons are icon-only, so we look for the svg icons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("does not show edit/delete buttons for others' comments", () => {
      const comment = createComment();
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={false} refreshAllData={vi.fn()} />
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
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      const buttons = screen.getAllByRole("button");
      // First button should be edit
      await user.click(buttons[0]);

      // Should now show the tiptap editor and save/cancel buttons
      expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("exits edit mode when cancel is clicked", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Enter edit mode
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[0]);

      // Click cancel
      await user.click(screen.getByText("Cancel"));

      // Should exit edit mode
      expect(screen.queryByTestId("tiptap-editor")).not.toBeInTheDocument();
    });

    it("calls update mutation when save is clicked with changed content", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
        content: "Original content",
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Enter edit mode
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[0]);

      // Change content
      const editor = screen.getByTestId("tiptap-editor");
      await user.clear(editor);
      await user.type(editor, "Updated content");

      // Click save
      await user.click(screen.getByText("Save"));

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: "ticket-1",
          commentId: "comment-1",
          content: "Updated content",
        }),
        expect.any(Object)
      );
    });
  });

  describe("Delete dialog", () => {
    it("opens delete confirmation dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Click delete button (second button)
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[1]);

      // Dialog should be open
      expect(screen.getByText("Are you sure you want to delete your comment?")).toBeInTheDocument();
      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    });

    it("shows comment content in delete confirmation dialog", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
        content: "Comment to be deleted",
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Click delete button
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[1]);

      // The dialog should show the comment content via SafeHtml
      const safeHtmlElements = screen.getAllByTestId("safe-html");
      expect(safeHtmlElements.length).toBeGreaterThanOrEqual(2); // One in comment, one in dialog
    });

    it("closes delete dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Open dialog
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[1]);

      // Click Cancel in dialog
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByText("Are you sure you want to delete your comment?")).not.toBeInTheDocument();
      });
    });

    it("calls delete mutation when delete is confirmed", async () => {
      const user = userEvent.setup();
      const comment = createComment({
        userId: "user-1",
        user: { ...mockCurrentUser },
      });
      renderWithProviders(
        <CommentItem comment={comment} ticketId="ticket-1" isOwn={true} refreshAllData={vi.fn()} />
      );

      // Open dialog
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[1]);

      // Click Delete in dialog
      await user.click(screen.getByRole("button", { name: "Delete" }));

      expect(mockDeleteMutate).toHaveBeenCalledWith(
        {
          ticketId: "ticket-1",
          commentId: "comment-1",
        },
        expect.any(Object)
      );
    });
  });
});
