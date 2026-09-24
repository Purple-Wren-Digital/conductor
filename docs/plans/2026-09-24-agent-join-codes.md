# Agent Join Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agent join their market center with a code instead of being routed to the pricing page.

**Architecture:** One active, rotatable join code per market center, stored in a new table. A public endpoint resolves a code to a market center *name only*; an authenticated endpoint joins the caller as an `AGENT` and fully provisions them in a transaction. The landing page gains a second button and `SubscriptionGuard` redirects market-center-less users to `/join` instead of `/dashboard/subscription`.

**Tech Stack:** Encore TS + raw SQL repositories, PostgreSQL, Next.js App Router, React Query, Clerk, Vitest (both sides).

**Spec:** `docs/design/agent-join-codes.md`

## Global Constraints

- Join codes grant **`AGENT` only**. Never STAFF, STAFF_LEADER, or ADMIN.
- The join path **never calls the seat check**. Agents are free (`subscription.repository.ts:134` excludes `role = 'AGENT'`).
- Code alphabet is Crockford base32: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (no `I`, `L`, `O`, `U`). Length 8, displayed as `XXXX-XXXX`.
- Unknown and rotated codes return the **same** generic message — never distinguish them.
- The resolve endpoint returns **only** `{ valid, marketCenterName }`. No ids, no counts, no user data.
- No browsable market center directory is introduced anywhere.
- Backend tests mock `encore.dev/api` so `api()` returns the bare handler — follow `backend/marketCenters/create.test.ts`.
- Run `cd frontend && npx vitest run` and `cd backend && npx vitest run` before each commit. `middleware.ts` has one **pre-existing** tsc error unrelated to this work; ignore it, but no new ones.

## Review Focus

These are implied by the spec but easy to leave untested. Each has a test assigned to the task that owns the code.

1. **Code input is messy.** `k7m4-2xqp`, ` K7M4 2XQP `, and `K7M4—2XQP` must all resolve — agents retype codes off paper. (Task 1)
2. **Rotation races a join.** Admin rotates between an agent's resolve and join; the join must fail cleanly with the generic message, not join to a dead code. (Task 3)
3. **Double submit.** Two rapid join calls must not create duplicate junction rows or send two notifications. (Task 3)
4. **Deactivated users.** A user with `is_active = false` must not quietly reactivate by using a code. (Task 3)
5. **Owner escape hatch.** A market-center-less *owner* redirected to `/join` must still be able to reach pricing. (Task 5)

---

### Task 1: Migration, code generation, and repository

**Files:**
- Create: `backend/ticket/migrations/20260924000000_add_join_codes/migration.sql`
- Create: `backend/joinCodes/code-generator.ts`
- Create: `backend/joinCodes/code-generator.test.ts`
- Create: `backend/shared/repositories/join-code.repository.ts`
- Modify: `backend/shared/repositories/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `generateJoinCode(): string`, `normalizeJoinCode(input: string): string`, `formatJoinCode(code: string): string`, and `joinCodeRepository` with `findActiveByCode`, `findActiveByMarketCenterId`, `rotate`.

- [ ] **Step 1: Write the failing generator tests**

Create `backend/joinCodes/code-generator.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run joinCodes/code-generator.test.ts`
Expected: FAIL — "Failed to resolve import ./code-generator".

- [ ] **Step 3: Implement the generator**

Create `backend/joinCodes/code-generator.ts`:

```typescript
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run joinCodes/code-generator.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the migration**

Create `backend/ticket/migrations/20260924000000_add_join_codes/migration.sql`:

```sql
-- CreateTable: market_center_join_codes
CREATE TABLE IF NOT EXISTS market_center_join_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  market_center_id TEXT NOT NULL REFERENCES market_centers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP(3)
);

-- One live code per market center; rotated codes remain as history.
CREATE UNIQUE INDEX IF NOT EXISTS market_center_join_codes_one_active
  ON market_center_join_codes(market_center_id) WHERE is_active;

CREATE INDEX IF NOT EXISTS market_center_join_codes_code_idx
  ON market_center_join_codes(code);

-- Marks members who self-joined rather than being invited.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS joined_via_join_code BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 6: Implement the repository**

Create `backend/shared/repositories/join-code.repository.ts`:

```typescript
/**
 * Join Code Repository - one active, rotatable join code per market center.
 *
 * For transaction-aware writes, use tx.exec directly in the caller
 * (Encore's compiler requires static db usage — no dynamic conn dispatch).
 */

import { db } from "../../ticket/db";

