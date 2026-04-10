import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTicketForm } from "./create-ticket-form";

// ── Polyfills ───────────────────────────────────────────────────────

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Mocks ──────────────────────────────────────────────────────────

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

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/utils/notifications", () => ({
  createAndSendNotification: vi.fn(),
}));

// Stable getToken reference to prevent infinite useEffect loops
const stableGetToken = vi.fn().mockResolvedValue("mock-token");

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: stableGetToken,
    isLoaded: true,
    isSignedIn: true,
    userId: "test-user-id",
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "test-user-id" },
  }),
}));

const mockCategories = [
  {
    id: "cat-1",
    name: "General",
    description: "General requests",
    marketCenterId: "mc-1",
    defaultAssigneeId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "cat-2",
    name: "Technical Support",
    description: "Tech issues",
    marketCenterId: "mc-1",
    defaultAssigneeId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockMarketCenter = {
  id: "mc-1",
  name: "Test Market Center",
  users: [
    {
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
      clerkId: "clerk-1",
      isActive: true,
      marketCenterId: "mc-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  ticketCategories: mockCategories,
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  totalTickets: 0,
};

const mockTemplates = [
  {
    id: "tpl-1",
    name: "Bug Report",
    title: "Bug",
    ticketDescription: "Describe the bug",
    urgency: "HIGH",
    categoryId: "cat-1",
    todos: [],
    marketCenterId: "mc-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock fetch for templates endpoint
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: () => ({
    data: { marketCenters: [mockMarketCenter] },
    isLoading: false,
  }),
  useFetchMarketCenter: () => ({
    data: mockMarketCenter,
  }),
  useFetchMarketCenterCategories: (mcId?: string) => {
    if (!mcId) return { data: null, isLoading: false };
    return { data: { categories: mockCategories }, isLoading: false };
  },
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => ({
    role: "ADMIN",
    permissions: {
      canCreateTicket: true,
      canReassignTicket: true,
      canUnassignTicket: true,
      canManageTicketTemplateSettings: true,
    },
    isSuperuser: false,
    isLoading: false,
  }),
}));

vi.mock("@/context/store-provider", () => ({
  useStore: () => ({
    currentUser: {
      id: "user-1",
      marketCenterId: "mc-1",
      name: "Admin User",
      role: "ADMIN",
    },
  }),
}));

// ── Helpers ─────────────────────────────────────────────────────────

function renderForm(overrides: Partial<Parameters<typeof CreateTicketForm>[0]> = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <CreateTicketForm
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe("CreateTicketForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates }),
    });
  });

  it("computes marketCenterId from currentUser immediately (no useState delay)", () => {
    renderForm();

    // The form title should render (not stuck in loading) because
    // marketCenterId is derived inline from currentUser.marketCenterId
    expect(screen.getByText("Create New Ticket")).toBeInTheDocument();
  });

  it("renders categories from currentUser's MC on first render", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("General")).toBeInTheDocument();
      expect(screen.getByText("Technical Support")).toBeInTheDocument();
    });
  });

  it("fetches templates on open using the correct MC ID", async () => {
    renderForm();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/ticket-templates/mc-1"),
        expect.any(Object)
      );
    });
  });

  it("renders template select section", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Template (Optional)")).toBeInTheDocument();
    });
  });

  it("uses externalMcId over currentUser.marketCenterId when provided", async () => {
    renderForm({ selectedMarketCenterId: "mc-external" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/ticket-templates/mc-external"),
        expect.any(Object)
      );
    });
  });

  it("ignores externalMcId when it is 'all'", async () => {
    renderForm({ selectedMarketCenterId: "all" });

    await waitFor(() => {
      // Should fall back to currentUser.marketCenterId = "mc-1"
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/ticket-templates/mc-1"),
        expect.any(Object)
      );
    });
  });
});
