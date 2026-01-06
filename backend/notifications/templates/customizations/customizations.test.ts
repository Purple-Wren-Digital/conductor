import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

const {
  mockDb,
  mockUserContext,
  mockSubscriptionRepository,
  mockEmailTemplateRepo,
  mockInAppTemplateRepo,
  mockGenerateId,
} = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
  mockUserContext: {
    userId: "user-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
  },
  mockSubscriptionRepository: {
    getAccessibleMarketCenterIds: vi.fn(),
  },
  mockEmailTemplateRepo: {
    findByMarketCenterAndType: vi.fn(),
    findAllByMarketCenter: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByMarketCenterAndType: vi.fn(),
  },
  mockInAppTemplateRepo: {
    findByMarketCenterAndType: vi.fn(),
    findAllByMarketCenter: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByMarketCenterAndType: vi.fn(),
  },
  mockGenerateId: vi.fn(() => "generated-id-123"),
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "not_found";
      return err;
    }),
    invalidArgument: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "invalid_argument";
      return err;
    }),
    permissionDenied: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "permission_denied";
      return err;
    }),
    internal: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "internal";
      return err;
    }),
  },
}));

// Mock ticket/db
vi.mock("../../../ticket/db", () => ({
  db: mockDb,
  subscriptionRepository: mockSubscriptionRepository,
  fromTimestamp: vi.fn((d) => d),
  fromJson: vi.fn((j) => (typeof j === "string" ? JSON.parse(j) : j)),
  toJson: vi.fn((o) => JSON.stringify(o)),
  generateId: mockGenerateId,
}));

// Mock user context
vi.mock("../../../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock repositories
vi.mock("../customization-repository", () => ({
  emailTemplateCustomizationRepository: mockEmailTemplateRepo,
  inAppTemplateCustomizationRepository: mockInAppTemplateRepo,
}));

// Import after mocks
import { listTemplateStatuses } from "./list";
import { getTemplateForEditing } from "./get";
import { saveEmailTemplate, resetEmailTemplate } from "./email";
import { saveInAppTemplate, resetInAppTemplate } from "./in-app";
import {
  previewEmailTemplate,
  previewInAppTemplate,
  getTemplateVariables,
  getDefaultTemplates,
} from "./preview";
import { getUserContext } from "../../../auth/user-context";
import {
  TEMPLATE_TYPE_LABELS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_IN_APP_TEMPLATES,
  TEMPLATE_VARIABLES,
} from "../customization-types";

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const createMockEmailCustomization = (overrides = {}) => ({
  id: "email-custom-123",
  marketCenterId: "mc-123",
  templateType: "ticket_created" as const,
  subject: "Custom: {{ticket_title}}",
  greeting: "Hello {{user_name}},",
  mainMessage: "<p>A ticket was created for you.</p>",
  buttonText: "View Now",
  visibleFields: ["ticket_number", "creator_name"],
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  createdById: "user-123",
  updatedById: "user-123",
  ...overrides,
});

const createMockInAppCustomization = (overrides = {}) => ({
  id: "inapp-custom-123",
  marketCenterId: "mc-123",
  templateType: "ticket_created" as const,
  title: "Custom: {{ticket_title}}",
  body: "{{creator_name}} created a ticket",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  createdById: "user-123",
  updatedById: "user-123",
  ...overrides,
});

// =============================================================================
// TESTS: LIST TEMPLATE STATUSES
// =============================================================================

describe("Template Customizations - List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
      "mc-456",
    ]);
  });

  describe("listTemplateStatuses", () => {
    it("should return all template types with customization status", async () => {
      const emailCustomizations = [
        createMockEmailCustomization({ templateType: "ticket_created" }),
      ];
      const inAppCustomizations = [
        createMockInAppCustomization({ templateType: "ticket_created" }),
        createMockInAppCustomization({ templateType: "new_comments" }),
      ];

      mockEmailTemplateRepo.findAllByMarketCenter.mockResolvedValue(
        emailCustomizations
      );
      mockInAppTemplateRepo.findAllByMarketCenter.mockResolvedValue(
        inAppCustomizations
      );

      const result = await listTemplateStatuses({ marketCenterId: "mc-123" });

      expect(result.templates).toHaveLength(
        Object.keys(TEMPLATE_TYPE_LABELS).length
      );

      // ticket_created should have both customizations
      const ticketCreated = result.templates.find(
        (t) => t.templateType === "ticket_created"
      );
      expect(ticketCreated?.hasEmailCustomization).toBe(true);
      expect(ticketCreated?.hasInAppCustomization).toBe(true);
      expect(ticketCreated?.emailCustomization).toBeDefined();
      expect(ticketCreated?.inAppCustomization).toBeDefined();

      // new_comments should only have in-app customization
      const newComments = result.templates.find(
        (t) => t.templateType === "new_comments"
      );
      expect(newComments?.hasEmailCustomization).toBe(false);
      expect(newComments?.hasInAppCustomization).toBe(true);

      // ticket_updated should have no customizations
      const ticketUpdated = result.templates.find(
        (t) => t.templateType === "ticket_updated"
      );
      expect(ticketUpdated?.hasEmailCustomization).toBe(false);
      expect(ticketUpdated?.hasInAppCustomization).toBe(false);
    });

    it("should return empty customizations when market center has none", async () => {
      mockEmailTemplateRepo.findAllByMarketCenter.mockResolvedValue([]);
      mockInAppTemplateRepo.findAllByMarketCenter.mockResolvedValue([]);

      const result = await listTemplateStatuses({ marketCenterId: "mc-123" });

      result.templates.forEach((template) => {
        expect(template.hasEmailCustomization).toBe(false);
        expect(template.hasInAppCustomization).toBe(false);
        expect(template.emailCustomization).toBeNull();
        expect(template.inAppCustomization).toBeNull();
      });
    });

    it("should throw permission denied when user has no access to market center", async () => {
      mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue(
        ["other-mc"]
      );

      await expect(
        listTemplateStatuses({ marketCenterId: "mc-123" })
      ).rejects.toThrow("You do not have access to this market center");
    });

    it("should allow STAFF role users to view their own market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });
      mockEmailTemplateRepo.findAllByMarketCenter.mockResolvedValue([]);
      mockInAppTemplateRepo.findAllByMarketCenter.mockResolvedValue([]);

      const result = await listTemplateStatuses({ marketCenterId: "mc-123" });

      expect(result.templates).toBeDefined();
    });
  });
});

