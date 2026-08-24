import { test as base, expect, type Page } from "@playwright/test";

/**
 * Regression test for the /users roster truncation bug.
 *
 * GET /users called userRepository.search() without a limit, so it inherited
 * the repository's paginated default of 50 rows ordered by name ASC. Once a
 * market center passed 50 users, whoever sorted last silently vanished from
 * the assignee/creator pickers and the admin dashboard team stats.
 *
 * Prerequisites (see e2e/README-users-roster.md):
 *   - backend on :4000, frontend on :3000
 *   - local roster of >50 accessible users whose alphabetically-last member
 *     is "Tony Stutz"
 *   - CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in frontend/.env
 *
 * Auth note: the repo's @clerk/testing `clerk.signIn()` helper hangs against
 * this app because middleware.ts enables Clerk's frontendApiProxy, which puts
 * the page into a handshake loop before Clerk mounts. We instead use Clerk's
 * sign-in *ticket* strategy, which needs no password and no proxy round-trip.
 */

const TICKET_ID =
  process.env.E2E_TICKET_ID ?? "9194fe63-a4b7-4426-a2e6-27410dca719a";
const CLERK_USER_ID =
  process.env.E2E_CLERK_USER_ID ?? "user_34dYRL0XMkQeRGKWuER1O5mQ8xK";
const LAST_USER = "Tony Stutz";

function fapiDomain(): string {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set");
  return Buffer.from(pk.replace(/^pk_(test|live)_/, ""), "base64")
    .toString("utf8")
    .replace(/\$$/, "");
}

async function signIn(page: Page): Promise<void> {
  const sk = process.env.CLERK_SECRET_KEY;
  if (!sk) throw new Error("CLERK_SECRET_KEY not set");
  const fapi = fapiDomain();

  const devBrowser = await fetch(`https://${fapi}/v1/dev_browser`, {
    method: "POST",
  }).then((r) => r.json() as Promise<{ token?: string }>);
  if (!devBrowser.token) throw new Error("could not mint dev_browser token");

  const ticketRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: CLERK_USER_ID, expires_in_seconds: 600 }),
  }).then((r) => r.json() as Promise<{ token?: string }>);
  if (!ticketRes.token) throw new Error("could not mint sign-in ticket");

  // Stops the dev-browser handshake loop before the page ever loads.
  await page.context().addCookies([
    {
      name: "__clerk_db_jwt",
      value: devBrowser.token,
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).Clerk?.loaded, null, {
    timeout: 30_000,
  });

  const result = await page.evaluate(async (ticket: string) => {
    const clerk = (window as any).Clerk;
    const si = await clerk.client.signIn.create({ strategy: "ticket", ticket });
    if (si.createdSessionId) {
      await clerk.setActive({ session: si.createdSessionId });
    }
    return { status: si.status, userId: clerk.user?.id ?? null };
  }, ticketRes.token);

  expect(result.status, "clerk ticket sign-in should complete").toBe("complete");
  expect(result.userId).toBe(CLERK_USER_ID);
}

function isUsersListRequest(url: string): boolean {
  try {
    // Exactly /users — not /users/me, /users/search, or /users/:id
    return new URL(url).pathname === "/users";
  } catch {
    return false;
  }
}

const test = base.extend<{ authed: void }>({
  authed: [
    async ({ page }, use) => {
      await signIn(page);
      await use();
    },
    { auto: true },
  ],
});

test.describe("GET /users returns the full roster", () => {
  test("includes the alphabetically-last user beyond the old 50-row cap", async ({
    page,
  }) => {
    const usersResponse = page.waitForResponse(
      (r) =>
        isUsersListRequest(r.url()) &&
        r.request().method() === "GET" &&
        r.status() === 200,
      { timeout: 60_000 }
    );

    await page.goto(`/dashboard/tickets/${TICKET_ID}`);

    const body = await (await usersResponse).json();
    const names: string[] = (body.users ?? []).map(
      (u: { name: string }) => u.name
    );

    // The bug capped this at exactly 50.
    expect(names.length).toBeGreaterThan(50);

    // Tony sorts last, so he is the first casualty of the cap.
    expect(names).toContain(LAST_USER);

    // Guard the ordering assumption the regression depends on.
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(sorted[sorted.length - 1]).toBe(LAST_USER);
  });

  test("renders the alphabetically-last user in the assignee dropdown", async ({
    page,
  }) => {
    const usersResponse = page.waitForResponse(
      (r) => isUsersListRequest(r.url()) && r.status() === 200,
      { timeout: 60_000 }
    );

    await page.goto(`/dashboard/tickets/${TICKET_ID}`);
    await usersResponse;

    await page
      .locator('button[role="combobox"]')
      .filter({ hasText: /:/ })
      .first()
      .click();

    await expect(page.getByRole("option").last()).toHaveText(
      new RegExp(LAST_USER)
    );
  });
});
