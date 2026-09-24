import { api, APIError } from "encore.dev/api";
import {
  joinCodeRepository,
  userRepository,
  notificationRepository,
} from "../shared/repositories";
import { withTransaction } from "../ticket/db";
import {
  getUserContext,
  ensureNotificationPreferences,
} from "../auth/user-context";
import { normalizeJoinCode } from "./code-generator";

export interface JoinWithCodeRequest {
  code: string;
}

export interface JoinWithCodeResponse {
  marketCenterId: string;
  marketCenterName: string;
}

/** Unknown and rotated codes are deliberately indistinguishable. */
const INVALID_CODE_MESSAGE =
  "That join code isn't valid. Check it with your market center.";

/**
 * Join the authenticated user to a market center as an AGENT.
 *
 * Deliberately does NOT call the seat check: agents are free and excluded from
 * the paid seat count (shared/repositories/subscription.repository.ts:134).
 */
export const joinWithCode = api<JoinWithCodeRequest, JoinWithCodeResponse>(
  {
    expose: true,
    method: "POST",
    path: "/join-codes/:code/join",
    auth: true,
  },
  async ({ code }) => {
    const userContext = await getUserContext();

    const user = await userRepository.findById(userContext.userId);
    if (!user) {
      throw APIError.notFound("User not found");
    }

    if (!user.isActive) {
      throw APIError.failedPrecondition(
        "Your account has been deactivated. Contact your market center."
      );
    }

    // A real move between brokerages is an admin action, not a code redemption.
    if (user.marketCenterId) {
      throw APIError.failedPrecondition(
        "You're already a member of a market center."
      );
    }

    const joinCode = await joinCodeRepository.findActiveByCode(
      normalizeJoinCode(code)
    );
    if (!joinCode) {
      throw APIError.failedPrecondition(INVALID_CODE_MESSAGE);
    }

    // All three writes land together or not at all. A partial provision (market
    // center set, junction row missing) leaves the agent with an empty market
    // center switcher, which is worse than a clean failure they can retry.
    //
    // These are raw tx.exec rather than repository calls: the repository helpers
    // bind the non-transactional `db`, and Encore's compiler requires static db
    // usage (see the header of shared/repositories/user-market-center.repository.ts).
    await withTransaction(async (tx) => {
      // Role is pinned to AGENT regardless of anything on the caller.
      await tx.exec`
        UPDATE users
        SET market_center_id = ${joinCode.marketCenterId},
            role = 'AGENT',
            joined_via_join_code = true,
            updated_at = NOW()
        WHERE id = ${userContext.userId}
      `;

      // Non-optional: /users/me reads the market center switcher from this
      // junction table (backend/user/me.ts:52). ON CONFLICT DO NOTHING makes a
      // double submit idempotent.
      await tx.exec`
        INSERT INTO user_market_centers (user_id, market_center_id)
        VALUES (${userContext.userId}, ${joinCode.marketCenterId})
        ON CONFLICT (user_id, market_center_id) DO NOTHING
      `;

      // Column list mirrors userRepository.createHistory
      // (shared/repositories/user.repository.ts:532) — note changed_at, not created_at.
      await tx.exec`
        INSERT INTO user_history (
          id, user_id, market_center_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
        ) VALUES (
          gen_random_uuid()::text,
          ${userContext.userId},
          ${joinCode.marketCenterId},
          'CREATE',
          'user',
          NULL,
          'Activated via Join Code',
          NULL,
          ${userContext.userId},
          NOW()
        )
      `;
    });

    // Deliberately outside the transaction: a preferences or notification hiccup
    // must not roll back a join the agent already completed. Both are safe to
    // retry and ensureNotificationPreferences is idempotent.
    await ensureNotificationPreferences(userContext.userId);

    await notifyMarketCenterLeadership(
      joinCode.marketCenterId,
      joinCode.marketCenterName,
      userContext.name || userContext.email
    );

    return {
      marketCenterId: joinCode.marketCenterId,
      marketCenterName: joinCode.marketCenterName,
    };
  }
);

/** Makes a leaked code visible within minutes rather than at the next roster review. */
async function notifyMarketCenterLeadership(
  marketCenterId: string,
  marketCenterName: string,
  joinerName: string
): Promise<void> {
  const [admins, leaders] = await Promise.all([
    userRepository.findByMarketCenterIdAndRole(marketCenterId, "ADMIN"),
    userRepository.findByMarketCenterIdAndRole(marketCenterId, "STAFF_LEADER"),
  ]);

  const recipients = [...admins, ...leaders];
  if (recipients.length === 0) return;

  await notificationRepository.createMany(
    recipients.map((recipient) => ({
      userId: recipient.id,
      channel: "IN_APP" as const,
      category: "ACCOUNT" as const,
      type: "Market Center Assignment",
      title: "New agent joined",
      body: `${joinerName} joined ${marketCenterName} as an agent.`,
    }))
  );
}
