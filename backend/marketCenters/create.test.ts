import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockDb,
  mockUserContext,
  mockMarketCenterRepository,
  mockSubscriptionRepository,
  mockUserRepository,
  mockUserMarketCenterRepository,
} = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
  },
  mockUserContext: {
    name: "Admin User",
    userId: "admin-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-primary",
    clerkId: "clerk-admin",
    isSuperuser: false,
  },
  mockMarketCenterRepository: {
    create: vi.fn(),
    initializeMarketCenterDefaults: vi.fn(),
    createHistory: vi.fn(),
  },
  mockSubscriptionRepository: {
    findByMarketCenterId: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
  },
  mockUserRepository: {
    findById: vi.fn(),
    createHistory: vi.fn(),
  },
  mockUserMarketCenterRepository: {
    addUserToMarketCenter: vi.fn(),
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
  db: mockDb,
  marketCenterRepository: mockMarketCenterRepository,
  subscriptionRepository: mockSubscriptionRepository,
  userRepository: mockUserRepository,
  userMarketCenterRepository: mockUserMarketCenterRepository,
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

vi.mock("../auth/permissions", () => ({
  canCreateMarketCenters: vi.fn(() => Promise.resolve(true)),
}));

import { create } from "./create";
import { getUserContext } from "../auth/user-context";

describe("Market Center Create", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUserContext).mockResolvedValue({ ...mockUserContext });
  });

  const setupSuccessfulCreate = () => {
    mockMarketCenterRepository.create.mockResolvedValue({
      id: "mc-new",
      name: "Test MC",
      settings: null,
    });
    mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
      planType: "ENTERPRISE",
      stripeSubscriptionId: "sub-123",
      stripeCustomerId: "cus-123",
    });
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-primary",
      "mc-new",
    ]);
    mockUserRepository.findById.mockResolvedValue({
      id: "admin-123",
      name: "Admin User",
      marketCenterId: "mc-primary",
    });
    mockMarketCenterRepository.initializeMarketCenterDefaults.mockResolvedValue({
      id: "mc-new",
      name: "Test MC",
      settings: {},
      ticketCategories: [],
    });
  };

  it("should create a market center without users", async () => {
    setupSuccessfulCreate();

    const result = await create({ name: "Test MC" });

    expect(result.marketCenter).toBeDefined();
    expect(result.marketCenter.name).toBe("Test MC");
  });

  it("should add creator to junction table when not superuser", async () => {
    setupSuccessfulCreate();

    await create({ name: "Test MC" });

    expect(mockUserMarketCenterRepository.addUserToMarketCenter)
      .toHaveBeenCalledWith("admin-123", "mc-new");
  });

  it("should NOT add creator to junction table when superuser", async () => {
    vi.mocked(getUserContext).mockResolvedValue({
      ...mockUserContext,
      isSuperuser: true,
    });
    setupSuccessfulCreate();

    await create({ name: "Test MC" });

    expect(mockUserMarketCenterRepository.addUserToMarketCenter)
      .not.toHaveBeenCalled();
  });

  it("should add assigned users to junction table", async () => {
    setupSuccessfulCreate();

    await create({
      name: "Test MC",
      users: [
        { id: "user-1", email: "u1@test.com", name: "User 1", role: "AGENT" } as any,
        { id: "user-2", email: "u2@test.com", name: "User 2", role: "STAFF" } as any,
      ],
    });

    // Creator + 2 users = 3 calls
    expect(mockUserMarketCenterRepository.addUserToMarketCenter)
      .toHaveBeenCalledTimes(3);
    expect(mockUserMarketCenterRepository.addUserToMarketCenter)
      .toHaveBeenCalledWith("user-1", "mc-new");
    expect(mockUserMarketCenterRepository.addUserToMarketCenter)
      .toHaveBeenCalledWith("user-2", "mc-new");
  });

  it("should update users table when assigning users", async () => {
    setupSuccessfulCreate();

    await create({
      name: "Test MC",
      users: [
        { id: "user-1", email: "u1@test.com", name: "User 1", role: "AGENT" } as any,
      ],
    });

    // db.exec called for creator UPDATE + user UPDATE
    expect(mockDb.exec).toHaveBeenCalledTimes(2);
  });

  it("should return usersToNotify for assigned users", async () => {
    setupSuccessfulCreate();

    const result = await create({
      name: "Test MC",
      users: [
        { id: "user-1", email: "u1@test.com", name: "User 1", role: "AGENT" } as any,
      ],
    });

    expect(result.usersToNotify).toEqual([
      expect.objectContaining({ id: "user-1", updateType: "added" }),
    ]);
  });

  it("should allow creating MC with agents only (no staff leader required)", async () => {
    setupSuccessfulCreate();

    const result = await create({
      name: "Test MC",
      users: [
        { id: "user-1", email: "u1@test.com", name: "User 1", role: "AGENT" } as any,
      ],
    });

    expect(result.marketCenter).toBeDefined();
  });

  it("should succeed even when new MC is not yet in accessible list", async () => {
    setupSuccessfulCreate();
    // Simulate getAccessibleMarketCenterIds NOT returning the new MC
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-primary",
    ]);

    // Should NOT throw — the fix auto-includes the new MC since creation was authorized
    const result = await create({ name: "Test MC" });

    expect(result.marketCenter).toBeDefined();
    expect(result.marketCenter.name).toBe("Test MC");
  });

  it("should succeed for superuser without a market center", async () => {
    vi.mocked(getUserContext).mockResolvedValue({
      ...mockUserContext,
      marketCenterId: null,
      isSuperuser: true,
    });
    setupSuccessfulCreate();

    const result = await create({ name: "Test MC" });

    expect(result.marketCenter).toBeDefined();
  });

  it("should propagate junction table errors", async () => {
    setupSuccessfulCreate();
    mockUserMarketCenterRepository.addUserToMarketCenter.mockRejectedValue(
      new Error("table does not exist")
    );

    await expect(create({ name: "Test MC" })).rejects.toThrow(
      "table does not exist"
    );
  });
});