// =============================================================================
// TESTS: GET TEMPLATE FOR EDITING
// =============================================================================

describe("Template Customizations - Get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  describe("getTemplateForEditing", () => {
    it("should return template with defaults and customizations", async () => {
      const emailCustomization = createMockEmailCustomization();
      const inAppCustomization = createMockInAppCustomization();

      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(
        emailCustomization
      );
      mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue(
        inAppCustomization
      );

      const result = await getTemplateForEditing({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
      });

      expect(result.template.templateType).toBe("ticket_created");
      expect(result.template.label).toBe("Ticket Created");
      expect(result.template.variables).toBeDefined();
      expect(result.template.variables.length).toBeGreaterThan(0);

      // Email defaults
      expect(result.template.emailDefault).toEqual(
        DEFAULT_EMAIL_TEMPLATES.ticket_created
      );
      expect(result.template.emailCustomization).toEqual(emailCustomization);
      expect(result.template.emailVisibleFieldOptions).toBeDefined();

      // In-app defaults
      expect(result.template.inAppDefault).toEqual(
        DEFAULT_IN_APP_TEMPLATES.ticket_created
      );
      expect(result.template.inAppCustomization).toEqual(inAppCustomization);
    });

    it("should return null customizations when none exist", async () => {
      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);
      mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);

      const result = await getTemplateForEditing({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
      });

      expect(result.template.emailCustomization).toBeNull();
      expect(result.template.inAppCustomization).toBeNull();
      // Defaults should still be present
      expect(result.template.emailDefault).toBeDefined();
      expect(result.template.inAppDefault).toBeDefined();
    });

    it("should throw error for invalid template type", async () => {
      await expect(
        getTemplateForEditing({
          marketCenterId: "mc-123",
          templateType: "INVALID_TYPE" as any,
        })
      ).rejects.toThrow("Invalid template type");
    });

    it("should throw permission denied for non-admin/staff-leader users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        getTemplateForEditing({
          marketCenterId: "mc-123",
          templateType: "ticket_created",
        })
      ).rejects.toThrow(
        "Only admins and staff leaders can edit notification templates"
      );
    });

    it("should allow STAFF_LEADER to edit templates", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
      });
      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);
      mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);

      const result = await getTemplateForEditing({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
      });

      expect(result.template).toBeDefined();
    });
  });
});

