import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserRepository,
  mockMarketCenterRepository,
  mockUserContext,
} = vi.hoisted(() => ({
  mockUserRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    createHistory: vi.fn(),
  },
  mockMarketCenterRepository: {
    findById: vi.fn(),
  },
  mockUserContext: {
    name: "Admin User",
    userId: "admin-1",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-1",
    clerkId: "clerk-admin",
    isSuperuser: false,
  },
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => Object.assign(new Error(msg), { code: "not_found" })),
    invalidArgument: vi.fn((msg) => Object.assign(new Error(msg), { code: "invalid_argument" })),
    permissionDenied: vi.fn((msg) => Object.assign(new Error(msg), { code: "permission_denied" })),
    internal: vi.fn((msg) => Object.assign(new Error(msg), { code: "internal" })),
  },
}));

vi.mock("../ticket/db", () => ({
  userRepository: mockUserRepository,
  marketCenterRepository: mockMarketCenterRepository,
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

vi.mock("../auth/permissions", () => ({
  canManageTeam: vi.fn(() => Promise.resolve(true)),
  isSuperuserProtected: vi.fn(() => false),
}));

vi.mock("./utils-update-clerk", () => ({
  updateClerkUserEmail: vi.fn(),
  updateClerkUserName: vi.fn(),
}));

import { update } from "./update";
import { getUserContext } from "../auth/user-context";

const existingUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@test.com",
  role: "STAFF" as const,
  marketCenterId: "mc-1",
  isActive: true,
  clerkId: "clerk-user-1",
  isSuperuser: false,
};

describe("update user - market center assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue({ ...mockUserContext });
    mockUserRepository.findById.mockResolvedValue({ ...existingUser });
  });

  it("should preserve market center when editing other fields", async () => {
    mockMarketCenterRepository.findById.mockResolvedValue({
      id: "mc-1",
      name: "Market Center 1",
    });
    mockUserRepository.update.mockResolvedValue({
      ...existingUser,
      name: "Jane Doe",
    });

    await update({
      id: "user-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "john@test.com",
      role: "STAFF",
      marketCenterId: "mc-1",
    });

    // marketCenterId should NOT be in the update call since it hasn't changed
    const updateCall = mockUserRepository.update.mock.calls[0];
    expect(updateCall[1]).not.toHaveProperty("marketCenterId");
  });

  it("should save new market center when changed", async () => {
    mockMarketCenterRepository.findById.mockResolvedValue({
      id: "mc-2",
      name: "Market Center 2",
    });
    mockUserRepository.update.mockResolvedValue({
      ...existingUser,
      marketCenterId: "mc-2",
    });

    await update({
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      role: "STAFF",
      marketCenterId: "mc-2",
    });

    const updateCall = mockUserRepository.update.mock.calls[0];
    expect(updateCall[1].marketCenterId).toBe("mc-2");
  });

  it("should unassign market center when set to Unassigned", async () => {
    mockUserRepository.update.mockResolvedValue({
      ...existingUser,
      marketCenterId: null,
    });

    await update({
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      role: "STAFF",
      marketCenterId: "Unassigned",
    });

    const updateCall = mockUserRepository.update.mock.calls[0];
    expect(updateCall[1].marketCenterId).toBe(null);
  });
});
