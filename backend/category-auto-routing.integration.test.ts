import { describe, it, expect, vi } from "vitest";

// This integration test verifies that the category auto-routing system works correctly
// It tests the flow from ticket creation through category-based assignment

// Mock the database
const mockPrisma = {
  ticketCategory: {
    findFirst: vi.fn(),
  },
  ticket: {
    create: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
};

// Mock the auto-assignment module
vi.mock("./ticket/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("./settings/db", () => ({
  getPrisma: () => mockPrisma,
}));

// Mock Encore API
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => new Error(msg)),
    invalidArgument: vi.fn((msg) => new Error(msg)),
  },
}));

import { applyAutoAssignment } from "./ticket/auto-assignment";

describe("Category Auto-Routing Integration", () => {
  it("should assign ticket to category default assignee when available", async () => {
    // Setup: Category with default assignee exists
    const mockCategory = {
      id: "cat_1",
      name: "Technical Support",
      defaultAssigneeId: "user_tech_1",
      marketCenterId: "market_center_1",
    };

    const mockAssignee = {
      id: "user_tech_1",
      name: "Tech Specialist",
      email: "tech@example.com",
      isActive: true,
    };

    mockPrisma.ticketCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.user.findFirst.mockResolvedValue(mockAssignee);

    const ticket = {
      category: "Technical Support",
      urgency: "HIGH" as const,
      title: "Server is down",
      description: "Production server is not responding",
      creatorId: "user_client_1",
    };

    // Act: Apply auto-assignment
    const assigneeId = await applyAutoAssignment(ticket);

    // Assert: Should assign to category default assignee
    expect(assigneeId).toBe("user_tech_1");
    expect(mockPrisma.ticketCategory.findFirst).toHaveBeenCalledWith({
      where: {
        name: "Technical Support",
        marketCenterId: "market_center_1",
      },
    });
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "user_tech_1",
        isActive: true,
      },
    });
  });

  it("should fall back to assignment rules when no category default assignee", async () => {
    // Setup: Category exists but no default assignee
    const mockCategory = {
      id: "cat_1",
      name: "General",
      defaultAssigneeId: null,
      marketCenterId: "market_center_1",
    };

    mockPrisma.ticketCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user_admin_1",
      role: "ADMIN",
      isActive: true,
    });

    const ticket = {
      category: "General",
      urgency: "HIGH" as const,
      title: "Important issue",
      description: "This needs immediate attention",
      creatorId: "user_client_1",
    };

    // Act: Apply auto-assignment
    const assigneeId = await applyAutoAssignment(ticket);

    // Assert: Should fall back to assignment rules (high priority goes to admin)
    expect(assigneeId).toBe("user_admin_1");
  });

  it("should handle inactive default assignee by falling back to rules", async () => {
    // Setup: Category has default assignee but user is inactive
    const mockCategory = {
      id: "cat_1",
      name: "Technical Support",
      defaultAssigneeId: "user_inactive_1",
      marketCenterId: "market_center_1",
    };

    mockPrisma.ticketCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.user.findFirst
      .mockResolvedValueOnce(null) // First call for inactive assignee
      .mockResolvedValueOnce({ // Second call for fallback rule
        id: "user_admin_1",
        role: "ADMIN",
        isActive: true,
      });

    const ticket = {
      category: "Technical Support",
      urgency: "HIGH" as const,
      title: "Server is down",
      description: "Production server is not responding",
      creatorId: "user_client_1",
    };

    // Act: Apply auto-assignment
    const assigneeId = await applyAutoAssignment(ticket);

    // Assert: Should fall back to assignment rules
    expect(assigneeId).toBe("user_admin_1");
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "user_inactive_1",
        isActive: true,
      },
    });
  });

  it("should return null when no category match and no rules match", async () => {
    // Setup: Category does not exist
    mockPrisma.ticketCategory.findFirst.mockResolvedValue(null);

    const ticket = {
      category: "Unknown Category",
      urgency: "LOW" as const,
      title: "Minor issue",
      description: "This is not urgent",
      creatorId: "user_client_1",
    };

    // Act: Apply auto-assignment
    const assigneeId = await applyAutoAssignment(ticket);

    // Assert: Should return null (no assignment)
    expect(assigneeId).toBeNull();
  });
});

describe("Category Management API Integration", () => {
  it("should create category and immediately be available for auto-routing", async () => {
    const mockCategory = {
      id: "cat_new_1",
      name: "Billing Issues",
      description: "Customer billing inquiries",
      marketCenterId: "market_center_1",
      defaultAssigneeId: "user_billing_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultAssignee: {
        id: "user_billing_1",
        name: "Billing Specialist",
        email: "billing@example.com",
      },
    };

    const mockAssignee = {
      id: "user_billing_1",
      name: "Billing Specialist",
      email: "billing@example.com",
      isActive: true,
    };

    // Mock category creation
    mockPrisma.user.findUnique.mockResolvedValue(mockAssignee);
    mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
    mockPrisma.ticketCategory.create.mockResolvedValue(mockCategory);

    // Mock auto-assignment lookup
    mockPrisma.ticketCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.user.findFirst.mockResolvedValue(mockAssignee);

    // Simulate: Category created, then ticket with that category
    const ticket = {
      category: "Billing Issues",
      urgency: "MEDIUM" as const,
      title: "Payment not processing",
      description: "Customer's credit card payment is failing",
      creatorId: "user_client_1",
    };

    const assigneeId = await applyAutoAssignment(ticket);

    // Assert: Ticket should be assigned to the new category's default assignee
    expect(assigneeId).toBe("user_billing_1");
  });
});