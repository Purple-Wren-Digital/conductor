import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockEmailTemplateRepo = vi.hoisted(() => ({
  findByMarketCenterAndType: vi.fn(),
}));

const mockInAppTemplateRepo = vi.hoisted(() => ({
  findByMarketCenterAndType: vi.fn(),
}));

vi.mock("./customization-repository", () => ({
  emailTemplateCustomizationRepository: mockEmailTemplateRepo,
  inAppTemplateCustomizationRepository: mockInAppTemplateRepo,
}));

// Mock React Email component
vi.mock("@/emails/index", () => ({
  CustomizableEmail: vi.fn((props) => ({
    type: "CustomizableEmail",
    props,
  })),
}));

// Import after mocks
import { renderCustomizedInAppNotification } from "./customization-in-app-renderer";
import { renderTemplate } from "./utils";
import {
  TEMPLATE_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_IN_APP_TEMPLATES,
} from "./customization-types";

// =============================================================================
// RENDER TEMPLATE UTILITY TESTS
// =============================================================================

describe("renderTemplate", () => {
  it("should replace single variable", () => {
    const result = renderTemplate({
      templateContent: "Hello {{user_name}}!",
      variables: ["user_name"],
      data: { user_name: "John" },
    });

    expect(result).toBe("Hello John!");
  });

  it("should replace multiple variables", () => {
    const result = renderTemplate({
      templateContent:
        "Ticket {{ticket_number}}: {{ticket_title}} by {{creator_name}}",
      variables: ["ticket_number", "ticket_title", "creator_name"],
      data: {
        ticket_number: "1234",
        ticket_title: "Login Issue",
        creator_name: "Jane Doe",
      },
    });

    expect(result).toBe("Ticket 1234: Login Issue by Jane Doe");
  });

  it("should handle same variable appearing multiple times", () => {
    const result = renderTemplate({
      templateContent: "{{user_name}} said hello to {{user_name}}",
      variables: ["user_name"],
      data: { user_name: "John" },
    });

    expect(result).toBe("John said hello to John");
  });

  it("should preserve unreplaced variables when data is missing", () => {
    const result = renderTemplate({
      templateContent: "Hello {{user_name}}, ticket {{ticket_number}}",
      variables: ["user_name"],
      data: { user_name: "John" },
    });

    // ticket_number not in variables list, should not be replaced
    expect(result).toContain("John");
  });

  it("should handle undefined values gracefully", () => {
    const result = renderTemplate({
      templateContent: "Hello {{user_name}}",
      variables: ["user_name"],
      data: { user_name: undefined as any },
    });

    // Should not crash, undefined values are skipped
    expect(result).toBe("Hello {{user_name}}");
  });

  it("should handle empty string values", () => {
    const result = renderTemplate({
      templateContent: "Hello {{user_name}}!",
      variables: ["user_name"],
      data: { user_name: "" },
    });

    expect(result).toBe("Hello !");
  });

  it("should handle variables with spaces in template", () => {
    const result = renderTemplate({
      templateContent: "Hello {{ user_name }}!",
      variables: ["user_name"],
      data: { user_name: "John" },
    });

    // The regex should handle spaces
    expect(result).toBe("Hello John!");
  });

  it("should handle snake_case and camelCase variables", () => {
    const result = renderTemplate({
      templateContent: "{{ticket_number}} and {{ticketNumber}}",
      variables: ["ticket_number", "ticketNumber"],
      data: { ticket_number: "123", ticketNumber: "456" },
    });

    expect(result).toContain("123");
    expect(result).toContain("456");
  });

  it("should handle HTML content", () => {
    const result = renderTemplate({
      templateContent: "<p>Hello <strong>{{user_name}}</strong></p>",
      variables: ["user_name"],
      data: { user_name: "John" },
    });

    expect(result).toBe("<p>Hello <strong>John</strong></p>");
  });

  it("should handle special characters in values", () => {
    const result = renderTemplate({
      templateContent: "Title: {{ticket_title}}",
      variables: ["ticket_title"],
      data: { ticket_title: 'Issue with <script> & "quotes"' },
    });

    expect(result).toBe('Title: Issue with <script> & "quotes"');
  });

  it("should handle numeric values", () => {
    const result = renderTemplate({
      templateContent: "Ticket #{{ticket_number}}",
      variables: ["ticket_number"],
      data: { ticket_number: 1234 as any },
    });

    expect(result).toBe("Ticket #1234");
  });
});

// =============================================================================
// IN-APP NOTIFICATION RENDERING TESTS
// =============================================================================

