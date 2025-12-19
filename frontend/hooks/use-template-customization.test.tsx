import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockGetToken = vi.fn().mockResolvedValue("mock-token");

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    isLoaded: true,
    isSignedIn: true,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import {
  useFetchTemplateStatuses,
  useFetchTemplateForEditing,
  useSaveEmailTemplate,
  useSaveInAppTemplate,
  useResetEmailTemplate,
  useResetInAppTemplate,
  usePreviewEmailTemplate,
  usePreviewInAppTemplate,
} from "./use-template-customization";

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

  Wrapper.displayName = "TestQueryClientWrapper-TemplateCustomization";
  return Wrapper;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockTemplateStatuses = {
  templates: [
    {
      templateType: "TICKET_CREATED",
      label: "Ticket Created",
      hasEmailCustomization: false,
      hasInAppCustomization: false,
      emailCustomization: null,
      inAppCustomization: null,
    },
    {
      templateType: "TICKET_UPDATED",
      label: "Ticket Updated",
      hasEmailCustomization: true,
      hasInAppCustomization: false,
      emailCustomization: {
        id: "email-123",
        marketCenterId: "mc-austin",
        templateType: "TICKET_UPDATED",
        subject: "Custom Subject",
        greeting: "Custom Greeting",
        mainMessage: "<p>Custom Message</p>",
        buttonText: "Custom Button",
        visibleFields: ["ticket_number"],
        isActive: true,
      },
      inAppCustomization: null,
    },
  ],
};

const mockTemplateForEditing = {
  template: {
    templateType: "TICKET_CREATED",
    label: "Ticket Created",
    variables: [
      { key: "user_name", label: "User Name", description: "Recipient name", example: "John" },
      { key: "ticket_number", label: "Ticket Number", description: "Ticket ID", example: "1234" },
    ],
    emailVisibleFields: [
      { key: "ticket_number", label: "Ticket Number", defaultVisible: true },
      { key: "creator_name", label: "Creator Name", defaultVisible: true },
    ],
    emailDefault: {
      subject: "New Ticket: {{ticket_title}}",
      greeting: "Hi {{user_name}},",
      mainMessage: "<p>A new ticket has been created.</p>",
      buttonText: "View Ticket",
      visibleFields: ["ticket_number", "creator_name"],
    },
    inAppDefault: {
      title: "New Ticket: {{ticket_title}}",
      body: "Created by {{creator_name}}",
    },
    emailCustomization: null,
    inAppCustomization: null,
  },
};

const mockEmailPreview = {
  preview: {
    subject: "New Ticket: Login Issue",
    greeting: "Hi John,",
    mainMessage: "<p>A new ticket has been created.</p>",
    buttonText: "View Ticket",
    visibleFieldsData: [
      { key: "ticket_number", label: "Ticket Number", value: "1234" },
    ],
  },
};

const mockInAppPreview = {
  preview: {
    title: "New Ticket: Login Issue",
    body: "Created by Jane Doe",
  },
};

// =============================================================================
// useFetchTemplateStatuses TESTS
// =============================================================================

describe("useFetchTemplateStatuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should fetch template statuses for a market center", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTemplateStatuses),
    });

    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplateStatuses.templates);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/template-customizations/market-center/mc-austin"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      })
    );
  });

  it("should not fetch when marketCenterId is undefined", async () => {
    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: undefined,
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not fetch when role is AGENT", async () => {
    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "AGENT",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should allow STAFF_LEADER role to fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTemplateStatuses),
    });

    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "STAFF_LEADER",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle fetch error gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("should handle network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useFetchTemplateForEditing TESTS
// =============================================================================

describe("useFetchTemplateForEditing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should fetch template data for editing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTemplateForEditing),
    });

    const { result } = renderHook(
      () =>
        useFetchTemplateForEditing({
          marketCenterId: "mc-austin",
          templateType: "TICKET_CREATED",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplateForEditing.template);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/template-customizations/market-center/mc-austin/template/TICKET_CREATED"),
      expect.any(Object)
    );
  });

  it("should not fetch when templateType is undefined", async () => {
    const { result } = renderHook(
      () =>
        useFetchTemplateForEditing({
          marketCenterId: "mc-austin",
          templateType: undefined,
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should include variables and visible fields in response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTemplateForEditing),
    });

    const { result } = renderHook(
      () =>
        useFetchTemplateForEditing({
          marketCenterId: "mc-austin",
          templateType: "TICKET_CREATED",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.variables).toBeDefined();
    expect(result.current.data?.variables.length).toBeGreaterThan(0);
    expect(result.current.data?.emailVisibleFields).toBeDefined();
  });
});

// =============================================================================
// useSaveEmailTemplate TESTS
// =============================================================================

