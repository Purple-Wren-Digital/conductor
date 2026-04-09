import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration-style tests that verify the complete flow of template customization.
 * These tests verify the API handlers work correctly with mocked repositories.
 */

// =============================================================================
// MOCK SETUP - All hoisted for proper initialization order
// =============================================================================

const {
  mockDb,
  mockUserContext,
  mockSubscriptionRepository,
  mockEmailRepo,
  mockInAppRepo,
} = vi.hoisted(() => {
  // In-memory storage for simulating database
  const emailStorage = new Map<string, any>();
  const inAppStorage = new Map<string, any>();

  return {
    mockDb: {
      queryAll: vi.fn(),
      queryRow: vi.fn(),
      exec: vi.fn(),
    },
    mockUserContext: {
      name: "Admin User",
      userId: "admin-user-123",
      email: "admin@marketcenter.com",
      role: "ADMIN" as const,
      marketCenterId: "mc-austin",
      clerkId: "clerk-admin-123",
    },
    mockSubscriptionRepository: {
      getAccessibleMarketCenterIds: vi.fn(() => Promise.resolve(["mc-austin"])),
    },
    mockEmailRepo: {
      _storage: emailStorage,
      findByMarketCenterAndType: vi.fn((mcId: string, type: string) => {
        return Promise.resolve(emailStorage.get(`${mcId}:${type}`) || null);
      }),
      findAllByMarketCenter: vi.fn((mcId: string) => {
        const results: any[] = [];
        emailStorage.forEach((value, key) => {
          if (key.startsWith(`${mcId}:`)) results.push(value);
        });
        return Promise.resolve(results);
      }),
      create: vi.fn((input: any, userId: string) => {
        const customization = {
          id: `email-${Date.now()}`,
          ...input,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: userId,
          updatedById: userId,
        };
        emailStorage.set(
          `${input.marketCenterId}:${input.templateType}`,
          customization
        );
        return Promise.resolve(customization);
      }),
      update: vi.fn((id: string, input: any, userId: string) => {
        let found: any = null;
        let foundKey = "";
        emailStorage.forEach((v, k) => {
          if (v.id === id) {
            found = v;
            foundKey = k;
          }
        });
        if (!found) return Promise.resolve(null);
        const updated = {
          ...found,
          ...input,
          updatedAt: new Date(),
          updatedById: userId,
        };
        emailStorage.set(foundKey, updated);
        return Promise.resolve(updated);
      }),
      deleteByMarketCenterAndType: vi.fn((mcId: string, type: string) => {
        emailStorage.delete(`${mcId}:${type}`);
        return Promise.resolve(true);
      }),
    },
    mockInAppRepo: {
      _storage: inAppStorage,
      findByMarketCenterAndType: vi.fn((mcId: string, type: string) => {
        return Promise.resolve(inAppStorage.get(`${mcId}:${type}`) || null);
      }),
      findAllByMarketCenter: vi.fn((mcId: string) => {
        const results: any[] = [];
        inAppStorage.forEach((value, key) => {
          if (key.startsWith(`${mcId}:`)) results.push(value);
        });
        return Promise.resolve(results);
      }),
      create: vi.fn((input: any, userId: string) => {
        const customization = {
          id: `inapp-${Date.now()}`,
          ...input,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: userId,
          updatedById: userId,
        };
        inAppStorage.set(
          `${input.marketCenterId}:${input.templateType}`,
          customization
        );
        return Promise.resolve(customization);
      }),
      update: vi.fn((id: string, input: any, userId: string) => {
        let found: any = null;
        let foundKey = "";
        inAppStorage.forEach((v, k) => {
          if (v.id === id) {
            found = v;
            foundKey = k;
          }
        });
        if (!found) return Promise.resolve(null);
        const updated = {
          ...found,
          ...input,
          updatedAt: new Date(),
          updatedById: userId,
        };
        inAppStorage.set(foundKey, updated);
        return Promise.resolve(updated);
      }),
      deleteByMarketCenterAndType: vi.fn((mcId: string, type: string) => {
        inAppStorage.delete(`${mcId}:${type}`);
        return Promise.resolve(true);
      }),
    },
  };
});

