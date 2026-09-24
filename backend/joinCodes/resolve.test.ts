import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockJoinCodeRepository } = vi.hoisted(() => ({
  mockJoinCodeRepository: { findActiveByCode: vi.fn() },
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => Object.assign(new Error(msg), { code: "not_found" })),
  },
}));

vi.mock("../shared/repositories", () => ({
  joinCodeRepository: mockJoinCodeRepository,
}));

import { resolveJoinCode } from "./resolve";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveJoinCode", () => {
  it("returns the market center name for an active code", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue({
      id: "jc-1",
      marketCenterId: "mc-1",
      marketCenterName: "Greater Austin Market Center",
    });

    const result = await resolveJoinCode({ code: "K7M4-2XQP" });

    expect(result).toEqual({
      valid: true,
      marketCenterName: "Greater Austin Market Center",
    });
  });

  it("normalizes the code before lookup", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue(null);

    await resolveJoinCode({ code: " k7m4-2xqp " });

    expect(mockJoinCodeRepository.findActiveByCode).toHaveBeenCalledWith("K7M42XQP");
  });

  it("returns the same answer for unknown and rotated codes", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue(null);

    const result = await resolveJoinCode({ code: "ZZZZZZZZ" });

    expect(result).toEqual({ valid: false, marketCenterName: null });
  });

  it("leaks nothing beyond validity and name", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue({
      id: "jc-1",
      marketCenterId: "mc-1",
      code: "K7M42XQP",
      marketCenterName: "Greater Austin Market Center",
    });

    const result = await resolveJoinCode({ code: "K7M42XQP" });

    expect(Object.keys(result).sort()).toEqual(["marketCenterName", "valid"]);
  });
});
