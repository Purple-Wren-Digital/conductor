import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserRepository, mockGetAccessibleMarketCenterIds, mockGetUserContext } =
  vi.hoisted(() => ({
    mockUserRepository: {
      search: vi.fn(),
      findById: vi.fn(),
    },
    mockGetAccessibleMarketCenterIds: vi.fn(),
    mockGetUserContext: vi.fn(),
  }));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    permissionDenied: vi.fn((msg) =>
      Object.assign(new Error(msg), { code: "permission_denied" })
    ),
    notFound: vi.fn((msg) =>
      Object.assign(new Error(msg), { code: "not_found" })
    ),
  },
}));

vi.mock("../ticket/db", () => ({
  userRepository: mockUserRepository,
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock("../auth/permissions", () => ({
  getAccessibleMarketCenterIds: mockGetAccessibleMarketCenterIds,
}));

import { search } from "./search";

const ADMIN_CTX = {
  name: "Admin",
  userId: "admin-1",
  email: "admin@test.com",
  role: "ADMIN" as const,
  marketCenterId: "mc-1",
  clerkId: "clerk-admin",
  isSuperuser: false,
};

const SUPERUSER_CTX = {
  name: "Super",
  userId: "super-1",
  email: "super@test.com",
  role: "ADMIN" as const,
  marketCenterId: null,
  clerkId: "clerk-super",
  isSuperuser: true,
};

describe("user search - unassigned users visibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUserRepository.search.mockResolvedValue({ users: [], total: 0 });
  });

  it("admin selecting 'all' (no marketCenterId param) should include Unassigned so NULL-MC users appear", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1", "mc-2"]);

    await search({});

    expect(mockUserRepository.search).toHaveBeenCalledWith(
      expect.objectContaining({
        marketCenterIds: expect.arrayContaining(["mc-1", "mc-2", "Unassigned"]),
      })
    );
  });

  it("superuser selecting 'all' should include Unassigned", async () => {
    mockGetUserContext.mockResolvedValue(SUPERUSER_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1", "mc-2", "mc-3"]);

    await search({});

    expect(mockUserRepository.search).toHaveBeenCalledWith(
      expect.objectContaining({
        marketCenterIds: expect.arrayContaining([
          "mc-1",
          "mc-2",
          "mc-3",
          "Unassigned",
        ]),
      })
    );
  });

  it("admin selecting a specific marketCenterId should NOT include Unassigned", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1", "mc-2"]);

    await search({ marketCenterId: "mc-1" });

    const call = mockUserRepository.search.mock.calls[0][0];
    expect(call.marketCenterIds).toEqual(["mc-1"]);
    expect(call.marketCenterIds).not.toContain("Unassigned");
  });

  it("admin selecting 'Unassigned' should only query Unassigned", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1", "mc-2"]);

    await search({ marketCenterId: "Unassigned" });

    const call = mockUserRepository.search.mock.calls[0][0];
    expect(call.marketCenterIds).toEqual(["Unassigned"]);
  });

  it("admin 'all' with isActive=false should still include Unassigned so inactive unassigned users appear", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);

    await search({ isActive: false });

    expect(mockUserRepository.search).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        marketCenterIds: expect.arrayContaining(["mc-1", "Unassigned"]),
      })
    );
  });
});