// Mocks must be defined before any imports
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: (msg: string) =>
      Object.assign(new Error(msg), { code: "not_found" }),
    invalidArgument: (msg: string) =>
      Object.assign(new Error(msg), { code: "invalid_argument" }),
    permissionDenied: (msg: string) =>
      Object.assign(new Error(msg), { code: "permission_denied" }),
    internal: (msg: string) =>
      Object.assign(new Error(msg), { code: "internal" }),
  },
}));

vi.mock("../../ticket/db", () => ({
  db: mockDb,
  subscriptionRepository: mockSubscriptionRepository,
  fromTimestamp: (d: Date) => d,
  fromJson: (j: string) => (typeof j === "string" ? JSON.parse(j) : j),
  toJson: (o: unknown) => JSON.stringify(o),
  generateId: vi.fn(() => `gen-${Date.now()}`),
}));

vi.mock("../../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock auth/permissions to avoid importing Encore runtime
vi.mock("../../auth/permissions", () => ({
  getAccessibleMarketCenterIds: vi.fn((...args: any[]) =>
    mockSubscriptionRepository.getAccessibleMarketCenterIds(...args)
  ),
}));

vi.mock("./customization-repository", () => ({
  emailTemplateCustomizationRepository: mockEmailRepo,
  inAppTemplateCustomizationRepository: mockInAppRepo,
}));

// Import after mocks
import { listTemplateStatuses } from "./customizations/list";
import { getTemplateForEditing } from "./customizations/get";
import { saveEmailTemplate, resetEmailTemplate } from "./customizations/email";
import { saveInAppTemplate, resetInAppTemplate } from "./customizations/in-app";
import {
  previewEmailTemplate,
  previewInAppTemplate,
} from "./customizations/preview";
import { getUserContext } from "../../auth/user-context";
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_IN_APP_TEMPLATES,
  TEMPLATE_VARIABLES,
} from "./customization-types";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function clearStorage() {
  mockEmailRepo._storage.clear();
  mockInAppRepo._storage.clear();
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Template Customization Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStorage();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-austin",
    ]);
  });

  describe("Complete Admin Workflow", () => {
    it("should allow admin to view, customize, preview, and reset templates", async () => {
      const marketCenterId = "mc-austin";

      // Step 1: List all templates - should show all as default
      const initialList = await listTemplateStatuses({ marketCenterId });
      expect(initialList.templates).toHaveLength(8);
      expect(initialList.templates.every((t) => !t.hasEmailCustomization)).toBe(
        true
      );
      expect(initialList.templates.every((t) => !t.hasInAppCustomization)).toBe(
        true
      );

      // Step 2: Get ticket_created template for editing
      const templateData = await getTemplateForEditing({
        marketCenterId,
        templateType: "ticket_created",
      });
      expect(templateData.template.emailCustomization).toBeNull();
      expect(templateData.template.inAppCustomization).toBeNull();
      expect(templateData.template.emailDefault).toEqual(
        DEFAULT_EMAIL_TEMPLATES.ticket_created
      );
      expect(templateData.template.inAppDefault).toEqual(
        DEFAULT_IN_APP_TEMPLATES.ticket_created
      );

      // Step 3: Preview custom email template before saving
      const preview = await previewEmailTemplate({
        marketCenterId,
        templateType: "ticket_created",
        subject: "Austin Office: New Ticket {{ticket_title}}",
        greeting: "Hey {{user_name}}!",
        mainMessage:
          "<p>A shiny new ticket just came in from <strong>{{creator_name}}</strong>!</p>",
        buttonText: "Check it out",
        visibleFields: [
          "ticket_title",
          "due_date",
          "created_on",
          "assignee_name",
          "creator_name",
          "user_name",
        ],
      });
      expect(preview.preview.subject).toBe(
        "Austin Office: New Ticket Login Issue"
      );
      expect(preview.preview.greeting).toBe("Hey John Smith!");
      expect(preview.preview.mainMessage).toContain("John Smith");
      expect(preview.preview.visibleFieldsData).toHaveLength(6);

      // Step 4: Save email customization
      const savedEmail = await saveEmailTemplate({
        marketCenterId,
        templateType: "ticket_created",
        subject: "Austin Office: New Ticket {{ticket_title}}",
        greeting: "Hey {{user_name}}!",
        mainMessage: "<p>A shiny new ticket just came in!</p>",
        buttonText: "Check it out",
        visibleFields: ["ticket_number", "creator_name"],
      });
      expect(savedEmail.emailCustomization.id).toBeDefined();
      expect(savedEmail.emailCustomization.marketCenterId).toBe(marketCenterId);

      // Step 5: Save in-app customization
      const savedInApp = await saveInAppTemplate({
        marketCenterId,
        templateType: "ticket_created",
        title: "🎫 {{ticket_title}}",
        body: "New ticket from {{creator_name}}",
      });
      expect(savedInApp.inAppCustomization.id).toBeDefined();

      // Step 6: Verify list now shows customizations
      const updatedList = await listTemplateStatuses({ marketCenterId });
      const ticketCreated = updatedList.templates.find(
        (t) => t.templateType === "ticket_created"
      );
      expect(ticketCreated?.hasEmailCustomization).toBe(true);
      expect(ticketCreated?.hasInAppCustomization).toBe(true);
      // Other templates should still be default
      const ticketUpdated = updatedList.templates.find(
        (t) => t.templateType === "ticket_updated"
      );
      expect(ticketUpdated?.hasEmailCustomization).toBe(false);

      // Step 7: Update existing email customization
      const updatedEmail = await saveEmailTemplate({
        marketCenterId,
        templateType: "ticket_created",
        subject: "Austin: {{ticket_title}} - Updated",
        greeting: "Hello {{user_name}},",
        mainMessage: "<p>Updated message</p>",
        buttonText: "View",
        visibleFields: ["ticket_number"],
      });
      expect(updatedEmail.emailCustomization.subject).toBe(
        "Austin: {{ticket_title}} - Updated"
      );

      // Step 8: Reset email template to default
      const resetResult = await resetEmailTemplate({
        marketCenterId,
        templateType: "ticket_created",
      });
      expect(resetResult.success).toBe(true);

      // Step 9: Verify email is reset but in-app remains
      const finalList = await listTemplateStatuses({ marketCenterId });
      const finalTicketCreated = finalList.templates.find(
        (t) => t.templateType === "ticket_created"
      );
      expect(finalTicketCreated?.hasEmailCustomization).toBe(false);
      expect(finalTicketCreated?.hasInAppCustomization).toBe(true);
    });
  });

  describe("Multi-Template Customization", () => {
    it("should allow customizing multiple template types independently", async () => {
      const marketCenterId = "mc-austin";

      // Customize 3 different templates
      await saveEmailTemplate({
        marketCenterId,
        templateType: "ticket_created",
        subject: "New Ticket",
        greeting: "Hi",
        mainMessage: "Created",
        visibleFields: [],
      });

      await saveEmailTemplate({
        marketCenterId,
        templateType: "new_comments",
        subject: "New Comment",
        greeting: "Hi",
        mainMessage: "Comment added",
        visibleFields: [],
      });

      await saveInAppTemplate({
        marketCenterId,
        templateType: "ticket_assignment",
        title: "Assigned",
        body: "You got assigned",
      });

      // Verify all customizations are independent
      const list = await listTemplateStatuses({ marketCenterId });

      const created = list.templates.find(
        (t) => t.templateType === "ticket_created"
      );
      expect(created?.hasEmailCustomization).toBe(true);
      expect(created?.hasInAppCustomization).toBe(false);

      const comments = list.templates.find(
        (t) => t.templateType === "new_comments"
      );
      expect(comments?.hasEmailCustomization).toBe(true);
      expect(comments?.hasInAppCustomization).toBe(false);

      const assignment = list.templates.find(
        (t) => t.templateType === "ticket_assignment"
      );
      expect(assignment?.hasEmailCustomization).toBe(false);
      expect(assignment?.hasInAppCustomization).toBe(true);

      const updated = list.templates.find(
        (t) => t.templateType === "ticket_updated"
      );
      expect(updated?.hasEmailCustomization).toBe(false);
      expect(updated?.hasInAppCustomization).toBe(false);
    });
  });

  describe("In-App Notification Preview", () => {
    it("should preview in-app notification with all variables", async () => {
      const result = await previewInAppTemplate({
        marketCenterId: "mc-austin",
        templateType: "ticket_assignment",
        title: "{{ticket_title}} assigned to you",
        body: "{{editor_name}} assigned you. Previous: {{previous_assignment}}",
      });

      expect(result.preview.title).toBe("Login Issue assigned to you");
      expect(result.preview.body).toContain("Jane Doe"); // editor_name example
    });

    it("should preview all template types", async () => {
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
          marketCenterId: "mc-austin",
          templateType,
          title: "Test {{user_name}}",
          body: "Body text",
        });

        // All should replace user_name with the example value
        // expect(result.preview.title).toBe("Test John Smith");
        const supportsUserName = TEMPLATE_VARIABLES[templateType].some(
          (v) => v.key === "user_name"
        );

        if (supportsUserName) {
          expect(result.preview.title).toBe("Test John Smith");
        } else {
          expect(result.preview.title).toBe("Test {{user_name}}");
        }
      }
    });
  });

  describe("Email Template Preview with Visible Fields", () => {
    it("should preview email with selected visible fields only", async () => {
      const result = await previewEmailTemplate({
        marketCenterId: "mc-austin",
        templateType: "ticket_created",
        subject: "Test",
        greeting: "Hi",
        mainMessage: "Test",
        visibleFields: [
          "ticket_title",
          "due_date",
          "created_on",
          "assignee_name",
          "creator_name",
          "user_name",
        ], // Only 6 fields
      });

      expect(result.preview.visibleFieldsData).toHaveLength(6);
      expect(result.preview.visibleFieldsData[0].label).toBe("Ticket Title");
      expect(result.preview.visibleFieldsData[1].label).toBe("Due Date");
      expect(result.preview.visibleFieldsData[2].label).toBe("Created Date");
      expect(result.preview.visibleFieldsData[3].label).toBe("Assignee Name");
      expect(result.preview.visibleFieldsData[4].label).toBe("Creator Name");
      expect(result.preview.visibleFieldsData[5].label).toBe("Recipient Name");
    });

    it("should handle empty visible fields", async () => {
      const result = await previewEmailTemplate({
        marketCenterId: "mc-austin",
        templateType: "ticket_created",
        subject: "Test",
        greeting: "Hi",
        mainMessage: "Test",
        visibleFields: [],
      });

      expect(result.preview.visibleFieldsData).toHaveLength(0);
    });

    it("should handle null button text (hide button)", async () => {
      const result = await previewEmailTemplate({
        marketCenterId: "mc-austin",
        templateType: "ticket_created",
        subject: "Test",
        greeting: "Hi",
        mainMessage: "Test",
        buttonText: null,
        visibleFields: [],
      });

      expect(result.preview.buttonText).toBeNull();
    });
  });

  describe("Permission Enforcement", () => {
    it("should deny AGENT users from editing templates", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(
        saveEmailTemplate({
          marketCenterId: "mc-austin",
          templateType: "ticket_created",
          subject: "Test",
          greeting: "Hi",
          mainMessage: "Test",
          visibleFields: [],
        })
      ).rejects.toThrow("Only admins and staff leaders can edit");
    });

    it("should deny STAFF users from editing templates", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        saveInAppTemplate({
          marketCenterId: "mc-austin",
          templateType: "ticket_created",
          title: "Test",
          body: "Test",
        })
      ).rejects.toThrow("Only admins and staff leaders can edit");
    });

    it("should allow STAFF_LEADER to edit templates", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
      });

      const result = await saveInAppTemplate({
        marketCenterId: "mc-austin",
        templateType: "ticket_created",
        title: "Test",
        body: "Test",
      });

      expect(result.inAppCustomization).toBeDefined();
    });

    it("should deny access to other market centers", async () => {
      mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue(
        ["mc-austin"]
      );

      await expect(
        listTemplateStatuses({ marketCenterId: "mc-dallas" })
      ).rejects.toThrow("You do not have access to this market center");
    });
  });

  describe("Default Template Values", () => {
    it("should return correct defaults when getting template for editing", async () => {
      const result = await getTemplateForEditing({
        marketCenterId: "mc-austin",
        templateType: "ticket_survey",
      });

      expect(result.template.emailDefault).toEqual({
        subject: "How did we do? - {{ticket_title}}",
        greeting: "Hi {{surveyor_name}},",
        mainMessage:
          "Your ticket has been resolved. We'd love to hear your feedback!",
        buttonText: "Complete Survey",
        visibleFields: ["ticket_title", "surveyor_name"],
      });

      expect(result.template.inAppDefault).toEqual({
        title: "New Survey for '{{ticket_title}}'",
        body: "Please take a moment to provide feedback about your experience",
      });
    });
  });
});
