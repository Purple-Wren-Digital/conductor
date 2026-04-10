import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BaseTicketForm, type TicketFormValues } from "./base-ticket-form";
import type { Urgency } from "@/lib/types";

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
      email: "staff@test.com",
      name: "Staff User",
      role: "STAFF",
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

// Track what values the categories hook receives
let categoriesHookArg: string | undefined;

vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: () => ({
    data: { marketCenters: [mockMarketCenter] },
    isLoading: false,
  }),
  useFetchMarketCenter: () => ({
    data: mockMarketCenter,
  }),
  useFetchMarketCenterCategories: (mcId?: string) => {
    categoriesHookArg = mcId;
    if (!mcId) {
      return { data: null, isLoading: false };
    }
    return {
      data: { categories: mockCategories },
      isLoading: false,
    };
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
      name: "Test User",
      role: "ADMIN",
    },
  }),
}));

// ── Helpers ─────────────────────────────────────────────────────────

const defaultValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency,
  categoryId: "",
  dueDate: undefined,
  assigneeId: "Unassigned",
  todos: [],
};

function renderForm(overrides: Partial<Parameters<typeof BaseTicketForm>[0]> = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <BaseTicketForm
        isOpen={true}
        onClose={vi.fn()}
        values={defaultValues}
        errors={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        titleText="Create New Ticket"
        marketCenterId="mc-1"
        disabled={false}
        {...overrides}
      />
    </QueryClientProvider>
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe("BaseTicketForm - Rendering", () => {
  beforeEach(() => {
    categoriesHookArg = undefined;
  });

  it("renders category options when marketCenterId is provided", async () => {
    renderForm({ marketCenterId: "mc-1" });

    await waitFor(() => {
      expect(screen.getByText("General")).toBeInTheDocument();
      expect(screen.getByText("Technical Support")).toBeInTheDocument();
    });
  });

  it("passes marketCenterId to the categories hook", () => {
    renderForm({ marketCenterId: "mc-1" });

    expect(categoriesHookArg).toBe("mc-1");
  });

  it("falls back to currentUser.marketCenterId when prop is null", () => {
    renderForm({ marketCenterId: null });

    // currentUser.marketCenterId is "mc-1" from the mock
    expect(categoriesHookArg).toBe("mc-1");
  });

  it("renders the form title", async () => {
    renderForm({ titleText: "Create New Ticket" });

    await waitFor(() => {
      expect(screen.getByText("Create New Ticket")).toBeInTheDocument();
    });
  });

  it("renders template select when showTemplateSelect is true", async () => {
    const templates = [
      {
        id: "tpl-1",
        name: "Bug Report",
        title: "Bug",
        ticketDescription: "desc",
        urgency: "HIGH" as Urgency,
        categoryId: "cat-1",
        todos: [],
        marketCenterId: "mc-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    renderForm({
      showTemplateSelect: true,
      templates,
      selectedTemplateId: "",
      onChangeTemplateId: vi.fn(),
    });

    await waitFor(() => {
      expect(screen.getByText("Template (Optional)")).toBeInTheDocument();
    });
  });
});
