"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

// Routes that don't require subscription check
const SUBSCRIPTION_FREE_ROUTES = [
  "/dashboard/subscription",
  "/dashboard/subscription/checkout",
];

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Skip check for subscription-free routes
    if (SUBSCRIPTION_FREE_ROUTES.some((route) => pathname.startsWith(route))) {
      setIsChecking(false);
      setHasAccess(true);
      return;
    }

    // Wait for auth to load
    if (!isLoaded) return;

    // If not signed in, let Clerk handle it
    if (!isSignedIn) {
      setIsChecking(false);
      setHasAccess(true);
      return;
    }

    // Only check once per mount
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkSubscription = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setIsChecking(false);
          setHasAccess(true);
          return;
        }

        // First check subscription
        const subResponse = await fetch(`${API_BASE}/subscription/current`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (subResponse.ok) {
          const subscription = await subResponse.json();
          if (
            subscription.status === "ACTIVE" ||
            subscription.status === "TRIALING"
          ) {
            setHasAccess(true);
            setIsChecking(false);
            return;
          }
          // Subscription exists but not active
          router.replace("/dashboard/subscription?expired=true");
          return;
        }

        if (subResponse.status === 404) {
          // No subscription - check if user has market center (invited user)
          const userResponse = await fetch(`${API_BASE}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (userResponse.ok) {
            const user = await userResponse.json();
            if (user.marketCenterId) {
              // Invited user with market center - allow access
              setHasAccess(true);
              setIsChecking(false);
              return;
            }
          }

          // No subscription and no market center - redirect
          router.replace("/dashboard/subscription");
          return;
        }

        // Other error - allow access to prevent lockout
        setHasAccess(true);
        setIsChecking(false);
      } catch (error) {
        // On error, allow access to prevent lockout
        console.error("Subscription check failed:", error);
        setHasAccess(true);
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [isLoaded, isSignedIn, getToken, pathname, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If no access, don't render children (redirect is happening)
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
