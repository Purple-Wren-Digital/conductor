import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/company",
  "/pricing",
  // A brand-new agent arriving from the landing page has no account yet --
  // protecting this route drops them on a sign-in wall before they can even
  // confirm which market center a code belongs to.
  "/join(.*)",
]);

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      const authObject = await auth();

      if (!authObject.userId) {
        await auth.protect();
      }
    }
  },
  { frontendApiProxy: { enabled: true } }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};