// =============================================================================
// TESTS: SAVE EMAIL TEMPLATE
// =============================================================================

describe("Template Customizations - Email Save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  describe("saveEmailTemplate", () => {
    const validRequest = {
      marketCenterId: "mc-123",
      templateType: "ticket_created" as const,
      subject: "New Ticket: {{ticket_title}}",
      greeting: "Hi {{user_name}},",
      mainMessage: "<p>A new ticket has been created.</p>",
      buttonText: "View Ticket",
      visibleFields: ["ticket_number", "creator_name"],
    };

    it("should create new email customization when none exists", async () => {
      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);
      const createdCustomization = createMockEmailCustomization({
        ...validRequest,
        id: "new-id",
      });
      mockEmailTemplateRepo.create.mockResolvedValue(createdCustomization);

      const result = await saveEmailTemplate(validRequest);

      expect(mockEmailTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          marketCenterId: "mc-123",
          templateType: "ticket_created",
          subject: validRequest.subject,
        }),
        "user-123"
      );
      expect(result.emailCustomization).toEqual(createdCustomization);
    });

    it("should update existing email customization", async () => {
      const existingCustomization = createMockEmailCustomization();
      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(
        existingCustomization
      );

      const updatedCustomization = {
        ...existingCustomization,
        subject: validRequest.subject,
      };
      mockEmailTemplateRepo.update.mockResolvedValue(updatedCustomization);

      const result = await saveEmailTemplate(validRequest);

      expect(mockEmailTemplateRepo.update).toHaveBeenCalledWith(
        existingCustomization.id,
        expect.objectContaining({
          subject: validRequest.subject,
        }),
        "user-123"
      );
      expect(mockEmailTemplateRepo.create).not.toHaveBeenCalled();
      expect(result.emailCustomization).toEqual(updatedCustomization);
    });

    it("should handle null buttonText", async () => {
      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);
      mockEmailTemplateRepo.create.mockResolvedValue(
        createMockEmailCustomization({ buttonText: null })
      );

      await saveEmailTemplate({
        ...validRequest,
        buttonText: null,
      });

      expect(mockEmailTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonText: null,
        }),
        "user-123"
      );
    });

    it("should throw error for invalid template type", async () => {
      await expect(
        saveEmailTemplate({
          ...validRequest,
          templateType: "INVALID" as any,
        })
      ).rejects.toThrow("Invalid template type");
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(saveEmailTemplate(validRequest)).rejects.toThrow(
        "Only admins and staff leaders can edit notification templates"
      );
    });

    it("should throw error when update fails", async () => {
      mockEmailTemplateRepo.findByMarketCenterAndType.mockResolvedValue(
        createMockEmailCustomization()
      );
      mockEmailTemplateRepo.update.mockResolvedValue(null);

      await expect(saveEmailTemplate(validRequest)).rejects.toThrow(
        "Failed to update email template customization"
      );
    });
  });

  describe("resetEmailTemplate", () => {
    it("should delete email customization", async () => {
      mockEmailTemplateRepo.deleteByMarketCenterAndType.mockResolvedValue(true);

      const result = await resetEmailTemplate({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
      });

      expect(
        mockEmailTemplateRepo.deleteByMarketCenterAndType
      ).toHaveBeenCalledWith("mc-123", "ticket_created");
      expect(result.success).toBe(true);
    });

    it("should throw error for invalid template type", async () => {
      await expect(
        resetEmailTemplate({
          marketCenterId: "mc-123",
          templateType: "INVALID" as any,
        })
      ).rejects.toThrow("Invalid template type");
    });

    it("should throw permission denied for unauthorized users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        resetEmailTemplate({
          marketCenterId: "mc-123",
          templateType: "ticket_created",
        })
      ).rejects.toThrow(
        "Only admins and staff leaders can edit notification templates"
      );
    });
  });
});

// =============================================================================
// TESTS: SAVE IN-APP TEMPLATE
// =============================================================================

