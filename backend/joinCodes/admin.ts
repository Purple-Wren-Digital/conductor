import { api, APIError } from "encore.dev/api";
import { joinCodeRepository } from "../shared/repositories";
import { getUserContext } from "../auth/user-context";
import { generateJoinCode, formatJoinCode } from "./code-generator";

export interface MarketCenterJoinCodeRequest {
  id: string;
}

export interface MarketCenterJoinCodeResponse {
  code: string;
  formattedCode: string;
}

/** Superusers aside, a leader only ever touches their own market center's code. */
async function requireMarketCenterAccess(
  marketCenterId: string,
  allowedRoles: string[]
) {
  const userContext = await getUserContext();

  if (!userContext?.role || !allowedRoles.includes(userContext.role)) {
    throw APIError.permissionDenied(
      "You don't have permission to manage join codes"
    );
  }

  if (!userContext.isSuperuser && userContext.marketCenterId !== marketCenterId) {
    throw APIError.permissionDenied(
      "You don't have permission to manage join codes"
    );
  }

  return userContext;
}

/** Reads the active code, minting one on first access so admins never see an empty card. */
export const getMarketCenterJoinCode = api<
  MarketCenterJoinCodeRequest,
  MarketCenterJoinCodeResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/:id/join-code",
    auth: true,
  },
  async ({ id }) => {
    const userContext = await requireMarketCenterAccess(id, [
      "ADMIN",
      "STAFF_LEADER",
    ]);

    const existing = await joinCodeRepository.findActiveByMarketCenterId(id);
    if (existing) {
      return { code: existing.code, formattedCode: formatJoinCode(existing.code) };
    }

    const created = await joinCodeRepository.rotate(
      id,
      generateJoinCode(),
      userContext.userId
    );
    return { code: created.code, formattedCode: formatJoinCode(created.code) };
  }
);

/** Rotation revokes the previous code immediately. Admin-only. */
export const rotateMarketCenterJoinCode = api<
  MarketCenterJoinCodeRequest,
  MarketCenterJoinCodeResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/marketCenters/:id/join-code/rotate",
    auth: true,
  },
  async ({ id }) => {
    const userContext = await requireMarketCenterAccess(id, ["ADMIN"]);

    const rotated = await joinCodeRepository.rotate(
      id,
      generateJoinCode(),
      userContext.userId
    );
    return { code: rotated.code, formattedCode: formatJoinCode(rotated.code) };
  }
);
