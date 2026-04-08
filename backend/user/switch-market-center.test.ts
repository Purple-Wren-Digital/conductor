import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockDb,
  mockUserContext,
  mockUserRepository,
  mockUserMarketCenterRepository,
} = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
  },
  mockUserContext: {
    name: "Test User",
    userId: "user-123",
    email: "user@test.com",
    role: "AGENT" as const,
    marketCenterId: "mc-1",
    clerkId: "clerk-user",
    isSuperuser: false,
  },
  mockUserRepository: {
    update: vi.fn(),
    createHistory: vi.fn(),
  },
  mockUserMarketCenterRepository: {
    userBelongsToMarketCenter: vi.fn(),
  },
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => Object.assign(new Error(msg), { code: "not_found" })),
    invalidArgument: vi.fn((msg) => Object.assign(new Error(msg), { code: "invalid_argument" })),
    permissionDenied: vi.fn((msg) => Object.assign(new Error(msg), { code: "permission_denied" })),
  },
}));

vi.mock("../ticket/db", () => ({
  db: mockDb,
  userRepository: mockUserRepository,
  userMarketCenterRepository: mockUserMarketCenterRepository,
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

import { switchMarketCenter } from "./switch-market-center";
import { getUserContext } from "../auth/user-context";

describe("Switch Market Center", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUserContext).mockResolvedValue({ ...mockUserContext });
  });

  it("should switch to a market center the user belongs to", async () => {
    mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(true);
    mockDb.queryRow.mockResolvedValue({ id: "mc-2", name: "Second MC" });

    const result = await switchMarketCenter({ marketCenterId: "mc-2" });

    expect(result.marketCenterId).toBe("mc-2");
    expect(result.marketCenter.name).toBe("Second MC");
    expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
      marketCenterId: "mc-2",
    });
  });

  it("should log history on switch", async () => {
    mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(true);
    mockDb.queryRow.mockResolvedValue({ id: "mc-2", name: "Second MC" });

    await switchMarketCenter({ marketCenterId: "mc-2" });

    expect(mockUserRepository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "SWITCH",
        field: "market center",
        previousValue: "mc-1",
        newValue: "mc-2",
      })
    );
  });

  it("should deny switch if user does not belong to target MC", async () => {
    mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(false);

    await expect(
      switchMarketCenter({ marketCenterId: "mc-other" })
    ).rejects.toThrow("You do not belong to this market center");
  });

  it("should allow superuser to switch to any MC", async () => {
    vi.mocked(getUserContext).mockResolvedValue({
      ...mockUserContext,
      isSuperuser: true,
    });
    mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(false);
    mockDb.queryRow.mockResolvedValue({ id: "mc-any", name: "Any MC" });

    const result = await switchMarketCenter({ marketCenterId: "mc-any" });

    expect(result.marketCenterId).toBe("mc-any");
  });

  it("should throw if target MC does not exist", async () => {
    mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(true);
    mockDb.queryRow.mockResolvedValue(null);

    await expect(
      switchMarketCenter({ marketCenterId: "mc-gone" })
    ).rejects.toThrow("Market center not found");
  });
});