export interface JoinCode {
  id: string;
  marketCenterId: string;
  code: string;
  createdBy: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface JoinCodeRow {
  id: string;
  market_center_id: string;
  code: string;
  created_by: string | null;
  is_active: boolean;
  created_at: Date;
}

function rowToJoinCode(row: JoinCodeRow): JoinCode {
  return {
    id: row.id,
    marketCenterId: row.market_center_id,
    code: row.code,
    createdBy: row.created_by,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export const joinCodeRepository = {
  /** Resolves a normalized code. Returns null for unknown AND rotated codes alike. */
  async findActiveByCode(
    code: string
  ): Promise<(JoinCode & { marketCenterName: string }) | null> {
    const row = await db.queryRow<JoinCodeRow & { market_center_name: string }>`
      SELECT jc.*, mc.name AS market_center_name
      FROM market_center_join_codes jc
      JOIN market_centers mc ON mc.id = jc.market_center_id
      WHERE jc.code = ${code} AND jc.is_active = true
    `;
    if (!row) return null;
    return { ...rowToJoinCode(row), marketCenterName: row.market_center_name };
  },

  async findActiveByMarketCenterId(
    marketCenterId: string
  ): Promise<JoinCode | null> {
    const row = await db.queryRow<JoinCodeRow>`
      SELECT * FROM market_center_join_codes
      WHERE market_center_id = ${marketCenterId} AND is_active = true
    `;
    return row ? rowToJoinCode(row) : null;
  },

  /** Deactivates the current code (if any) and installs a new one. */
  async rotate(
    marketCenterId: string,
    code: string,
    createdBy: string | null
  ): Promise<JoinCode> {
    await db.exec`
      UPDATE market_center_join_codes
      SET is_active = false, deactivated_at = NOW()
      WHERE market_center_id = ${marketCenterId} AND is_active = true
    `;
    const row = await db.queryRow<JoinCodeRow>`
      INSERT INTO market_center_join_codes (market_center_id, code, created_by)
      VALUES (${marketCenterId}, ${code}, ${createdBy})
      RETURNING *
    `;
    return rowToJoinCode(row!);
  },
};
```

- [ ] **Step 7: Export the repository**

In `backend/shared/repositories/index.ts`, add after the `userMarketCenterRepository` export:

```typescript
export { joinCodeRepository } from "./join-code.repository";
```

- [ ] **Step 8: Run the full backend suite**

Run: `cd backend && npx vitest run`
Expected: PASS, with the 5 new generator tests included.

- [ ] **Step 9: Commit**

```bash
git add backend/ticket/migrations/20260924000000_add_join_codes backend/joinCodes backend/shared/repositories/join-code.repository.ts backend/shared/repositories/index.ts
git commit -m "feat: add join code table, generator and repository"
```

---

### Task 2: Public resolve endpoint

**Files:**
- Create: `backend/joinCodes/encore.service.ts`
- Create: `backend/joinCodes/resolve.ts`
- Create: `backend/joinCodes/resolve.test.ts`

**Interfaces:**
- Consumes: `joinCodeRepository.findActiveByCode`, `normalizeJoinCode` (Task 1).
- Produces: `resolveJoinCode` handler; response shape `{ valid: boolean; marketCenterName: string | null }`.

- [ ] **Step 1: Write the failing test**

Create `backend/joinCodes/resolve.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx vitest run joinCodes/resolve.test.ts`
Expected: FAIL — "Failed to resolve import ./resolve".

- [ ] **Step 3: Create the service definition**

Create `backend/joinCodes/encore.service.ts`:

```typescript
import { Service } from "encore.dev/service";

export default new Service("joinCodes");
```

- [ ] **Step 4: Implement the endpoint**

Create `backend/joinCodes/resolve.ts`:

```typescript
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx vitest run joinCodes/resolve.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/joinCodes/encore.service.ts backend/joinCodes/resolve.ts backend/joinCodes/resolve.test.ts
git commit -m "feat: add public join code resolve endpoint"
```

---

### Task 3: Join endpoint

**Files:**
- Create: `backend/joinCodes/join.ts`
- Create: `backend/joinCodes/join.test.ts`
- Modify: `backend/auth/user-context.ts:12` (export the helper)

**Interfaces:**
- Consumes: `joinCodeRepository.findActiveByCode` (Task 1), `getUserContext` (`backend/auth/user-context.ts:41`), `withTransaction` (`backend/ticket/db.ts:44`), `userRepository`, `notificationRepository`.
- Produces: `joinWithCode` handler; response `{ marketCenterId: string; marketCenterName: string }`.

- [ ] **Step 1: Export the notification-preferences helper**

In `backend/auth/user-context.ts:12`, change:

```typescript
async function ensureNotificationPreferences(userId: string): Promise<void> {
```

to:

```typescript
export async function ensureNotificationPreferences(userId: string): Promise<void> {
```

Nothing else changes — existing internal callers keep working. (The spec notes the duplicated sequence in `invite.ts:395-415` is the thing to converge on later; do **not** refactor it in this task.)

- [ ] **Step 2: Write the failing tests**

Create `backend/joinCodes/join.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockJoinCodeRepository,
  mockUserRepository,
  mockNotificationRepository,
  mockGetUserContext,
  mockEnsureNotificationPreferences,
  mockCheckCanAddUser,
  mockTx,
  mockWithTransaction,
} = vi.hoisted(() => {
  const tx = { exec: vi.fn() };
  return {
    mockJoinCodeRepository: { findActiveByCode: vi.fn() },
    mockUserRepository: {
      findById: vi.fn(),
      findByMarketCenterIdAndRole: vi.fn(),
    },
    mockNotificationRepository: { createMany: vi.fn() },
    mockGetUserContext: vi.fn(),
    mockEnsureNotificationPreferences: vi.fn(),
    mockCheckCanAddUser: vi.fn(),
    mockTx: tx,
    // Runs the callback against the fake tx so the SQL is observable.
    mockWithTransaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) =>
      fn(tx)
    ),
  };
});

/** Flattens the tagged-template SQL the handler ran, for assertions. */
function executedSql(): string {
  return mockTx.exec.mock.calls
    .map((call) => (call[0] as TemplateStringsArray).join("?"))
    .join("\n");
}

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => Object.assign(new Error(msg), { code: "not_found" })),
    failedPrecondition: vi.fn((msg) =>
      Object.assign(new Error(msg), { code: "failed_precondition" })
    ),
  },
}));

