"use client";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useUser } from "@auth0/nextjs-auth0";
import { ArrowRight, House } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { user, isLoading } = useUser();

  return (
    <header className="border-b">
      <div className="container flex items-center justify-between py-2">
        <Link href="/" className="text-xl font-bold flex items-center">
          <House className="size-5 mr-1" strokeWidth={2.5} />
          Conductor Ticketing
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

        {isLoading ? (
          <Button disabled>Loading...</Button>
        ) : user ? (
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
