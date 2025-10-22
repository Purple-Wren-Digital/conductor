"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccessToken, useUser } from "@auth0/nextjs-auth0"; // handleLogout
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

export function Header() {
  const router = useRouter();

  const [isSignUpClicked, setIsSignUpClicked] = useState(false);

  const { user: auth0User, isLoading } = useUser();
  const { currentUser, setCurrentUser } = useStore();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const fetchAndSetExistingPrismaUser = async () => {
    if (!auth0User || !auth0User?.email) throw new Error("No email to search");
    const accessToken = await getAuth0AccessToken();
    const response = await fetch(`/api/users/email/${auth0User.email}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data: { user: PrismaUser } = await response.json();
      if (data && data?.user) {
        setCurrentUser(data.user);
        return;
      }
    }
    setCurrentUser(null);
  };

  const createAndSetNewPrismaUser = async () => {
    if (!auth0User || !auth0User?.email) {
      throw new Error("no user information");
    }
    const accessToken = await getAuth0AccessToken();
    const response = await fetch("api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        email: auth0User.email,
        name: auth0User?.name || auth0User?.nickname || "",
        role: "AGENT", // TODO: get meta data?? auth0User?.user_metadata?.role
      }),
    });
    if (response.ok) {
      const data: { user: PrismaUser } = await response.json();
      if (data && data?.user) {
        setCurrentUser(data.user);
        return;
      }
    }
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!auth0User) return;

    if (isSignUpClicked) {
      createAndSetNewPrismaUser();
    } else {
      fetchAndSetExistingPrismaUser();
    }
  }, [auth0User, isSignUpClicked]);

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
          {auth0User && currentUser && (
            <>
              <Button
                asChild
                variant="ghost"
                disabled={isLoading || !currentUser}
                onClick={() => {
                  setCurrentUser(null);
                  router.push("/auth/logout");
                }}
              >
                <p>Log Out</p>
              </Button>
              <Button
                asChild
                variant="outline"
                disabled={isLoading || !currentUser}
                onClick={() => router.push("/dashboard")}
              >
                <p>
                  Dashboard <ArrowRight />
                </p>
              </Button>
            </>
          )}
          {(!auth0User || !currentUser) && (
            <>
              <Button
                asChild
                variant="secondary"
                disabled={isLoading}
                onClick={() => {
                  setIsSignUpClicked(false);
                  router.push("/auth/login");
                }}
              >
                <p>Log in</p>
              </Button>

              <Button
                asChild
                disabled={isLoading}
                onClick={() => {
                  setIsSignUpClicked(true);
                  router.push("/auth/login?screen_hint=signup");
                }}
              >
                <p>Sign up</p>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