vi.mock("../shared/repositories", () => ({
  joinCodeRepository: mockJoinCodeRepository,
  userRepository: mockUserRepository,
  notificationRepository: mockNotificationRepository,
}));

vi.mock("../ticket/db", () => ({ withTransaction: mockWithTransaction }));

vi.mock("../auth/subscription-check", () => ({
  checkCanAddUser: mockCheckCanAddUser,
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: mockGetUserContext,
  ensureNotificationPreferences: mockEnsureNotificationPreferences,
}));

import { joinWithCode } from "./join";

const ACTIVE_CODE = {
  id: "jc-1",
  marketCenterId: "mc-1",
  code: "K7M42XQP",
  marketCenterName: "Greater Austin Market Center",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserContext.mockResolvedValue({
    userId: "user-1",
    name: "Jeffrey Harris",
    email: "jeffrey@example.com",
    role: "AGENT",
    marketCenterId: null,
    clerkId: "clerk-1",
    isSuperuser: false,
  });
  mockUserRepository.findById.mockResolvedValue({
    id: "user-1",
    isActive: true,
    marketCenterId: null,
  });
  mockJoinCodeRepository.findActiveByCode.mockResolvedValue(ACTIVE_CODE);
  mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValue([]);
});

describe("joinWithCode", () => {
  it("provisions the agent completely, in one transaction", async () => {
    const result = await joinWithCode({ code: "K7M4-2XQP" });

    expect(result).toEqual({
      marketCenterId: "mc-1",
      marketCenterName: "Greater Austin Market Center",
    });

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    const sql = executedSql();
    expect(sql).toContain("UPDATE users");
    expect(sql).toContain("INSERT INTO user_market_centers");
    expect(sql).toContain("INSERT INTO user_history");
    expect(mockTx.exec).toHaveBeenCalledTimes(3);

    expect(mockEnsureNotificationPreferences).toHaveBeenCalledWith("user-1");
  });

  it("makes a double submit idempotent", async () => {
    await joinWithCode({ code: "K7M42XQP" });

    // The junction insert must tolerate a repeat rather than erroring.
    expect(executedSql()).toContain("ON CONFLICT (user_id, market_center_id) DO NOTHING");
  });

  it("writes the history row with the join-code marker", async () => {
    await joinWithCode({ code: "K7M42XQP" });

    const historyCall = mockTx.exec.mock.calls.find((call) =>
      (call[0] as TemplateStringsArray).join("?").includes("user_history")
    );
    expect(historyCall).toBeDefined();
    expect(historyCall!.join(" ")).toContain("Activated via Join Code");
  });

  it("notifies admins and staff leaders of the market center", async () => {
    mockUserRepository.findByMarketCenterIdAndRole.mockImplementation(
      async (_mcId: string, role: string) =>
        role === "ADMIN" ? [{ id: "admin-1" }] : [{ id: "leader-1" }]
    );

    await joinWithCode({ code: "K7M42XQP" });

    const [notifications] = mockNotificationRepository.createMany.mock.calls[0];
    expect(notifications.map((n: { userId: string }) => n.userId).sort()).toEqual([
      "admin-1",
      "leader-1",
    ]);
    expect(notifications[0].body).toContain("Jeffrey Harris");
    expect(notifications[0].body).toContain("Greater Austin Market Center");
  });

  it("rejects a code rotated away between resolve and join", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue(null);

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "That join code isn't valid"
    );
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("rejects a user who already belongs to a market center", async () => {
    mockUserRepository.findById.mockResolvedValue({
      id: "user-1",
      isActive: true,
      marketCenterId: "mc-other",
    });

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "already a member"
    );
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("refuses to reactivate a deactivated user", async () => {
    mockUserRepository.findById.mockResolvedValue({
      id: "user-1",
      isActive: false,
      marketCenterId: null,
    });

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "deactivated"
    );
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("never consults the paid seat check — agents are free", async () => {
    await joinWithCode({ code: "K7M42XQP" });

    // This is the property that keeps agents free. If a future change routes the
    // join through checkCanAddUser, market centers at their seat limit silently
    // stop being able to onboard agents at all.
    expect(mockCheckCanAddUser).not.toHaveBeenCalled();
  });

  it("never grants a role other than AGENT", async () => {
    mockGetUserContext.mockResolvedValue({
      userId: "user-1",
      name: "Jeffrey Harris",
      email: "jeffrey@example.com",
      role: "ADMIN",
      marketCenterId: null,
      clerkId: "clerk-1",
      isSuperuser: false,
    });

    await joinWithCode({ code: "K7M42XQP" });

    expect(executedSql()).toContain("role = 'AGENT'");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && npx vitest run joinCodes/join.test.ts`
Expected: FAIL — "Failed to resolve import ./join".

- [ ] **Step 4: Implement the endpoint**

Create `backend/joinCodes/join.ts`:

```typescript
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npx vitest run joinCodes/join.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Confirm the endpoint compiles against the real Encore types**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `joinCodes/`. The transaction writes `joined_via_join_code` directly in SQL, so `userRepository.update` needs no new field.

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/joinCodes/join.ts backend/joinCodes/join.test.ts backend/auth/user-context.ts
git commit -m "feat: add join-with-code endpoint"
```

---

### Task 4: Admin code endpoints

**Files:**
- Create: `backend/joinCodes/admin.ts`
- Create: `backend/joinCodes/admin.test.ts`

**Interfaces:**
- Consumes: `joinCodeRepository.findActiveByMarketCenterId` / `.rotate` (Task 1), `generateJoinCode`, `formatJoinCode` (Task 1), `getUserContext`.
- Produces: `getMarketCenterJoinCode` and `rotateMarketCenterJoinCode` handlers; both return `{ code: string; formattedCode: string }`.

- [ ] **Step 1: Write the failing tests**

Create `backend/joinCodes/admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockJoinCodeRepository, mockGetUserContext } = vi.hoisted(() => ({
  mockJoinCodeRepository: {
    findActiveByMarketCenterId: vi.fn(),
    rotate: vi.fn(),
  },
  mockGetUserContext: vi.fn(),
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    permissionDenied: vi.fn((msg) =>
      Object.assign(new Error(msg), { code: "permission_denied" })
    ),
  },
}));

vi.mock("../shared/repositories", () => ({
  joinCodeRepository: mockJoinCodeRepository,
}));

vi.mock("../auth/user-context", () => ({ getUserContext: mockGetUserContext }));

import {
  getMarketCenterJoinCode,
  rotateMarketCenterJoinCode,
} from "./admin";

function contextFor(role: string) {
  return {
    userId: "user-1",
    name: "Admin",
    email: "admin@example.com",
    role,
    marketCenterId: "mc-1",
    clerkId: "clerk-1",
    isSuperuser: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserContext.mockResolvedValue(contextFor("ADMIN"));
});

describe("getMarketCenterJoinCode", () => {
  it("returns the formatted active code", async () => {
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue({
      code: "K7M42XQP",
    });

    const result = await getMarketCenterJoinCode({ id: "mc-1" });

    expect(result).toEqual({ code: "K7M42XQP", formattedCode: "K7M4-2XQP" });
  });

  it("creates a code on first read when none exists", async () => {
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue(null);
    mockJoinCodeRepository.rotate.mockImplementation(
      async (_mc: string, code: string) => ({ code })
    );

    const result = await getMarketCenterJoinCode({ id: "mc-1" });

    expect(mockJoinCodeRepository.rotate).toHaveBeenCalled();
    expect(result.code).toHaveLength(8);
  });

  it("allows staff leaders to read", async () => {
    mockGetUserContext.mockResolvedValue(contextFor("STAFF_LEADER"));
    mockJoinCodeRepository.findActiveByMarketCenterId.mockResolvedValue({
      code: "K7M42XQP",
    });

    await expect(getMarketCenterJoinCode({ id: "mc-1" })).resolves.toBeTruthy();
  });

  it("denies agents and staff", async () => {
    for (const role of ["AGENT", "STAFF"]) {
      mockGetUserContext.mockResolvedValue(contextFor(role));
      await expect(getMarketCenterJoinCode({ id: "mc-1" })).rejects.toThrow();
    }
  });

  it("denies reading another market center's code", async () => {
    mockGetUserContext.mockResolvedValue(contextFor("ADMIN"));

    await expect(getMarketCenterJoinCode({ id: "mc-other" })).rejects.toThrow();
  });
});

describe("rotateMarketCenterJoinCode", () => {
  it("installs a fresh code", async () => {
    mockJoinCodeRepository.rotate.mockImplementation(
      async (_mc: string, code: string) => ({ code })
    );

    const result = await rotateMarketCenterJoinCode({ id: "mc-1" });

    expect(result.code).toHaveLength(8);
    expect(result.formattedCode).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("is admin-only — staff leaders cannot rotate", async () => {
    mockGetUserContext.mockResolvedValue(contextFor("STAFF_LEADER"));

    await expect(rotateMarketCenterJoinCode({ id: "mc-1" })).rejects.toThrow();
    expect(mockJoinCodeRepository.rotate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run joinCodes/admin.test.ts`
Expected: FAIL — "Failed to resolve import ./admin".

- [ ] **Step 3: Implement the endpoints**

Create `backend/joinCodes/admin.ts`:

```typescript
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx vitest run joinCodes/admin.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/joinCodes/admin.ts backend/joinCodes/admin.test.ts
git commit -m "feat: add admin join code read and rotate endpoints"
```

---

### Task 5: `/join` route

**Files:**
- Create: `frontend/app/join/page.tsx`
- Create: `frontend/app/join/join-form.tsx`
- Create: `frontend/app/join/join-form.test.tsx`

**Interfaces:**
- Consumes: `GET /join-codes/:code` (Task 2), `POST /join-codes/:code/join` (Task 3), `API_BASE` from `@/lib/api/utils`.
- Produces: `JoinForm` component, default-exported page at `/join`.

- [ ] **Step 1: Write the failing test**

Create `frontend/app/join/join-form.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JoinForm } from "./join-form";

// vi.mock factories are hoisted, so anything they close over must be too --
// a plain `let` here throws "Cannot access before initialization".
const { mockPush, search } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  search: { value: "" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true, getToken: async () => "token" }),
  SignUp: () => <div data-testid="clerk-signup" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  search.value = "";
  global.fetch = vi.fn();
});

describe("JoinForm", () => {
  it("shows the market center name for confirmation before joining", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        marketCenterName: "Greater Austin Market Center",
      }),
    });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "K7M42XQP");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/Greater Austin Market Center/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /join market center/i })
    ).toBeInTheDocument();
  });

  it("shows a generic error for an invalid code", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, marketCenterName: null }),
    });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "ZZZZZZZZ");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/isn't valid/i)).toBeInTheDocument();
  });

  it("pre-fills the code from the query string", () => {
    search.value = "code=K7M42XQP";

    render(<JoinForm />);

    expect(screen.getByLabelText(/join code/i)).toHaveValue("K7M4-2XQP");
  });

  it("offers owners a route to pricing", () => {
    render(<JoinForm />);

    const link = screen.getByRole("link", { name: /setting up a new market center/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run app/join/join-form.test.tsx`
Expected: FAIL — cannot resolve `./join-form`.

- [ ] **Step 3: Implement the form**

Create `frontend/app/join/join-form.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";

const INVALID_MESSAGE =
  "That join code isn't valid. Check it with your market center.";

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function format(input: string): string {
  const raw = normalize(input).slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, getToken } = useAuth();

  const [code, setCode] = useState(() => format(searchParams.get("code") ?? ""));
  const [marketCenterName, setMarketCenterName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // A link carrying ?code= should land on the confirmation step, not a blank form.
  useEffect(() => {
    const fromQuery = searchParams.get("code");
    if (fromQuery) setCode(format(fromQuery));
  }, [searchParams]);

  async function resolveCode() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/join-codes/${normalize(code)}`);
      const data = await response.json();
      if (data?.valid) {
        setMarketCenterName(data.marketCenterName);
      } else {
        setError(INVALID_MESSAGE);
      }
    } catch {
      setError("Couldn't check that code. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function join() {
    setIsBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/join-codes/${normalize(code)}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        router.push("/dashboard");
        return;
      }
      const body = await response.json();
      setError(body?.message ?? INVALID_MESSAGE);
    } catch {
      setError("Couldn't join right now. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Join your market center</h1>
        <p className="text-sm text-muted-foreground">
          Enter the join code from your market center. Agents join for free.
        </p>
      </div>

      {!marketCenterName ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">Join code</Label>
            <Input
              id="join-code"
              value={code}
              onChange={(event) => setCode(format(event.target.value))}
              placeholder="K7M4-2XQP"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button
            onClick={resolveCode}
            disabled={isBusy || normalize(code).length < 8}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">You&apos;re joining</p>
            <p className="text-lg font-semibold">{marketCenterName}</p>
          </div>

          {isSignedIn ? (
            <Button onClick={join} disabled={isBusy} className="w-full">
              Join market center
            </Button>
          ) : (
            <SignUp
              forceRedirectUrl={`/join?code=${normalize(code)}`}
              signInForceRedirectUrl={`/join?code=${normalize(code)}`}
            />
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setMarketCenterName(null)}
            disabled={isBusy}
          >
            Use a different code
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/pricing" className="underline">
          Setting up a new market center?
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create the page wrapper**

Create `frontend/app/join/page.tsx`:

```tsx
import { Suspense } from "react";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
        }
      >
        <JoinForm />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run app/join/join-form.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/join
git commit -m "feat: add /join route for agent self-signup"
```

---

### Task 6: Guard redirect and landing buttons

**Files:**
- Modify: `frontend/components/subscription-guard.tsx:117`
- Modify: `frontend/app/(landing)/page.tsx:26-36`
- Create: `frontend/components/subscription-guard.test.tsx`

**Interfaces:**
- Consumes: `/join` route (Task 5).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `frontend/components/subscription-guard.test.tsx`:

```tsx
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionGuard } from "./subscription-guard";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => "token",
  }),
}));

