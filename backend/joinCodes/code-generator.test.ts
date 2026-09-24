import { describe, it, expect } from "vitest";
import {
  generateJoinCode,
  normalizeJoinCode,
  formatJoinCode,
} from "./code-generator";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

describe("generateJoinCode", () => {
  it("returns 8 characters from the Crockford alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(8);
      for (const char of code) expect(ALPHABET).toContain(char);
    }
  });

  it("never emits the ambiguous letters I, L, O or U", () => {
    const codes = Array.from({ length: 200 }, () => generateJoinCode()).join("");
    expect(codes).not.toMatch(/[ILOU]/);
  });
});

describe("normalizeJoinCode", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeJoinCode("k7m4-2xqp")).toBe("K7M42XQP");
    expect(normalizeJoinCode("  K7M4 2XQP  ")).toBe("K7M42XQP");
    expect(normalizeJoinCode("K7M4—2XQP")).toBe("K7M42XQP");
  });

  it("maps look-alike characters onto the alphabet", () => {
    expect(normalizeJoinCode("O0I1L1UV")).toBe("001111VV");
  });
});

describe("formatJoinCode", () => {
  it("groups the code into two blocks of four", () => {
    expect(formatJoinCode("K7M42XQP")).toBe("K7M4-2XQP");
  });
});
