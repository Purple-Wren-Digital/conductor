import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  mockPrisma: {
    ticketCategory: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticket: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("./ticket/db", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("./settings/db", () => ({
  getPrisma: () => hoisted.mockPrisma,
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => new Error(msg)),
    invalidArgument: vi.fn((msg) => new Error(msg)),
  },
}));

vi.mock("~encore/auth", () => ({
  getAuthData: () => ({
    userID: "user_client_1",
    marketCenterId: "market_center_1",
  }),
}));

import { applyAutoAssignment } from "./ticket/auto-assignment";

const mockPrisma = hoisted.mockPrisma;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Category Auto-Routing Integration", () => {
  it("should assign ticket to category default assignee when available", async () => {
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

    const assigneeId = await applyAutoAssignment(ticket);

    expect(assigneeId).toBe("user_tech_1");
    expect(mockPrisma.ticketCategory.findFirst).toHaveBeenCalledWith({
      where: { name: "Technical Support", marketCenterId: "market_center_1" },
    });
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user_tech_1", isActive: true },
    });
  });

  it("should fall back to assignment rules when no category default assignee", async () => {
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

    const assigneeId = await applyAutoAssignment(ticket);
    expect(assigneeId).toBe("user_admin_1");
  });

  it("should handle inactive default assignee by falling back to rules", async () => {
    const mockCategory = {
      id: "cat_1",
      name: "Technical Support",
      defaultAssigneeId: "user_inactive_1",
      marketCenterId: "market_center_1",
    };

    mockPrisma.ticketCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
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

    const assigneeId = await applyAutoAssignment(ticket);

    expect(assigneeId).toBe("user_admin_1");
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user_inactive_1", isActive: true },
    });
  });

  it("should return null when no category match and no rules match", async () => {
    mockPrisma.ticketCategory.findFirst.mockResolvedValue(null);

    const ticket = {
      category: "Unknown Category",
      urgency: "LOW" as const,
      title: "Minor issue",
      description: "This is not urgent",
      creatorId: "user_client_1",
    };

    const assigneeId = await applyAutoAssignment(ticket);
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

    // category creation path
    mockPrisma.user.findUnique.mockResolvedValue(mockAssignee);
    mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
    mockPrisma.ticketCategory.create.mockResolvedValue(mockCategory);

    // auto-assignment lookup
    mockPrisma.ticketCategory.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.user.findFirst.mockResolvedValue(mockAssignee);

    const ticket = {
      category: "Billing Issues",
      urgency: "MEDIUM" as const,
      title: "Payment not processing",
      description: "Customer's credit card payment is failing",
      creatorId: "user_client_1",
    };

    const assigneeId = await applyAutoAssignment(ticket);
    expect(assigneeId).toBe("user_billing_1");
  });
});
