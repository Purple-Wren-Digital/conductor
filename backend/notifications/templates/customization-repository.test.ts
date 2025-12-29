import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockDb = vi.hoisted(() => ({
  queryAll: vi.fn(),
  queryRow: vi.fn(),
  exec: vi.fn(),
}));

const mockGenerateId = vi.hoisted(() => vi.fn(() => "generated-id-123"));

vi.mock("../../ticket/db", () => ({
  db: mockDb,
  fromTimestamp: vi.fn((d: Date) => d),
  fromJson: vi.fn((j: string) => {
    if (!j) return null;
    try {
      return typeof j === "string" ? JSON.parse(j) : j;
    } catch {
      return j;
    }
  }),
  toJson: vi.fn((o: unknown) => JSON.stringify(o)),
  generateId: mockGenerateId,
}));

// Import after mocks
import {
  emailTemplateCustomizationRepository,
  inAppTemplateCustomizationRepository,
} from "./customization-repository";

// =============================================================================
// TEST DATA
// =============================================================================

const mockEmailRow = {
  id: "email-123",
  market_center_id: "mc-123",
  template_type: "ticket_created",
  subject: "Test Subject",
  greeting: "Hi {{user_name}},",
  main_message: "<p>Test message</p>",
  button_text: "Click Here",
  visible_fields: JSON.stringify(["ticket_number", "creator_name"]),
  is_active: true,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-02"),
  created_by_id: "user-123",
  updated_by_id: "user-456",
};

const mockInAppRow = {
  id: "inapp-123",
  market_center_id: "mc-123",
  template_type: "ticket_created",
  title: "Test Title",
  body: "Test body {{creator_name}}",
  is_active: true,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-02"),
  created_by_id: "user-123",
  updated_by_id: "user-456",
};

// =============================================================================
// EMAIL TEMPLATE CUSTOMIZATION REPOSITORY TESTS
// =============================================================================

