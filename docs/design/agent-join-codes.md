# Design: Agent Join Codes (Self-Serve Market Center Signup)

**Date:** 2026-09-24
**Status:** Approved — not yet implemented
**Touches protected zones:** Yes. One migration (`backend/ticket/migrations/`) adding a new
table plus one column on `users`. No changes to `backend/subscription/` billing logic and no
`middleware.ts` changes — the join path deliberately bypasses the seat system rather than
extending it.

## Problem

An agent who wants to join their market center clicks **Get Started** on the landing page and
lands on `/pricing`, because that is the only call to action there. If they instead sign up
directly, `SubscriptionGuard` sees a user with no subscription and no `market_center_id` and
redirects them to `/dashboard/subscription` (`frontend/components/subscription-guard.tsx:117`).

Either route tells an agent they must buy a market center. The only working path today is an
emailed, single-use, email-bound invitation (`backend/invitations/invite.ts`), which requires
an admin to act for every single agent.

Agents are free — `subscription.repository.ts:134` excludes `role = 'AGENT'` from the paid seat
count — so there is no billing reason for this friction. It is purely a missing route.

## Chosen approach: join codes

Each market center gets one active, rotatable code. The admin distributes it however they
already reach their agents (onboarding packet, internal email, a sign on the wall). An agent
enters it and is in, as an `AGENT`, immediately.

**Why not an approval queue.** Approval requires the agent to *find* their market center
first, which means publishing a searchable directory of market centers to anyone who signs
up — i.e. Conductor's customer list. A code resolves to exactly one market center and exposes
no directory at all. Approval also imposes a permanent per-agent chore on admins that grows
with adoption, and it fails silently: requests pile up unread while agents sit blocked. A code
fails loudly and rarely — an unexpected name appears in the roster, and the admin deactivates
them.

**Accepted risk.** A leaked code lets a stranger in as an `AGENT`. The blast radius is small:
the `AGENT` role sees only tickets it created, so the exposure is staff names and ticket
category names. It is visible in the roster, reversible by deactivation, and killable by
rotation. Approval remains **additive later** if abuse ever appears; it would not invalidate
the code path. Starting with approval and removing it later is the harder direction to walk
back.

## Data model

New table, one migration: `backend/ticket/migrations/20260924000000_add_join_codes/migration.sql`

```sql
CREATE TABLE market_center_join_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  market_center_id TEXT NOT NULL REFERENCES market_centers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP(3)
);

-- One live code per market center; rotated codes stay as history.
CREATE UNIQUE INDEX market_center_join_codes_one_active
  ON market_center_join_codes(market_center_id) WHERE is_active;
CREATE INDEX market_center_join_codes_code_idx ON market_center_join_codes(code);

ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_via_join_code BOOLEAN NOT NULL DEFAULT false;
```

Rotation deactivates the current row (`is_active = false`, `deactivated_at = now()`) and
inserts a new one, so the audit trail survives.

**Code format.** 8 characters of Crockford base32 (digits plus uppercase letters excluding
`I`, `L`, `O`, `U`), displayed grouped as `K7M4-2XQP`. Readable aloud, unambiguous when typed,
~1.1 × 10¹² keyspace. Input is normalized (uppercase, strip dashes/whitespace) before lookup.

## Backend