vi.mock("@/lib/api/utils", () => ({
  API_BASE: "http://api.test",
  fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from "@/lib/api/utils";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SubscriptionGuard", () => {
  it("sends a user with no market center to /join, not the pricing page", async () => {
    vi.mocked(fetchWithTimeout).mockImplementation(async (url: string) => {
      if (url.includes("/users/me")) {
        return {
          ok: true,
          json: async () => ({ isSuperuser: false, marketCenterId: null }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(
      <SubscriptionGuard>
        <div>content</div>
      </SubscriptionGuard>
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/join"));
  });

  it("lets an invited user with a market center through", async () => {
    vi.mocked(fetchWithTimeout).mockImplementation(async (url: string) => {
      if (url.includes("/users/me")) {
        return {
          ok: true,
          json: async () => ({ isSuperuser: false, marketCenterId: "mc-1" }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const { findByText } = render(
      <SubscriptionGuard>
        <div>content</div>
      </SubscriptionGuard>
    );

    expect(await findByText("content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run components/subscription-guard.test.tsx`
Expected: FAIL — the first test sees `/dashboard/subscription`.

- [ ] **Step 3: Change the redirect target**

In `frontend/components/subscription-guard.tsx`, in the `subResponse.status === 404` branch, change:

```typescript
          // No subscription and no market center - redirect
          router.replace("/dashboard/subscription");
```

to:

```typescript
          // No subscription and no market center: this is almost always an agent
          // who needs to join, not someone who needs to buy. /join carries a link
          // to pricing for the genuine market-center owner.
          router.replace("/join");
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run components/subscription-guard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Split the landing call to action**

In `frontend/app/(landing)/page.tsx`, replace the single-button block (the `<div className="my-6 lg:my-10">` wrapper around the `Get Started` button) with:

```tsx
              <div className="my-6 flex flex-col gap-3 sm:flex-row lg:my-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#404042] hover:opacity-50"
                >
                  <Link href="/pricing">Set up a market center</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/join">Join your market center</Link>
                </Button>
              </div>
```

- [ ] **Step 6: Verify the build and full suite**

Run: `cd frontend && npx vitest run && npx tsc --noEmit -p tsconfig.json`
Expected: tests PASS; tsc reports only the pre-existing `middleware.ts` error.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/subscription-guard.tsx frontend/components/subscription-guard.test.tsx "frontend/app/(landing)/page.tsx"
git commit -m "fix: route market-center-less users to /join instead of pricing"
```

---

### Task 7: Admin join code settings card

**Files:**
- Create: `frontend/components/ui/settings/join-code-settings.tsx`
- Create: `frontend/components/ui/settings/join-code-settings.test.tsx`
- Modify: `frontend/app/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `GET /marketCenters/:id/join-code`, `POST /marketCenters/:id/join-code/rotate` (Task 4).
- Produces: default-exported `JoinCodeSettings` component.

- [ ] **Step 1: Write the failing test**

Create `frontend/components/ui/settings/join-code-settings.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import JoinCodeSettings from "./join-code-settings";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));

vi.mock("@/context/store-provider", () => ({
  useStore: () => ({ currentUser: { marketCenterId: "mc-1" } }),
}));

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/lib/api/utils", () => ({ API_BASE: "http://api.test" }));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUserRole.mockReturnValue({ role: "ADMIN" });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: "K7M42XQP", formattedCode: "K7M4-2XQP" }),
  });
});

describe("JoinCodeSettings", () => {
  it("shows the market center's active join code", async () => {
    render(<JoinCodeSettings />);

    expect(await screen.findByText("K7M4-2XQP")).toBeInTheDocument();
  });

  it("requires confirmation before rotating", async () => {
    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    await userEvent.click(screen.getByRole("button", { name: /rotate/i }));

    expect(await screen.findByText(/stop working immediately/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1); // still only the initial read
  });

  it("hides rotation from staff leaders", async () => {
    mockUseUserRole.mockReturnValue({ role: "STAFF_LEADER" });

    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    expect(screen.queryByRole("button", { name: /rotate/i })).toBeNull();
  });

  it("renders nothing, and fetches nothing, for agents and staff", async () => {
    for (const role of ["AGENT", "STAFF"]) {
      mockUseUserRole.mockReturnValue({ role });

      const { container } = render(<JoinCodeSettings />);

      expect(container).toBeEmptyDOMElement();
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run components/ui/settings/join-code-settings.test.tsx`
Expected: FAIL — cannot resolve `./join-code-settings`.

- [ ] **Step 3: Implement the card**

Create `frontend/components/ui/settings/join-code-settings.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";

export default function JoinCodeSettings() {
  const { getToken } = useAuth();
  const { currentUser } = useStore();
  const { role } = useUserRole();

  const marketCenterId = currentUser?.marketCenterId;
  const canRotate = role === "ADMIN";
  // The backend denies these roles anyway; hiding the card avoids firing a
  // request that can only fail and surfacing an error toast for it.
  const canViewJoinCode = role === "ADMIN" || role === "STAFF_LEADER";

  const [formattedCode, setFormattedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const loadCode = useCallback(async () => {
    if (!marketCenterId || !canViewJoinCode) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/marketCenters/${marketCenterId}/join-code`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to load join code");
      const data = await response.json();
      setFormattedCode(data.formattedCode);
    } catch {
      toast.error("Couldn't load the join code");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, marketCenterId]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  if (!canViewJoinCode) return null;

  async function rotate() {
    setIsRotating(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/marketCenters/${marketCenterId}/join-code/rotate`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to rotate");
      const data = await response.json();
      setFormattedCode(data.formattedCode);
      setIsConfirmingRotate(false);
      toast.success("New join code created. The old one no longer works.");
    } catch {
      toast.error("Couldn't rotate the join code");
    } finally {
      setIsRotating(false);
    }
  }

  function copyLink() {
    const raw = (formattedCode ?? "").replace("-", "");
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${raw}`);
    toast.success("Join link copied");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Agent join code
        </CardTitle>
        <CardDescription>
          Share this code with your agents so they can join for free. Agents
          don&apos;t use a paid seat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <p className="font-mono text-2xl tracking-widest">{formattedCode}</p>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy join link
              </Button>
              {canRotate && !isConfirmingRotate && (
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmingRotate(true)}
                >
                  Rotate code
                </Button>
              )}
            </div>

            {isConfirmingRotate && (
              <Alert>
                <AlertDescription className="space-y-3">
                  <p>
                    The current code will stop working immediately. Any agent
                    who has it but hasn&apos;t joined yet will need the new one.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={rotate} disabled={isRotating}>
                      {isRotating ? "Rotating..." : "Rotate anyway"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsConfirmingRotate(false)}
                      disabled={isRotating}
                    >
                      Cancel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run components/ui/settings/join-code-settings.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the card to the settings page**

In `frontend/app/dashboard/settings/page.tsx`, add the import and render it after `<AutoCloseSettings />`:

```tsx
import AutoCloseSettings from "@/components/ui/settings/auto-close-settings";
import JoinCodeSettings from "@/components/ui/settings/join-code-settings";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <AutoCloseSettings />
      <JoinCodeSettings />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/ui/settings/join-code-settings.tsx frontend/components/ui/settings/join-code-settings.test.tsx frontend/app/dashboard/settings/page.tsx
git commit -m "feat: add admin join code settings card"
```

---

### Task 8: Roster badge for self-joined agents

**Files:**
- Modify: `backend/user/me.ts` and the user list response type to carry `joinedViaJoinCode`
- Modify: `frontend/lib/types.ts` (add `joinedViaJoinCode?: boolean` to `ConductorUser`)
- Modify: `frontend/components/ui/list-item/user-list-item.tsx:72-77`
- Create: `frontend/components/ui/list-item/user-list-item.test.tsx`

**Interfaces:**
- Consumes: `users.joined_via_join_code` (Task 1).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Create `frontend/components/ui/list-item/user-list-item.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserListItem } from "./user-list-item";

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => ({ role: "ADMIN", permissions: {} }),
}));

vi.mock("@/hooks/use-market-center", () => ({
  useFetchMarketCenter: () => ({ data: { id: "mc-1", name: "Greater Austin" } }),
}));

vi.mock("@/hooks/use-tickets", () => ({
  useFetchRatingsByAssignee: () => ({ data: undefined }),
}));

const baseProps = {
  onClick: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  deleteLabel: "Deactivate" as const,
};

const baseUser = {
  id: "user-1",
  name: "Jeffrey Harris",
  email: "jeffrey@example.com",
  role: "AGENT",
  isActive: true,
  marketCenterId: "mc-1",
};

describe("UserListItem", () => {
  it("marks a user who joined with a code", () => {
    render(
      <UserListItem
        {...baseProps}
        user={{ ...baseUser, joinedViaJoinCode: true } as never}
      />
    );

    expect(screen.getByText(/joined via code/i)).toBeInTheDocument();
  });

  it("shows no marker for an invited user", () => {
    render(
      <UserListItem
        {...baseProps}
        user={{ ...baseUser, joinedViaJoinCode: false } as never}
      />
    );

    expect(screen.queryByText(/joined via code/i)).toBeNull();
  });
});
```

`UserListItem` is a **named** export, and the hook paths above match its imports at
`user-list-item.tsx:21-23`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run components/ui/list-item/user-list-item.test.tsx`
Expected: FAIL — no "joined via code" text.

- [ ] **Step 3: Carry the field through the backend**

In `backend/shared/repositories/user.repository.ts`, add the column to the row mapper at
line 56 so every `findBy*` returns it:

```typescript
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
    isActive: row.is_active,
    isSuperuser: row.is_superuser,
    marketCenterId: row.market_center_id,
    clerkId: row.clerk_id,
    joinedViaJoinCode: row.joined_via_join_code ?? false,
  };
}
```

Add `joined_via_join_code: boolean` to the `UserRow` interface and
`joinedViaJoinCode: boolean` to the `User` type in the same file. Then add
`joinedViaJoinCode?: boolean` to `ConductorUser` in `frontend/lib/types.ts`.

Run `grep -rn "SELECT id, email, name, role" backend/shared/repositories/user.repository.ts`
— any query selecting an explicit column list rather than `SELECT *` needs
`joined_via_join_code` added, or the badge silently never renders.

- [ ] **Step 4: Add the badge**

In `frontend/components/ui/list-item/user-list-item.tsx`, extend the `primaryBadges` array (currently at lines 72-77) with a conditional entry:

```tsx
        ...(user?.joinedViaJoinCode
          ? [
              {
                label: "Joined via code",
                variant: "secondary" as const,
                title: "This agent joined using the market center join code",
              },
            ]
          : []),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run components/ui/list-item/user-list-item.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Run both full suites**

Run: `cd backend && npx vitest run && cd ../frontend && npx vitest run`
Expected: PASS on both.

- [ ] **Step 7: Commit**

```bash
git add backend/shared/repositories/user.repository.ts backend/user/me.ts frontend/lib/types.ts frontend/components/ui/list-item/user-list-item.tsx frontend/components/ui/list-item/user-list-item.test.tsx
git commit -m "feat: mark self-joined agents in the user roster"
```

---

## Manual verification

After Task 8, verify end to end against a running stack (`cd backend && encore run`, `cd frontend && npm run dev`):

1. As an admin, open `/dashboard/settings` and copy the join link.
2. Open it in a private window. Sign up as a new user. Confirm you land on the market center confirmation, then on `/dashboard` — **not** on pricing.
3. As the admin, confirm the in-app notification and the "Joined via code" badge on the roster.
4. Rotate the code. Re-open the old link and confirm it fails with the generic message.
5. Confirm the new agent did **not** increase used seats on `/dashboard/subscription`.
