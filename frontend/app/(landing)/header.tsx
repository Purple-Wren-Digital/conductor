"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccessToken, useUser } from "@auth0/nextjs-auth0";
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
import { useStore } from "../store-provider";

export function Header() {
  const { user: auth0User, isLoading } = useUser();

  const [isUserDataLoading, setIsUserDataLoading] = useState(isLoading);
  const { prismaUser, setPrismaUser } = useStore();

  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const createPrismaUser = async () => {
    if (!auth0User || !auth0User?.email) {
      throw new Error("no user information");
    }
    const accessToken = await getAuthToken();
    const response = await fetch("api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        email: auth0User.email,
        name: "Testing",
        role: "AGENT",
      }),
    });
    if (response.ok) {
      const data: { user: PrismaUser } = await response.json();
      if (data && data?.user) {
        return data.user;
      }
    }
  };

  const getPrismaUser = async () => {
    if (!auth0User || !auth0User?.email) throw new Error("No email to search");
    const accessToken = await getAuthToken();
    const response = await fetch(`/api/users/email/${auth0User.email}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  };

  const fetchAndSetPrismaUser = async () => {
    setIsUserDataLoading(true);
    const foundUser = await getPrismaUser();
    if (foundUser) {
      console.log("Found Prisma User!");
      setPrismaUser(foundUser);
      setIsUserDataLoading(false);

      return;
    }
    const createdUser = await createPrismaUser();

    if (createdUser) {
      console.log("Created Prisma User as an AGENT!");
      setPrismaUser(createdUser);
      setIsUserDataLoading(false);
      return;
    }

    if (!createdUser || !foundUser) {
      console.error("Unable to find or create user");
    }
    setPrismaUser(null);
    setIsUserDataLoading(false);
  };

  useEffect(() => {
    if (!auth0User) return;

    fetchAndSetPrismaUser();
  }, [auth0User]);

  return (
    <header className="border-b">
      <div className="container flex items-center justify-between py-2">
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

        {isUserDataLoading ? (
          <Button disabled>Loading...</Button>
        ) : prismaUser ? (
          <div className="flex items-center gap-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                Dashboard <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <a href="/auth/logout">Logout</a>
            </Button>
          </div>
        ) : (
          <Button asChild>
            <a href="/auth/login">
              Sign in <ArrowRight />
            </a>
          </Button>
        )}
      </div>
    </header>
  );
}
