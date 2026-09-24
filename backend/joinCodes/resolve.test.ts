import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockJoinCodeRepository, mockLog } = vi.hoisted(() => ({
  mockJoinCodeRepository: { findActiveByCode: vi.fn() },
  mockLog: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => Object.assign(new Error(msg), { code: "not_found" })),
  },
}));

vi.mock("encore.dev/log", () => ({ default: mockLog }));

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

  it("rejects input that cannot be a code without touching the database", async () => {
    const result = await resolveJoinCode({ code: "ABC" });

    // The endpoint is public and unauthenticated; arbitrary-length input must
    // not become a database round trip.
    expect(mockJoinCodeRepository.findActiveByCode).not.toHaveBeenCalled();
    expect(result).toEqual({ valid: false, marketCenterName: null });
  });

  it("answers a malformed code byte-identically to an unknown one", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue(null);

    const unknown = await resolveJoinCode({ code: "ZZZZZZZZ" });
    const tooShort = await resolveJoinCode({ code: "ZZZ" });
    const tooLong = await resolveJoinCode({ code: "Z".repeat(4096) });

    // Any difference at all -- a distinct message, an extra field, even a
    // different key order -- turns the length check into a way to tell a
    // malformed guess apart from an unknown or rotated one.
    expect(JSON.stringify(tooShort)).toBe(JSON.stringify(unknown));
    expect(JSON.stringify(tooLong)).toBe(JSON.stringify(unknown));
  });

  it("logs every failed resolve at warn, and never the attempted code", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue(null);

    await resolveJoinCode({ code: "SECRETGUESS" });
    await resolveJoinCode({ code: "ZZZZZZZZ" });

    // Without this there is no signal at all that someone is hammering the
    // endpoint -- the whole point of keeping the response indistinguishable is
    // that the detection has to happen in the logs instead.
    expect(mockLog.warn).toHaveBeenCalledTimes(2);
    const logged = JSON.stringify(mockLog.warn.mock.calls);
    expect(logged).not.toContain("SECRETGUESS");
    expect(logged).not.toContain("ZZZZZZZZ");
  });
});
