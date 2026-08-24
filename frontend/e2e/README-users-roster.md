# users-roster.spec.ts — local setup

Regression coverage for the `/users` truncation bug: the endpoint returned only
the first 50 users (ordered by `name ASC`), so once a market center passed 50
members the alphabetically-last user vanished from the assignee/creator pickers
and the admin dashboard team stats.

This spec is **not CI-ready** — it asserts against a specific seeded roster.
Run it locally after the setup below.

## 1. Services

```bash
open -a Docker                     # local Postgres lives in Docker
cd backend  && encore run          # :4000
cd frontend && npm run dev         # :3000
```

## 2. Seed a >50-user roster whose last name sorts last

The signed-in test user is a superuser, so the accessible roster is every user
with a non-null `market_center_id`. Adjust the count if your local DB differs.

```bash
psql "$(cd backend && encore db conn-uri ticket)"
```

```sql
-- 37 filler users ("S" sorts before "T") + Tony Stutz last.
INSERT INTO users (email, name, role, clerk_id, market_center_id, is_active)
SELECT 'seeduser'||lpad(i::text,3,'0')||'@kw.com',
       'Seed User '||lpad(i::text,3,'0'),
       'STAFF', 'seed-bulk-'||lpad(i::text,3,'0'),
       '<your-market-center-id>', true
FROM generate_series(1,37) i;

INSERT INTO users (email, name, role, clerk_id, market_center_id, is_active)
VALUES ('klrw1080-local@kw.com','Tony Stutz','ADMIN','seed-tony-local',
        '<your-market-center-id>', true);

-- Verify: total should exceed 50 and Tony must be the last row.
SELECT row_number() OVER (ORDER BY name ASC) AS rn, name
FROM users WHERE market_center_id IS NOT NULL ORDER BY name ASC;
```

## 3. Run

```bash
cd frontend
set -a; . ./.env; set +a          # CLERK_SECRET_KEY + publishable key
npx playwright test e2e/users-roster.spec.ts
```

Override defaults with `E2E_TICKET_ID` and `E2E_CLERK_USER_ID` as needed.

## Why this spec does its own sign-in

The repo's `@clerk/testing` helper (`clerk.signIn()` in `fixtures.ts`) hangs
against this app: `middleware.ts` enables Clerk's `frontendApiProxy`, which puts
the page into a `__clerk/v1/client/handshake` loop before `window.Clerk` mounts,
so the helper's `waitForFunction` never resolves. The spec instead mints a
sign-in **ticket** via the Clerk Backend API and activates it in-page — no
password, no proxy round-trip.

## Confirming it actually catches the bug

Revert the fix and both assertions should fail:

```bash
git checkout origin/main -- backend/user/list.ts \
  backend/shared/repositories/user.repository.ts
```

Expected failures: `Expected: > 50 / Received: 50`, and the last dropdown option
reading `"Seed User 037: Staff"` instead of `"Tony Stutz: Admin"`.
