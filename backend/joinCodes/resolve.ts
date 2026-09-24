import { api } from "encore.dev/api";
import { joinCodeRepository } from "../shared/repositories";
import { normalizeJoinCode } from "./code-generator";

export interface ResolveJoinCodeRequest {
  code: string;
}

export interface ResolveJoinCodeResponse {
  valid: boolean;
  marketCenterName: string | null;
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
    const joinCode = await joinCodeRepository.findActiveByCode(
      normalizeJoinCode(code)
    );

    if (!joinCode) {
      return { valid: false, marketCenterName: null };
    }

    return { valid: true, marketCenterName: joinCode.marketCenterName };
  }
);