describe("Template Customizations - In-App Save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  describe("saveInAppTemplate", () => {
    const validRequest = {
      marketCenterId: "mc-123",
      templateType: "ticket_created" as const,
      title: "New: {{ticket_title}}",
      body: "{{creator_name}} created a ticket",
    };

    it("should create new in-app customization when none exists", async () => {
      mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue(null);
      const createdCustomization = createMockInAppCustomization(validRequest);
      mockInAppTemplateRepo.create.mockResolvedValue(createdCustomization);

      const result = await saveInAppTemplate(validRequest);

      expect(mockInAppTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          marketCenterId: "mc-123",
          templateType: "ticket_created",
          title: validRequest.title,
          body: validRequest.body,
        }),
        "user-123"
      );
      expect(result.inAppCustomization).toEqual(createdCustomization);
    });

    it("should update existing in-app customization", async () => {
      const existingCustomization = createMockInAppCustomization();
      mockInAppTemplateRepo.findByMarketCenterAndType.mockResolvedValue(
        existingCustomization
      );

      const updatedCustomization = {
        ...existingCustomization,
        title: validRequest.title,
      };
      mockInAppTemplateRepo.update.mockResolvedValue(updatedCustomization);

      const result = await saveInAppTemplate(validRequest);

      expect(mockInAppTemplateRepo.update).toHaveBeenCalledWith(
        existingCustomization.id,
        expect.objectContaining({
          title: validRequest.title,
          body: validRequest.body,
        }),
        "user-123"
      );
      expect(mockInAppTemplateRepo.create).not.toHaveBeenCalled();
    });

    it("should throw error for invalid template type", async () => {
      await expect(
        saveInAppTemplate({
          ...validRequest,
          templateType: "INVALID" as any,
        })
      ).rejects.toThrow("Invalid template type");
    });
  });

  describe("resetInAppTemplate", () => {
    it("should delete in-app customization", async () => {
      mockInAppTemplateRepo.deleteByMarketCenterAndType.mockResolvedValue(true);

      const result = await resetInAppTemplate({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
      });

      expect(
        mockInAppTemplateRepo.deleteByMarketCenterAndType
      ).toHaveBeenCalledWith("mc-123", "ticket_created");
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// TESTS: PREVIEW
// =============================================================================

describe("Template Customizations - Preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  describe("previewEmailTemplate", () => {
    it("should render email preview with sample data", async () => {
      const result = await previewEmailTemplate({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
        subject: "New Ticket: {{ticket_title}}",
        greeting: "Hi {{user_name}},",
        mainMessage: "A ticket was created by {{creator_name}}",
        buttonText: "View",
        visibleFields: ["ticket_number", "creator_name"],
      });

      // Should replace variables with example values
      expect(result.preview.subject).toBe("New Ticket: Login Issue");
      expect(result.preview.greeting).toBe("Hi John Smith,");
      expect(result.preview.mainMessage).toContain("John Smith");
      expect(result.preview.buttonText).toBe("View");
      expect(result.preview.visibleFieldsData).toHaveLength(2);
      expect(result.preview.visibleFieldsData[0].label).toBe("Ticket Number");
      expect(result.preview.visibleFieldsData[0].value).toBe("1234");
    });

    it("should handle missing visible fields gracefully", async () => {
      const result = await previewEmailTemplate({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
        subject: "Test",
        greeting: "Hi,",
        mainMessage: "Test message",
        buttonText: null,
        visibleFields: ["nonexistent_field"],
      });

      expect(result.preview.visibleFieldsData).toHaveLength(0);
      expect(result.preview.buttonText).toBeNull();
    });

    it("should throw error for invalid template type", async () => {
      await expect(
        previewEmailTemplate({
          marketCenterId: "mc-123",
          templateType: "INVALID" as any,
          subject: "Test",
          greeting: "Hi",
          mainMessage: "Test",
          visibleFields: [],
        })
      ).rejects.toThrow("Invalid template type");
    });
  });

  describe("previewInAppTemplate", () => {
    it("should render in-app preview with sample data", async () => {
      const result = await previewInAppTemplate({
        marketCenterId: "mc-123",
        templateType: "ticket_created",
        title: "New: {{ticket_title}}",
        body: "Created by {{creator_name}}",
      });

      expect(result.preview.title).toBe("New: Login Issue");
      expect(result.preview.body).toBe("Created by John Smith");
    });

    it("should handle all template types", async () => {
      // Test each template type has proper variables
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

      for (const templateType of templateTypes) {
        const result = await previewInAppTemplate({
          marketCenterId: "mc-123",
          templateType,
          title: "Test {{user_name}}",
          body: "Test body",
        });

        expect(result.preview.title).toContain("Test");
        for (const { key } of TEMPLATE_VARIABLES[templateType]) {
          expect(result.preview.title).not.toContain(`{{${key}}}`);
        }
      }
    });
  });

  describe("getTemplateVariables", () => {
    it("should return variables with insert text", async () => {
      const result = await getTemplateVariables({
        templateType: "ticket_created",
      });

      expect(result.variables.length).toBeGreaterThan(0);
      expect(result.variables[0]).toHaveProperty("key");
      expect(result.variables[0]).toHaveProperty("label");
      expect(result.variables[0]).toHaveProperty("description");
      expect(result.variables[0]).toHaveProperty("example");
      expect(result.variables[0]).toHaveProperty("insertText");
      expect(result.variables[0].insertText).toMatch(/^\{\{.+\}\}$/);
    });

    it("should return different variables for different template types", async () => {
      const ticketResult = await getTemplateVariables({
        templateType: "ticket_created",
      });
      const mcResult = await getTemplateVariables({
        templateType: "market_center_assignment",
      });

      const ticketKeys = ticketResult.variables.map((v) => v.key);
      const mcKeys = mcResult.variables.map((v) => v.key);

      expect(ticketKeys).toContain("ticket_number");
      expect(ticketKeys).toContain("ticket_title");
      expect(mcKeys).toContain("market_center_name");
      expect(mcKeys).not.toContain("ticket_number");
    });
  });

  describe("getDefaultTemplates", () => {
    it("should return both email and in-app defaults", async () => {
      const result = await getDefaultTemplates({
        templateType: "ticket_created",
      });

      expect(result.emailDefault).toEqual(
        DEFAULT_EMAIL_TEMPLATES.ticket_created
      );
      expect(result.inAppDefault).toEqual(
        DEFAULT_IN_APP_TEMPLATES.ticket_created
      );
    });

    it("should throw error for invalid template type", async () => {
      await expect(
        getDefaultTemplates({
          templateType: "INVALID" as any,
        })
      ).rejects.toThrow("Invalid template type");
    });
  });
});

// =============================================================================
// TESTS: EDGE CASES AND ERROR HANDLING
// =============================================================================

describe("Template Customizations - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  it("should handle empty market center ID list", async () => {
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue(
      []
    );

    await expect(
      listTemplateStatuses({ marketCenterId: "mc-123" })
    ).rejects.toThrow("You do not have access to this market center");
  });

  it("should handle special characters in template content", async () => {
    const result = await previewInAppTemplate({
      marketCenterId: "mc-123",
      templateType: "ticket_created",
      title: 'Ticket: {{ticket_title}} - Special <chars> & "quotes"',
      body: "Body with {{creator_name}}",
    });

    // Variables should be replaced, special chars preserved
    expect(result.preview.title).toContain("Special <chars>");
    expect(result.preview.title).not.toContain("{{ticket_title}}");
  });

  it("should handle HTML in email main message", async () => {
    const result = await previewEmailTemplate({
      marketCenterId: "mc-123",
      templateType: "ticket_created",
      subject: "Test",
      greeting: "Hi",
      mainMessage:
        "<p><strong>Bold</strong> and <em>italic</em> by {{creator_name}}</p>",
      visibleFields: [],
    });

    expect(result.preview.mainMessage).toContain("<p>");
    expect(result.preview.mainMessage).toContain("<strong>");
    expect(result.preview.mainMessage).toContain("John Smith");
  });

  it("should handle variables that appear multiple times", async () => {
    const result = await previewInAppTemplate({
      marketCenterId: "mc-123",
      templateType: "ticket_created",
      title: "{{ticket_title}} - {{ticket_title}}",
      body: "By {{creator_name}}",
    });

    // Both occurrences should be replaced
    expect(result.preview.title).toBe("Login Issue - Login Issue");
  });
});
