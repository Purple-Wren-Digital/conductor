import { randomInt } from "node:crypto";

/** Crockford base32 — excludes I, L, O and U so codes survive being read aloud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

/** Look-alikes an agent might type off a printed code. */
const SUBSTITUTIONS: Record<string, string> = {
  O: "0",
  I: "1",
  L: "1",
  U: "V",
};

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function normalizeJoinCode(input: string): string {
  const stripped = (input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  return stripped.replace(/[OILU]/g, (char) => SUBSTITUTIONS[char] ?? char);
}

export function formatJoinCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
