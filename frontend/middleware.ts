import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/company",
  "/pricing",
]);

// Routes that don't require an active subscription
const subscriptionFreeRoutes = createRouteMatcher([
  "/dashboard/subscription",  // Allow access to subscription management
  "/dashboard/subscription/checkout",
  "/api/subscription(.*)",    // Allow subscription API calls
  "/api/stripe(.*)",          // Allow Stripe webhooks
]);

export default clerkMiddleware(async (auth, request) => {
  // First, check authentication
  if (!isPublicRoute(request)) {
    const authObject = await auth();

    if (!authObject.userId) {
      await auth.protect();
    }

    // Then, check subscription status for protected routes
    if (!subscriptionFreeRoutes(request) && request.nextUrl.pathname.startsWith('/dashboard')) {
      try {
        // Fetch subscription status from your backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/current`, {
          headers: {
            'Authorization': `Bearer ${await authObject.getToken()}`,
          },
        });

        if (response.status === 404) {
          // No subscription found - redirect to subscription page
          return NextResponse.redirect(new URL('/dashboard/subscription', request.url));
        }

        if (response.ok) {
          const subscription = await response.json();

          // Check if subscription is active
          if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
            // Subscription expired or inactive - redirect to subscription page
            return NextResponse.redirect(new URL('/dashboard/subscription?expired=true', request.url));
          }
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        // Allow access on error to prevent lockout, but log for monitoring
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};