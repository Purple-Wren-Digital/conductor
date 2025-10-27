"use client";

import { useCallback, useEffect } from "react";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { PrismaUser } from "@/lib/types";
import { ArrowRight, House } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/context/store-provider";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api/utils";

export function Header() {
  const router = useRouter();
  //   const { isSignedIn, isLoaded, user } = useUser();

  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { currentUser, setCurrentUser } = useStore();

  // const getAuth0AccessToken = useCallback(async () => {
  //   if (process.env.NODE_ENV === "development") return "local";
  //   return await getAccessToken();
  // }, []);

  const fetchOrCreateUser = async () => {
    if (!clerkUser?.id) {
      console.error("No Clerk user ID");
      setCurrentUser(null);
      return;
    }

    try {
      // Call /users/me which will auto-create the user via getUserContext() if they don't exist
      const response = await fetch(`${API_BASE}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkUser.id}`, // Clerk user ID as token for now
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("LANDING HEADER: ", data);
        if (data) {
          setCurrentUser(data as PrismaUser);
          return;
        }
      }
      console.error("Failed to fetch/create user:", response.status);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    if (!clerkUser) {
      setCurrentUser(null);
      return;
    }
    fetchOrCreateUser();
  }, [clerkUser, isLoaded]);

  if (isLoaded && !isSignedIn) return null;

  return (
    <header className="border-b">
      <div className="container flex flex-wrap items-center justify-center gap-4 md:justify-between py-2">
        <Link href="/" className="text-xl font-bold flex items-center">
          <House className="size-5 mr-1" strokeWidth={2.5} /> Conductor
          Ticketing
        </Link>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Features</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-80">
                  <li>
                    <NavigationMenuLink asChild>
                      <a href="https://stripe.com">
                        <p className="font-medium leading-none">Stripe</p>
                        <p className="text-sm text-muted-foreground leading-snug">
                          Get paid easily
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </li>

                  <li>
                    <NavigationMenuLink asChild>
                      <a href="https://auth0.com">
                        <p className="font-medium leading-none">Auth0</p>
                        <p className="text-sm text-muted-foreground leading-snug">
                          Auth is already setup
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </li>

                  <li>
                    <NavigationMenuLink asChild>
                      <a href="https://ui.shadcn.com">
                        <p className="font-medium leading-none">shadcn</p>
                        <p className="text-sm text-muted-foreground leading-snug">
                          Uses shadcn/ui for components
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/company" legacyBehavior passHref>
                <NavigationMenuLink>Company</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/pricing" legacyBehavior passHref>
                <NavigationMenuLink>Pricing</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex flex-wrap items-center gap-4">
          {clerkUser && currentUser ? (
            <>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard <ArrowRight />
              </Button>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="secondary">Log in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Sign up</Button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
