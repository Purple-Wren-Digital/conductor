import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Pins which routes stay reachable signed-out.
 *
 * `/join` is the whole point of the agent join-code feature: the landing page
 * sends a brand-new agent there, and by definition they have no account yet.
 * Leaving it out of isPublicRoute makes auth.protect() fire and redirect to
 * sign-in before the page renders, which inverts the confirm-then-sign-up flow
 * and makes join-form's <SignUp> branch unreachable in production. Nothing else
 * in the suite notices, because every JoinForm test renders the component
 * directly.
 *
 * Only clerkMiddleware is stubbed (to hand back the raw handler); the matcher
 * itself is Clerk's real createRouteMatcher, so this exercises the actual
 * pattern list rather than a reimplementation of it.
 */
vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    clerkMiddleware: (handler: unknown) => handler,
  };
});

import middleware from "./middleware";

type Handler = (
  auth: (() => Promise<{ userId: string | null }>) & { protect: () => void },
  request: { nextUrl: { pathname: string } }
) => Promise<void>;

const protect = vi.fn();

/** Clerk's route matcher reads only req.nextUrl.pathname. */
function requestFor(pathname: string) {
  return { nextUrl: { pathname } };
}

function signedOutAuth() {
  const auth = vi.fn(async () => ({ userId: null }));
  return Object.assign(auth, { protect });
}

/** Runs the middleware as a signed-out visitor; true means it was let through. */
async function isPublic(pathname: string): Promise<boolean> {
  protect.mockClear();
  await (middleware as unknown as Handler)(
    signedOutAuth(),
    requestFor(pathname)
  );
  return protect.mock.calls.length === 0;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("middleware public routes", () => {
  it("lets a signed-out visitor reach /join", async () => {
    expect(await isPublic("/join")).toBe(true);
  });

  it("lets a signed-out visitor reach /join with a code in the query path", async () => {
    expect(await isPublic("/join/anything")).toBe(true);
  });

  it("still protects the dashboard", async () => {
    // Guards against the opposite regression -- a matcher broad enough to make
    // /join public should not accidentally open authenticated routes.
    expect(await isPublic("/dashboard")).toBe(false);
    expect(await isPublic("/dashboard/settings")).toBe(false);
  });
});
