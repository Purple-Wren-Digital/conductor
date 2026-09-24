import { api } from "encore.dev/api";
import log from "encore.dev/log";
import { joinCodeRepository } from "../shared/repositories";
import { normalizeJoinCode, JOIN_CODE_LENGTH } from "./code-generator";

export interface ResolveJoinCodeRequest {
  code: string;
}

export interface ResolveJoinCodeResponse {
  valid: boolean;
  marketCenterName: string | null;
}

/**
 * The single failure answer. Malformed, unknown and rotated codes must all
 * produce this exact object — anything that distinguishes them turns the
 * endpoint into a better oracle than it already is.
 */
function invalidResponse(): ResolveJoinCodeResponse {
  return { valid: false, marketCenterName: null };
}

/**
 * Resolve a join code to its market center name.
 *
 * Public (auth: false) because the join screen renders before the user exists —
 * same reason getInvitation is public (backend/invitations/invite.ts:232).
 * Returns only validity and a name: no ids, no counts, no user data. Unknown and
 * rotated codes are indistinguishable by design.
 */
export const resolveJoinCode = api<
  ResolveJoinCodeRequest,
  ResolveJoinCodeResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/join-codes/:code",
    auth: false,
  },
  async ({ code }) => {
    const normalized = normalizeJoinCode(code);

    // Bound the work an unauthenticated caller can cause: input that cannot be
    // a code never reaches the database. The response is identical to the
    // unknown-code response, so this stays invisible from the outside.
    if (normalized.length !== JOIN_CODE_LENGTH) {
      log.warn("join code resolve rejected", {
        reason: "malformed",
        // Deliberately not the attempted code: a length and a marker are
        // enough to spot a scripted enumeration run without recording guesses.
        normalizedLength: normalized.length,
      });
      return invalidResponse();
    }

    const joinCode = await joinCodeRepository.findActiveByCode(normalized);

    if (!joinCode) {
      log.warn("join code resolve failed", { reason: "unknown" });
      return invalidResponse();
    }

    return { valid: true, marketCenterName: joinCode.marketCenterName };
  }
);
