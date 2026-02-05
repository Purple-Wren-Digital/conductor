import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
  },
  mockUserRepository: {
    findById: vi.fn(),
    findByIdWithMarketCenter: vi.fn(),
  },
}));

vi.mock("./ticket/db", () => ({
  db: hoisted.mockDb,
  userRepository: hoisted.mockUserRepository,
}));

vi.mock("./settings/db", () => ({
  db: hoisted.mockDb,
  userRepository: hoisted.mockUserRepository,
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

import {
  applyAutoAssignment,
  ASSIGNMENT_RULES,
} from "./ticket/auto-assignment";

const mockDb = hoisted.mockDb;
const mockUserRepository = hoisted.mockUserRepository;

beforeEach(() => {
  vi.resetAllMocks();
});

// TODO: Re-enable once test hang is resolved
describe.skip("Category Auto-Routing Integration", () => {
  it("should assign ticket to category default assignee when available", async () => {
    // Mock category lookup
    mockDb.queryRow
      .mockResolvedValueOnce({ id: "cat_1", defaultAssigneeId: "user_tech_1" }) // category lookup
      .mockResolvedValueOnce({ id: "user_tech_1" }); // user active check

    const ticket = {
      category: "Technical Support",
      urgency: "HIGH" as const,
      title: "Server is down",
      description: "Production server is not responding",
      creatorId: "user_client_1",
    };

    const assigneeId = await applyAutoAssignment(ticket);

    expect(assigneeId).toBe("user_tech_1");
    expect(mockDb.queryRow).toHaveBeenCalled();
  });

  it("should fall back to assignment rules when no category default assignee", async () => {
    // Mock category with no default assignee
    mockDb.queryRow
      .mockResolvedValueOnce({ id: "cat_1", defaultAssigneeId: null }) // category lookup
      .mockResolvedValueOnce({ id: "user_admin_1" }); // executeAction for ADMIN role

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
    // Mock category with inactive default assignee
    mockDb.queryRow
      .mockResolvedValueOnce({ id: "cat_1", defaultAssigneeId: "user_inactive_1" }) // category lookup
      .mockResolvedValueOnce(null) // user inactive check fails
      .mockResolvedValueOnce({ id: "user_admin_1" }); // executeAction for ADMIN role

    const ticket = {
      category: "Technical Support",
      urgency: "HIGH" as const,
      title: "Server is down",
      description: "Production server is not responding",
      creatorId: "user_client_1",
    };

    const assigneeId = await applyAutoAssignment(ticket);

    expect(assigneeId).toBe("user_admin_1");
  });

  it("should return null when no category match and no rules match", async () => {
    ASSIGNMENT_RULES.length = 0;

    // Mock no category found
    mockDb.queryRow.mockResolvedValueOnce(null);

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

// TODO: Re-enable once test hang is resolved
describe.skip("Category Management API Integration", () => {
  it("should create category and immediately be available for auto-routing", async () => {
    // Mock category lookup with default assignee
    mockDb.queryRow
      .mockResolvedValueOnce({ id: "cat_new_1", defaultAssigneeId: "user_billing_1" }) // category lookup
      .mockResolvedValueOnce({ id: "user_billing_1" }); // user active check

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
