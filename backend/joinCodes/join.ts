import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { joinCodeRepository, userRepository } from "../shared/repositories";
import { notificationTopic } from "../notifications/topic";
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
 * Reused for both the pre-transaction check and the in-transaction gate (the
 * latter also fires for a same-instant deactivation race) — the caller doesn't
 * need to know which check caught it.
 */
// Refusing is deliberate -- moving between market centers is an admin action,
// not a code redemption -- so the message has to say where to go next instead of
// dead-ending someone who did nothing wrong.
const ALREADY_MEMBER_MESSAGE =
  "You're already a member of a market center. If you need to move to a " +
  "different one, ask an admin at your market center to move you.";

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
    // This is the fast path for the common case — a clean error without opening
    // a transaction. It is NOT the concurrency guard; see the in-transaction
    // gate below for that.
    if (user.marketCenterId) {
      throw APIError.failedPrecondition(ALREADY_MEMBER_MESSAGE);
    }

    const joinCode = await joinCodeRepository.findActiveByCode(
      normalizeJoinCode(code)
    );
    if (!joinCode) {
      throw APIError.failedPrecondition(INVALID_CODE_MESSAGE);
    }

    // All writes land together or not at all. A partial provision (market
    // center set, junction row missing) leaves the agent with an empty market
    // center switcher, which is worse than a clean failure they can retry.
    //
    // These are raw tx.exec/tx.queryRow rather than repository calls: the
    // repository helpers bind the non-transactional `db`, and Encore's compiler
    // requires static db usage (see the header of
    // shared/repositories/user-market-center.repository.ts).
    await withTransaction(async (tx) => {
      // The UPDATE itself is the concurrency gate — not the pre-check above.
      // Two concurrent requests from the same account (racing codes for two
      // different market centers, or a plain double submit of the same code)
      // can both pass the pre-check, since neither has committed yet. Only one
      // UPDATE can ever match this WHERE clause: whichever commits first flips
      // market_center_id away from NULL, so the second transaction's UPDATE
      // matches zero rows and RETURNING gives back nothing. That loser throws
      // before the junction/history writes run, so there is no split-brain
      // membership (two rows in user_market_centers), no duplicate history row,
      // and no duplicate leadership notification. Role is pinned to AGENT
      // regardless of anything on the caller.
      const updated = await tx.queryRow<{ id: string }>`
        UPDATE users
        SET market_center_id = ${joinCode.marketCenterId},
            role = 'AGENT',
            joined_via_join_code = true,
            updated_at = NOW()
        WHERE id = ${userContext.userId}
          AND market_center_id IS NULL
          AND is_active = true
        RETURNING id
      `;

      if (!updated) {
        throw APIError.failedPrecondition(ALREADY_MEMBER_MESSAGE);
      }

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

    // Deliberately outside the transaction and best-effort: the join already
    // committed above, so a failure here must not turn into a 5xx for the
    // agent — a retry would just hit the "already a member" guard with no way
    // to self-recover. getUserContext() already calls
    // ensureNotificationPreferences on both of its user-creation branches, so
    // this call is mostly a defensive backstop for pre-existing users. Both
    // failures are logged and swallowed rather than surfaced.
    try {
      await ensureNotificationPreferences(userContext.userId);
    } catch (err) {
      log.error("joinWithCode: ensureNotificationPreferences failed after commit", {
        userId: userContext.userId,
        marketCenterId: joinCode.marketCenterId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await notifyMarketCenterLeadership(
        joinCode.marketCenterId,
        joinCode.marketCenterName,
        {
          name: userContext.name || userContext.email,
          email: userContext.email,
        }
      );
    } catch (err) {
      log.error("joinWithCode: notifyMarketCenterLeadership failed after commit", {
        userId: userContext.userId,
        marketCenterId: joinCode.marketCenterId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      marketCenterId: joinCode.marketCenterId,
      marketCenterName: joinCode.marketCenterName,
    };
  }
);

/**
 * Makes a leaked code visible within minutes rather than at the next roster review.
 *
 * Publishes to notificationTopic, the same path every other producer uses
 * (notifications/activity-handlers.ts, cron/sla-check.cron.ts). Writing
 * notification rows directly would skip everything that makes this notification
 * land: the EMAIL row alongside the IN_APP one (the "Market Center Assignment"
 * default is email: true — see utils.ts:120), the user/market-center preference
 * checks, and broadcastNotification, without which the dashboard stream never
 * fires its toast and never invalidates the notification query.
 */
async function notifyMarketCenterLeadership(
  marketCenterId: string,
  marketCenterName: string,
  joiner: { name: string; email: string }
): Promise<void> {
  const [admins, leaders] = await Promise.all([
    userRepository.findByMarketCenterIdAndRole(marketCenterId, "ADMIN"),
    userRepository.findByMarketCenterIdAndRole(marketCenterId, "STAFF_LEADER"),
  ]);

  const recipients = [...admins, ...leaders];
  if (recipients.length === 0) return;

  const title = "New agent joined";
  const body = `${joiner.name} joined ${marketCenterName} as an agent.`;

  await Promise.all(
    recipients.map((recipient) =>
      notificationTopic.publish({
        userId: recipient.id,
        category: "ACTIVITY",
        // Its own type, not "Market Center Assignment": that template addresses
        // the recipient about THEIR assignment, so leadership were being told
        // their own market center assignment had been updated.
        type: "Agent Joined",
        inApp: { title, body },
        email: { title, body },
        priority: "MEDIUM",
        data: {
          marketCenterId,
          // The email renderer reads its variables from here, not from the
          // title/body above (channels/email/customization-renderer.ts).
          agentJoined: {
            agentName: joiner.name,
            marketCenterName,
            marketCenterId,
            // Filled per recipient by the renderer; leadership each see their
            // own name in the greeting.
            userName: recipient.name ?? "",
          },
        },
      })
    )
  );
}