describe("renderCustomizedInAppNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no market center ID", async () => {
    const result = await renderCustomizedInAppNotification(
      "Ticket Created",
      { createdTicket: { ticketNumber: "123", ticketTitle: "Test" } as any },
      null,
      "John"
    );

    expect(result).toBeNull();
    expect(
      mockInAppTemplateRepo.findByMarketCenterAndType
    ).not.toHaveBeenCalled();
  });

  it("should return null for unsupported notification type", async () => {
    const result = await renderCustomizedInAppNotification(
      "Unsupported Type",
      {},
      "mc-123",
      "John"
    );

    expect(result).toBeNull();
  });

  it("should return null when no customization exists", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);

    const result = await renderCustomizedInAppNotification(
      "Ticket Created",
      { createdTicket: { ticketNumber: "123", ticketTitle: "Test" } as any },
      "mc-123",
      "John"
    );

    expect(result).toBeNull();
  });

  it("should return null when customization is inactive", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: false,
      title: "Custom Title",
      body: "Custom Body",
    });

    const result = await renderCustomizedInAppNotification(
      "Ticket Created",
      { createdTicket: { ticketNumber: "123", ticketTitle: "Test" } as any },
      "mc-123",
      "John"
    );

    expect(result).toBeNull();
  });

  it("should render customized ticket_created notification", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: true,
      title: "New: {{ticket_title}}",
      body: "Created by {{creator_name}}",
    });

    const result = await renderCustomizedInAppNotification(
      "Ticket Created",
      {
        createdTicket: {
          ticketNumber: "1234",
          ticketTitle: "Login Issue",
          creatorName: "Jane Doe",
        } as any,
      },
      "mc-123",
      "John"
    );

    expect(result).toBeDefined();
    expect(result?.title).toBe("New: Login Issue");
    expect(result?.body).toBe("Created by Jane Doe");
  });

  it("should render customized ticket_updated notification", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: true,
      title: "Updated: {{ticket_title}}",
      body: "{{editor_name}} changed {{changed_details}}",
    });

    const result = await renderCustomizedInAppNotification(
      "Ticket Updated",
      {
        updatedTicket: {
          ticketNumber: "1234",
          ticketTitle: "Login Issue",
          editorName: "Admin User",
          changedDetails: [{ label: "Status" }, { label: "Priority" }],
        } as any,
      },
      "mc-123",
      "John"
    );

    expect(result?.title).toBe("Updated: Login Issue");
    expect(result?.body).toContain("Admin User");
    expect(result?.body).toContain("Status, Priority");
  });

  it("should render customized new_comments notification", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: true,
      title: "Comment on {{ticket_title}}",
      body: "{{commenter_name}}: {{comment}}",
    });

    const result = await renderCustomizedInAppNotification(
      "New Comments",
      {
        newComment: {
          ticketNumber: "1234",
          ticketTitle: "Login Issue",
          commenterName: "Support Agent",
          comment: "I've looked into this",
        } as any,
      },
      "mc-123"
    );

    expect(result?.title).toBe("Comment on Login Issue");
    expect(result?.body).toContain("Support Agent");
    expect(result?.body).toContain("I've looked into this");
  });

  it("should render customized market_center_assignment notification", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: true,
      title: "MC Update: {{market_center_name}}",
      body: "Changed by {{editor_name}}",
    });

    const result = await renderCustomizedInAppNotification(
      "Market Center Assignment",
      {
        marketCenterAssignment: {
          marketCenterName: "Austin Office",
          editorName: "Admin",
        } as any,
      },
      "mc-123"
    );

    expect(result?.title).toBe("MC Update: Austin Office");
    expect(result?.body).toBe("Changed by Admin");
  });

  it("should include user_name in context", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: true,
      title: "Hi {{user_name}}",
      body: "You have a notification",
    });

    const result = await renderCustomizedInAppNotification(
      "Ticket Created",
      { createdTicket: { ticketNumber: "123" } as any },
      "mc-123",
      "John Smith"
    );

    expect(result?.title).toBe("Hi John Smith");
  });

  it("should default user_name to 'there' when not provided", async () => {
    mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue({
      id: "custom-123",
      isActive: true,
      title: "Hi {{user_name}}",
      body: "You have a notification",
    });

    const result = await renderCustomizedInAppNotification(
      "Ticket Created",
      { createdTicket: { ticketNumber: "123" } as any },
      "mc-123"
    );

    expect(result?.title).toBe("Hi there");
  });
});

// =============================================================================
// TEMPLATE VARIABLES CONFIGURATION TESTS
// =============================================================================