New service `backend/joinCodes/` following the existing Encore service layout, with a
repository in `backend/shared/repositories/join-code.repository.ts`.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /join-codes/:code` | `auth: false` | Resolve to `{ valid, marketCenterName }` — nothing else |
| `POST /join-codes/:code/join` | `auth: true` | Join the authenticated user to that market center |
| `GET /marketCenters/:id/join-code` | `auth: true`, ADMIN/STAFF_LEADER | Current code + join link |
| `POST /marketCenters/:id/join-code/rotate` | `auth: true`, ADMIN | Rotate |

The public resolve endpoint mirrors `getInvitation` (`invite.ts:232`), which is already
`auth: false` for the same reason: the signup screen must render before the user exists.

### The join endpoint must fully provision the user

`acceptInvitation` (`invite.ts:304`) and `user-context.ts:104` together establish what a
correctly provisioned member looks like. The join endpoint performs all four steps inside
`withTransaction` (`backend/ticket/db.ts:44`), or the agent lands half-set-up:

1. Set `users.market_center_id` and `role = 'AGENT'`, and `joined_via_join_code = true`.
2. Insert the `user_market_centers` junction row. **Non-optional:** `/users/me` reads the
   market center switcher from that junction table (`backend/user/me.ts:52`), so skipping it
   leaves the agent with an empty switcher. Note that inside a transaction this must be a
   direct `tx.exec` rather than `userMarketCenterRepository.addUserToMarketCenter` — that
   helper binds the non-transactional `db`, and the repository header documents the constraint
   (Encore's compiler requires static db usage).
3. Create user settings and notification preferences, or the agent receives no notifications.
   `ensureNotificationPreferences` is **private** to `backend/auth/user-context.ts:12`, so
   this either exports it or follows the `createUserSettings` + `createNotificationPreferences`
   sequence that `invite.ts:395-415` already uses. Exporting the existing helper is preferred —
   the duplicated sequence in `invite.ts` is the thing to converge on, not copy again.
4. `userRepository.createHistory({ action: "CREATE", field: "user", newValue: "Activated via
   Join Code" })`, matching the "Activated via Invitation" precedent.

### Guards

- **Reject if the user already has a `market_center_id`** (`failedPrecondition`). Prevents
  hopping between brokerages with a borrowed code; a real move is an admin action.
- **Reject inactive or unknown codes** with one generic message, so the endpoint does not
  distinguish "never existed" from "rotated away".
- **Never call the seat check.** Agents are free; invoking `checkCanAddUser` here would
  wrongly block joins for market centers at their paid-seat limit.
- **Role is always `AGENT`.** Codes cannot grant STAFF, STAFF_LEADER or ADMIN. Those consume
  paid seats and keep the existing email invitation flow.

## Frontend

- **Landing page** (`frontend/app/(landing)/page.tsx:34`) — the single **Get Started** button
  becomes two, so the audience is stated rather than inferred:
  - primary **"Set up a market center"** → `/pricing` (unchanged behavior)
  - secondary **"Join your market center"** → `/join`

- **`/join`** — a new public route placed **outside `/dashboard`** so `SubscriptionGuard` never
  runs on it. Flow: enter code → resolve → confirm the returned market center name → join.
  Signed-out users pass through Clerk `SignUp` and return to complete the join, reusing the
  return-to pattern the invitation flow already uses in
  `frontend/app/sign-up/[[...sign-up]]/page.tsx`. `/join?code=K7M42XQP` pre-fills the field so
  a link is one click.

  The confirmation step is load-bearing: a mistyped code that happens to resolve must not
  silently drop someone into the wrong brokerage.

  **Escape hatch.** A market center *owner* signing up also has no `market_center_id` and will
  now be routed here, so `/join` carries a visible "Setting up a new market center? See
  pricing" link. Without it we would trade an agent's dead end for an owner's.

- **`subscription-guard.tsx:117`** — redirect target changes from `/dashboard/subscription` to
  `/join`. This one line is the actual fix for the reported confusion, and it retroactively
  unsticks every user currently stranded on the pricing page, with no backfill.
  `/dashboard/subscription` stays directly reachable for genuine purchasers.

- **Admin card** — new `frontend/components/ui/settings/join-code-settings.tsx`, rendered on
  `frontend/app/dashboard/settings/page.tsx` beside `AutoCloseSettings` and following its
  structure. Shows the code, a copy-link button, and **Rotate** behind a confirm dialog that
  states plainly that the existing code stops working immediately. Visible to ADMIN and
  STAFF_LEADER; rotate is ADMIN-only.

- **User list** — a "Joined via code" badge driven by `joined_via_join_code`, so an admin
  scanning the roster can tell self-joins from invited members.

## Notification

Reuses the existing `"Market Center Assignment"` type (`backend/notifications/types.ts:46`).
`Notification.type` is a plain `string`, so there is no SQL enum to extend. On a successful
join, every ADMIN and STAFF_LEADER in that market center is notified:

> *Jeffrey Harris joined Greater Austin Market Center as an agent.*

This is what makes the accepted risk manageable — a leaked code surfaces within minutes
rather than at the next roster review.

## Testing

**Backend**
- Code generation: charset excludes `I`/`L`/`O`/`U`; collisions retry.
- Resolve: valid, unknown, and rotated codes; rotated and unknown return identical messages.
- Join: happy path provisions all four steps (market center, junction row, notification
  preferences, history row).
- Join rejected when the user already has a market center.
- Join rejected on a rotated code.
- Rotation deactivates exactly one row and the partial unique index holds.
- **Regression: a joined agent does not increment `usedSeats`.** This is the property that
  keeps agents free, and it is the one most likely to be broken by a future change to the
  seat query.

**Frontend**
- `/join` renders the confirm step for a valid code and a generic error for an invalid one.
- `?code=` pre-fills the input.
- `SubscriptionGuard` redirects a market-center-less user to `/join`, not
  `/dashboard/subscription`.
- Rotate dialog requires explicit confirmation.

## Security notes

The public resolve endpoint is an enumeration oracle by construction. Mitigations: the ~10¹²
keyspace makes guessing impractical, error text never distinguishes unknown from rotated, the
endpoint returns only a market center *name*, and rotation revokes instantly. Critically, **no
browsable market center directory exists anywhere in this design** — guessing a code is the
only route in, which is precisely what the approval-queue alternative would have given up.

## Estimate: ~2–3 days

| Piece | Effort |
|---|---|
| Migration + repository + code generation | ~0.5 d |
| Four endpoints with guards and full provisioning | ~0.75 d |
| `/join` route (code entry, confirm, signed-out round trip) | ~0.75 d |
| Admin settings card + rotate dialog | ~0.5 d |
| Landing buttons, guard redirect, roster badge | ~0.25 d |
| Tests + QA | ~0.5 d |

Build order: migration → backend endpoints → `/join` route → guard redirect + landing buttons
→ admin card → roster badge. The guard redirect and landing buttons can ship as soon as
`/join` exists; they are the pieces that fix the reported confusion.

## Explicitly not in v1

- **Approval queue.** Additive later if a leaked code ever causes real trouble.
- **Per-code expiry or usage caps.** One rotatable code covers continuous agent onboarding;
  add limits only if a leak actually happens.
- **Multiple concurrent codes** (e.g. one per onboarding class). The partial unique index
  would need to be dropped, so this is a deliberate constraint, not an accident.
- **Codes granting non-AGENT roles.** Paid seats stay on the invitation flow.
- **Capturing an agent/license ID at join.** Considered and declined — the notification plus
  roster badge gives the admin enough to act on without adding a field agents may not have to
  hand.
