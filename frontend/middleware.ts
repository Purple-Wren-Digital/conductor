import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/company",
  "/pricing",
  "/dashboard(.*)",
]);

export default clerkMiddleware(
  async (auth, request) => {
    // Only check authentication - subscription checks moved to client-side
    if (!isPublicRoute(request)) {
      const authObject = await auth();

      if (!authObject.userId) {
        await auth.protect();
      }
    }
  },
  {
    frontendApiProxy: {
      enabled: true,
    },
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes and Clerk proxy
    "/(api|trpc|__clerk)(.*)",
  ],
};