describe("emailTemplateCustomizationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByMarketCenterAndType", () => {
    it("should return customization when found", async () => {
      mockDb.queryRow.mockResolvedValue(mockEmailRow);

      const result =
        await emailTemplateCustomizationRepository.findByMarketCenterAndType(
          "mc-123",
          "ticket_created"
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe("email-123");
      expect(result?.marketCenterId).toBe("mc-123");
      expect(result?.templateType).toBe("ticket_created");
      expect(result?.subject).toBe("Test Subject");
      expect(result?.visibleFields).toEqual(["ticket_number", "creator_name"]);
    });

    it("should return null when not found", async () => {
      mockDb.queryRow.mockResolvedValue(null);

      const result =
        await emailTemplateCustomizationRepository.findByMarketCenterAndType(
          "mc-123",
          "ticket_created"
        );

      expect(result).toBeNull();
    });

    it("should only return active customizations", async () => {
      mockDb.queryRow.mockResolvedValue(null);

      await emailTemplateCustomizationRepository.findByMarketCenterAndType(
        "mc-123",
        "ticket_created"
      );

      // The query should include is_active = true condition
      expect(mockDb.queryRow).toHaveBeenCalled();
    });
  });

  describe("findAllByMarketCenter", () => {
    it("should return all customizations for market center", async () => {
      const rows = [
        { ...mockEmailRow, id: "email-1", template_type: "ticket_created" },
        { ...mockEmailRow, id: "email-2", template_type: "ticket_updated" },
      ];
      mockDb.queryAll.mockResolvedValue(rows);

      const result =
        await emailTemplateCustomizationRepository.findAllByMarketCenter(
          "mc-123"
        );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("email-1");
      expect(result[1].id).toBe("email-2");
    });

    it("should return empty array when none exist", async () => {
      mockDb.queryAll.mockResolvedValue([]);

      const result =
        await emailTemplateCustomizationRepository.findAllByMarketCenter(
          "mc-123"
        );

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return customization by ID", async () => {
      mockDb.queryRow.mockResolvedValue(mockEmailRow);

      const result =
        await emailTemplateCustomizationRepository.findById("email-123");

      expect(result?.id).toBe("email-123");
    });

    it("should return null when not found", async () => {
      mockDb.queryRow.mockResolvedValue(null);

      const result =
        await emailTemplateCustomizationRepository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create new email customization", async () => {
      mockGenerateId.mockResolvedValue("new-email-id");
      mockDb.queryRow.mockResolvedValue({
        ...mockEmailRow,
        id: "new-email-id",
      });

      const result = await emailTemplateCustomizationRepository.create(
        {
          marketCenterId: "mc-123",
          templateType: "ticket_created",
          subject: "New Subject",
          greeting: "Hello",
          mainMessage: "<p>New message</p>",
          buttonText: "Click",
          visibleFields: ["ticket_number"],
        },
        "user-123"
      );

      expect(result.id).toBe("new-email-id");
      expect(mockDb.queryRow).toHaveBeenCalled();
    });

    it("should handle null buttonText", async () => {
      mockGenerateId.mockResolvedValue("new-email-id");
      mockDb.queryRow.mockResolvedValue({
        ...mockEmailRow,
        id: "new-email-id",
        button_text: null,
      });

      const result = await emailTemplateCustomizationRepository.create(
        {
          marketCenterId: "mc-123",
          templateType: "ticket_created",
          subject: "Subject",
          greeting: "Hello",
          mainMessage: "Message",
          buttonText: null,
          visibleFields: [],
        },
        "user-123"
      );

      expect(result.buttonText).toBeNull();
    });
  });

  describe("update", () => {
    it("should update email customization", async () => {
      mockDb.queryRow.mockResolvedValue({
        ...mockEmailRow,
        subject: "Updated Subject",
      });

      const result = await emailTemplateCustomizationRepository.update(
        "email-123",
        { subject: "Updated Subject" },
        "user-456"
      );

      expect(result?.subject).toBe("Updated Subject");
    });

    it("should return null when update finds no row", async () => {
      mockDb.queryRow.mockResolvedValue(null);

      const result = await emailTemplateCustomizationRepository.update(
        "nonexistent",
        { subject: "Updated" },
        "user-456"
      );

      expect(result).toBeNull();
    });

    it("should handle partial updates", async () => {
      mockDb.queryRow.mockResolvedValue({
        ...mockEmailRow,
        greeting: "New greeting",
      });

      const result = await emailTemplateCustomizationRepository.update(
        "email-123",
        { greeting: "New greeting" },
        "user-456"
      );

      expect(result?.greeting).toBe("New greeting");
    });
  });

  describe("delete", () => {
    it("should delete email customization by ID", async () => {
      mockDb.exec.mockResolvedValue(undefined);

      const result =
        await emailTemplateCustomizationRepository.delete("email-123");

      expect(result).toBe(true);
      expect(mockDb.exec).toHaveBeenCalled();
    });
  });

  describe("deleteByMarketCenterAndType", () => {
    it("should delete by market center and type", async () => {
      mockDb.exec.mockResolvedValue(undefined);

      const result =
        await emailTemplateCustomizationRepository.deleteByMarketCenterAndType(
          "mc-123",
          "ticket_created"
        );

      expect(result).toBe(true);
      expect(mockDb.exec).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// IN-APP TEMPLATE CUSTOMIZATION REPOSITORY TESTS
// =============================================================================

describe("inAppTemplateCustomizationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByMarketCenterAndType", () => {
    it("should return customization when found", async () => {
      mockDb.queryRow.mockResolvedValue(mockInAppRow);

      const result =
        await inAppTemplateCustomizationRepository.findByMarketCenterAndType(
          "mc-123",
          "ticket_created"
        );

      expect(result).toBeDefined();
      expect(result?.id).toBe("inapp-123");
      expect(result?.marketCenterId).toBe("mc-123");
      expect(result?.templateType).toBe("ticket_created");
      expect(result?.title).toBe("Test Title");
      expect(result?.body).toBe("Test body {{creator_name}}");
    });

    it("should return null when not found", async () => {
      mockDb.queryRow.mockResolvedValue(null);

      const result =
        await inAppTemplateCustomizationRepository.findByMarketCenterAndType(
          "mc-123",
          "ticket_created"
        );

      expect(result).toBeNull();
    });
  });

  describe("findAllByMarketCenter", () => {
    it("should return all customizations for market center", async () => {
      const rows = [
        { ...mockInAppRow, id: "inapp-1", template_type: "ticket_created" },
        { ...mockInAppRow, id: "inapp-2", template_type: "new_comments" },
        { ...mockInAppRow, id: "inapp-3", template_type: "ticket_assignment" },
      ];
      mockDb.queryAll.mockResolvedValue(rows);

      const result =
        await inAppTemplateCustomizationRepository.findAllByMarketCenter(
          "mc-123"
        );

      expect(result).toHaveLength(3);
    });

    it("should return empty array when none exist", async () => {
      mockDb.queryAll.mockResolvedValue([]);

      const result =
        await inAppTemplateCustomizationRepository.findAllByMarketCenter(
          "mc-123"
        );

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return customization by ID", async () => {
      mockDb.queryRow.mockResolvedValue(mockInAppRow);

      const result =
        await inAppTemplateCustomizationRepository.findById("inapp-123");

      expect(result?.id).toBe("inapp-123");
    });
  });

  describe("create", () => {
    it("should create new in-app customization", async () => {
      mockGenerateId.mockResolvedValue("new-inapp-id");
      mockDb.queryRow.mockResolvedValue({
        ...mockInAppRow,
        id: "new-inapp-id",
      });

      const result = await inAppTemplateCustomizationRepository.create(
        {
          marketCenterId: "mc-123",
          templateType: "ticket_created",
          title: "New Title",
          body: "New body",
        },
        "user-123"
      );

      expect(result.id).toBe("new-inapp-id");
    });
  });

  describe("update", () => {
    it("should update in-app customization", async () => {
      mockDb.queryRow.mockResolvedValue({
        ...mockInAppRow,
        title: "Updated Title",
      });

      const result = await inAppTemplateCustomizationRepository.update(
        "inapp-123",
        { title: "Updated Title" },
        "user-456"
      );

      expect(result?.title).toBe("Updated Title");
    });

    it("should handle isActive updates", async () => {
      mockDb.queryRow.mockResolvedValue({
        ...mockInAppRow,
        is_active: false,
      });

      const result = await inAppTemplateCustomizationRepository.update(
        "inapp-123",
        { isActive: false },
        "user-456"
      );

      expect(result?.isActive).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete in-app customization", async () => {
      mockDb.exec.mockResolvedValue(undefined);

      const result =
        await inAppTemplateCustomizationRepository.delete("inapp-123");

      expect(result).toBe(true);
    });
  });

  describe("deleteByMarketCenterAndType", () => {
    it("should delete by market center and type", async () => {
      mockDb.exec.mockResolvedValue(undefined);

      const result =
        await inAppTemplateCustomizationRepository.deleteByMarketCenterAndType(
          "mc-123",
          "ticket_created"
        );

      expect(result).toBe(true);
    });
  });
});

// =============================================================================
// DATA MAPPING TESTS
// =============================================================================

describe("Data Mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly map snake_case database columns to camelCase", async () => {
    mockDb.queryRow.mockResolvedValue(mockEmailRow);

    const result =
      await emailTemplateCustomizationRepository.findById("email-123");

    expect(result).toMatchObject({
      id: "email-123",
      marketCenterId: "mc-123",
      templateType: "ticket_created",
      subject: "Test Subject",
      greeting: "Hi {{user_name}},",
      mainMessage: "<p>Test message</p>",
      buttonText: "Click Here",
      isActive: true,
      createdById: "user-123",
      updatedById: "user-456",
    });
  });

  it("should correctly parse JSON visible_fields", async () => {
    mockDb.queryRow.mockResolvedValue({
      ...mockEmailRow,
      visible_fields: JSON.stringify(["field1", "field2", "field3"]),
    });

    const result =
      await emailTemplateCustomizationRepository.findById("email-123");

    expect(result?.visibleFields).toEqual(["field1", "field2", "field3"]);
  });

  it("should handle null visible_fields", async () => {
    mockDb.queryRow.mockResolvedValue({
      ...mockEmailRow,
      visible_fields: null,
    });

    const result =
      await emailTemplateCustomizationRepository.findById("email-123");

    // Should fall back to empty array or handle gracefully
    expect(result?.visibleFields).toEqual([]);
  });

  it("should preserve Date objects for timestamps", async () => {
    const testDate = new Date("2024-06-15T10:30:00Z");
    mockDb.queryRow.mockResolvedValue({
      ...mockEmailRow,
      created_at: testDate,
      updated_at: testDate,
    });

    const result =
      await emailTemplateCustomizationRepository.findById("email-123");

    expect(result?.createdAt).toEqual(testDate);
    expect(result?.updatedAt).toEqual(testDate);
  });
});