describe("useSaveEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should save email template customization", async () => {
    const savedCustomization = {
      emailCustomization: {
        id: "email-new",
        marketCenterId: "mc-austin",
        templateType: "TICKET_CREATED",
        subject: "New Subject",
        greeting: "Hello",
        mainMessage: "<p>Test</p>",
        buttonText: "Click",
        visibleFields: ["ticket_number"],
        isActive: true,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(savedCustomization),
    });

    const { result } = renderHook(() => useSaveEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      subject: "New Subject",
      greeting: "Hello",
      mainMessage: "<p>Test</p>",
      buttonText: "Click",
      visibleFields: ["ticket_number"],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/template-customizations/email"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      })
    );
  });

  it("should handle null buttonText", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ emailCustomization: {} }),
    });

    const { result } = renderHook(() => useSaveEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      subject: "Subject",
      greeting: "Hi",
      mainMessage: "<p>Message</p>",
      buttonText: null,
      visibleFields: [],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.buttonText).toBeNull();
  });

  it("should handle save error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Invalid template" }),
    });

    const { result } = renderHook(() => useSaveEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      subject: "",
      greeting: "",
      mainMessage: "",
      visibleFields: [],
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useSaveInAppTemplate TESTS
// =============================================================================

describe("useSaveInAppTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should save in-app template customization", async () => {
    const savedCustomization = {
      inAppCustomization: {
        id: "inapp-new",
        marketCenterId: "mc-austin",
        templateType: "TICKET_CREATED",
        title: "New Title",
        body: "New Body",
        isActive: true,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(savedCustomization),
    });

    const { result } = renderHook(() => useSaveInAppTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      title: "New Title",
      body: "New Body",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/template-customizations/in-app"),
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should include template variables in body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ inAppCustomization: {} }),
    });

    const { result } = renderHook(() => useSaveInAppTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      title: "{{ticket_title}} - New",
      body: "Created by {{creator_name}}",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.title).toContain("{{ticket_title}}");
    expect(callBody.body).toContain("{{creator_name}}");
  });
});

// =============================================================================
// useResetEmailTemplate TESTS
// =============================================================================

describe("useResetEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should reset email template to default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useResetEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/template-customizations/email/mc-austin/TICKET_CREATED"),
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("should handle reset when no customization exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useResetEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "NEW_COMMENTS",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// =============================================================================
// useResetInAppTemplate TESTS
// =============================================================================

describe("useResetInAppTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should reset in-app template to default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useResetInAppTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/template-customizations/in-app/mc-austin/TICKET_CREATED"),
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });
});

// =============================================================================
// usePreviewEmailTemplate TESTS
// =============================================================================

describe("usePreviewEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should preview email template with sample data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEmailPreview),
    });

    const { result } = renderHook(() => usePreviewEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      subject: "New Ticket: {{ticket_title}}",
      greeting: "Hi {{user_name}},",
      mainMessage: "<p>A new ticket has been created.</p>",
      buttonText: "View Ticket",
      visibleFields: ["ticket_number"],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.preview.subject).toBe("New Ticket: Login Issue");
    expect(result.current.data?.preview.visibleFieldsData).toHaveLength(1);
  });

  it("should replace all template variables in preview", async () => {
    const previewWithAllVars = {
      preview: {
        subject: "Ticket 1234: Login Issue",
        greeting: "Hi John,",
        mainMessage: "<p>Created by Jane Doe on Jan 1, 2024</p>",
        buttonText: "View",
        visibleFieldsData: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(previewWithAllVars),
    });

    const { result } = renderHook(() => usePreviewEmailTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      subject: "Ticket {{ticket_number}}: {{ticket_title}}",
      greeting: "Hi {{user_name}},",
      mainMessage: "<p>Created by {{creator_name}} on {{created_on}}</p>",
      buttonText: "View",
      visibleFields: [],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify variables were replaced
    expect(result.current.data?.preview.subject).not.toContain("{{");
    expect(result.current.data?.preview.greeting).not.toContain("{{");
  });
});

// =============================================================================
// usePreviewInAppTemplate TESTS
// =============================================================================

describe("usePreviewInAppTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should preview in-app template with sample data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockInAppPreview),
    });

    const { result } = renderHook(() => usePreviewInAppTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      title: "New Ticket: {{ticket_title}}",
      body: "Created by {{creator_name}}",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.preview.title).toBe("New Ticket: Login Issue");
    expect(result.current.data?.preview.body).toBe("Created by Jane Doe");
  });

  it("should handle preview for different template types", async () => {
    const surveyPreview = {
      preview: {
        title: "Feedback Request",
        body: "How was your experience?",
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(surveyPreview),
    });

    const { result } = renderHook(() => usePreviewInAppTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_SURVEY",
      title: "Feedback Request",
      body: "How was your experience?",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.preview.title).toBe("Feedback Request");
  });
});

// =============================================================================
// QUERY INVALIDATION TESTS
// =============================================================================

describe("Query Invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should invalidate template statuses after saving email template", async () => {
    // First, fetch template statuses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTemplateStatuses),
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
    }

    // Now save a template
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ emailCustomization: {} }),
    });

    const { result } = renderHook(() => useSaveEmailTemplate(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      marketCenterId: "mc-austin",
      templateType: "TICKET_CREATED",
      subject: "Test",
      greeting: "Hi",
      mainMessage: "<p>Test</p>",
      visibleFields: [],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check that queries were invalidated
    expect(invalidateSpy).toHaveBeenCalled();
  });
});

// =============================================================================
// AUTHENTICATION TESTS
// =============================================================================

describe("Authentication handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should include auth token in all requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTemplateStatuses),
    });

    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      })
    );
  });

  it("should handle missing auth token", async () => {
    mockGetToken.mockResolvedValueOnce(null);

    const { result } = renderHook(
      () =>
        useFetchTemplateStatuses({
          marketCenterId: "mc-austin",
          role: "ADMIN",
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