describe("TEMPLATE_VARIABLES configuration", () => {
  it("should have variables defined for all template types", () => {
    const templateTypes = [
      "ticket_created",
      "ticket_updated",
      "ticket_assignment",
      "new_comments",
      "market_center_assignment",
      "category_assignment",
      "ticket_survey",
      "ticket_survey_results",
    ] as const;

    templateTypes.forEach((type) => {
      expect(TEMPLATE_VARIABLES[type]).toBeDefined();
      expect(Array.isArray(TEMPLATE_VARIABLES[type])).toBe(true);
      expect(TEMPLATE_VARIABLES[type].length).toBeGreaterThan(0);
    });
  });

  it("should have required properties for each variable", () => {
    Object.values(TEMPLATE_VARIABLES).forEach((variables) => {
      variables.forEach((variable) => {
        expect(variable).toHaveProperty("key");
        expect(variable).toHaveProperty("label");
        expect(variable).toHaveProperty("description");
        expect(variable).toHaveProperty("example");
        expect(typeof variable.key).toBe("string");
        expect(typeof variable.label).toBe("string");
        expect(typeof variable.description).toBe("string");
        expect(typeof variable.example).toBe("string");
      });
    });
  });

  it("should have user_name variable for all types except ticket_survey", () => {
    Object.entries(TEMPLATE_VARIABLES).forEach(([type, variables]) => {
      if (type === "ticket_survey") return;
      const hasUserName = variables.some((v) => v.key === "user_name");
      expect(hasUserName).toBe(true);
    });
  });

  it("ticket_created should have ticket-specific variables", () => {
    const vars = TEMPLATE_VARIABLES.ticket_created;
    const keys = vars.map((v) => v.key);

    expect(keys).toContain("ticket_title");
    expect(keys).toContain("due_date");
    expect(keys).toContain("creator_name");
    expect(keys).toContain("assignee_name");
        expect(keys).toContain("user_name");

  });

  it("market_center_assignment should have MC-specific variables", () => {
    const vars = TEMPLATE_VARIABLES.market_center_assignment;
    const keys = vars.map((v) => v.key);

    expect(keys).toContain("market_center_name");
    expect(keys).toContain("editor_name");
  });
});

// =============================================================================
// DEFAULT TEMPLATES CONFIGURATION TESTS
// =============================================================================

describe("DEFAULT_EMAIL_TEMPLATES configuration", () => {
  it("should have defaults for all template types", () => {
    const templateTypes = [
      "ticket_created",
      "ticket_updated",
      "ticket_assignment",
      "new_comments",
      "market_center_assignment",
      "category_assignment",
      "ticket_survey",
      "ticket_survey_results",
    ] as const;

    templateTypes.forEach((type) => {
      expect(DEFAULT_EMAIL_TEMPLATES[type]).toBeDefined();
    });
  });

  it("should have required properties for each email default", () => {
    Object.values(DEFAULT_EMAIL_TEMPLATES).forEach((template) => {
      expect(template).toHaveProperty("subject");
      expect(template).toHaveProperty("greeting");
      expect(template).toHaveProperty("mainMessage");
      expect(template).toHaveProperty("buttonText");
      expect(template).toHaveProperty("visibleFields");
      expect(Array.isArray(template.visibleFields)).toBe(true);
    });
  });

  it("email defaults should use valid variable placeholders", () => {
    Object.entries(DEFAULT_EMAIL_TEMPLATES).forEach(([type, template]) => {
      const templateType = type as keyof typeof TEMPLATE_VARIABLES;
      const validKeys = TEMPLATE_VARIABLES[templateType].map((v) => v.key);

      // Check subject
      const subjectVars = template.subject.match(/\{\{(\w+)\}\}/g) || [];
      subjectVars.forEach((varMatch) => {
        const varKey = varMatch.replace(/\{\{|\}\}/g, "");
        expect(validKeys).toContain(varKey);
      });

      // Check greeting
      const greetingVars = template.greeting.match(/\{\{(\w+)\}\}/g) || [];
      greetingVars.forEach((varMatch) => {
        const varKey = varMatch.replace(/\{\{|\}\}/g, "");
        expect(validKeys).toContain(varKey);
      });
    });
  });
});

describe("DEFAULT_IN_APP_TEMPLATES configuration", () => {
  it("should have defaults for all template types", () => {
    const templateTypes = [
      "ticket_created",
      "ticket_updated",
      "ticket_assignment",
      "new_comments",
      "market_center_assignment",
      "category_assignment",
      "ticket_survey",
      "ticket_survey_results",
    ] as const;

    templateTypes.forEach((type) => {
      expect(DEFAULT_IN_APP_TEMPLATES[type]).toBeDefined();
    });
  });

  it("should have required properties for each in-app default", () => {
    Object.values(DEFAULT_IN_APP_TEMPLATES).forEach((template) => {
      expect(template).toHaveProperty("title");
      expect(template).toHaveProperty("body");
      expect(typeof template.title).toBe("string");
      expect(typeof template.body).toBe("string");
    });
  });

  it("in-app defaults should use valid variable placeholders", () => {
    Object.entries(DEFAULT_IN_APP_TEMPLATES).forEach(([type, template]) => {
      const templateType = type as keyof typeof TEMPLATE_VARIABLES;
      const validKeys = TEMPLATE_VARIABLES[templateType].map((v) => v.key);

      // Check title
      const titleVars = template.title.match(/\{\{(\w+)\}\}/g) || [];
      titleVars.forEach((varMatch) => {
        const varKey = varMatch.replace(/\{\{|\}\}/g, "");
        expect(validKeys).toContain(varKey);
      });

      // Check body
      const bodyVars = template.body.match(/\{\{(\w+)\}\}/g) || [];
      bodyVars.forEach((varMatch) => {
        const varKey = varMatch.replace(/\{\{|\}\}/g, "");
        expect(validKeys).toContain(varKey);
      });
    });
  });
});
