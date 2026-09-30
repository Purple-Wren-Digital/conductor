import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockJoinCodeRepository, mockGetUserContext } = vi.hoisted(() => ({
  mockJoinCodeRepository: {
    findActiveByMarketCenterId: vi.fn(),
    rotate: vi.fn(),
  },
  mockGetUserContext: vi.fn(),
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    permissionDenied: vi.fn((msg) =>
      Object.assign(new Error(msg), { code: "permission_denied" })
    ),
  },
}));

vi.mock("../shared/repositories", () => ({
  joinCodeRepository: mockJoinCodeRepository,
}));

vi.mock("../auth/user-context", () => ({ getUserContext: mockGetUserContext }));

import {
  getMarketCenterJoinCode,
  rotateMarketCenterJoinCode,
} from "./admin";

function contextFor(role: string) {
  return {
    userId: "user-1",
    name: "Admin",
    email: "admin@example.com",
    role,
    marketCenterId: "mc-1",
    clerkId: "clerk-1",
    isSuperuser: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserContext.mockResolvedValue(contextFor("ADMIN"));
});

describe("getMarketCenterJoinCode", () => {
  it("returns the formatted active code", async () => {
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue({
      code: "K7M42XQP",
    });

    const result = await getMarketCenterJoinCode({ id: "mc-1" });

    expect(result).toEqual({ code: "K7M42XQP", formattedCode: "K7M4-2XQP" });
  });

  it("creates a code on first read when none exists", async () => {
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue(null);
    mockJoinCodeRepository.rotate.mockImplementation(
      async (_mc: string, generateCode: () => string) => ({
        code: generateCode(),
      })
    );

    const result = await getMarketCenterJoinCode({ id: "mc-1" });

    expect(mockJoinCodeRepository.rotate).toHaveBeenCalled();
    expect(result.code).toHaveLength(8);
  });

  it("hands rotate the generator, not a single finished code", async () => {
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue(null);
    mockJoinCodeRepository.rotate.mockImplementation(
      async (_mc: string, generateCode: () => string) => ({
        code: generateCode(),
      })
    );

    await getMarketCenterJoinCode({ id: "mc-1" });

    // Passing generateJoinCode() instead of generateJoinCode gives the
    // repository one code and nothing to retry with, so a collision on
    // `code TEXT NOT NULL UNIQUE` goes back to being a raw 500.
    const [, generator] = mockJoinCodeRepository.rotate.mock.calls[0];
    expect(typeof generator).toBe("function");
    expect(generator()).toHaveLength(8);
  });

  it("allows staff leaders to read", async () => {
    mockGetUserContext.mockResolvedValue(contextFor("STAFF_LEADER"));
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue({
      code: "K7M42XQP",
    });

    await expect(getMarketCenterJoinCode({ id: "mc-1" })).resolves.toBeTruthy();
  });

  it("denies agents and staff", async () => {
    for (const role of ["AGENT", "STAFF"]) {
      mockGetUserContext.mockResolvedValue(contextFor(role));
      await expect(getMarketCenterJoinCode({ id: "mc-1" })).rejects.toThrow();
    }
  });

  it("denies reading another market center's code", async () => {
    mockGetUserContext.mockResolvedValue(contextFor("ADMIN"));

    await expect(getMarketCenterJoinCode({ id: "mc-other" })).rejects.toThrow();
  });
});

describe("rotateMarketCenterJoinCode", () => {
  it("installs a fresh code", async () => {
    mockJoinCodeRepository.rotate.mockImplementation(
      async (_mc: string, generateCode: () => string) => ({
        code: generateCode(),
      })
    );

    const result = await rotateMarketCenterJoinCode({ id: "mc-1" });

    expect(result.code).toHaveLength(8);
    expect(result.formattedCode).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("is admin-only — staff leaders cannot rotate", async () => {
    mockGetUserContext.mockResolvedValue(contextFor("STAFF_LEADER"));

    await expect(rotateMarketCenterJoinCode({ id: "mc-1" })).rejects.toThrow();
    expect(mockJoinCodeRepository.rotate).not.toHaveBeenCalled();
  });
});
