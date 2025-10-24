"use client";

import { useCallback, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getAccessToken, useUser } from "@auth0/nextjs-auth0";
import Link from "next/link";
import { AppSidebar } from "./app-sidebar";
import { useStore } from "../store-provider";
import { PrismaUser } from "@/lib/types";
import { API_BASE } from "@/lib/api/utils";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { setCurrentUser } = useStore();
  const { user: auth0User } = useUser();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const persistUserContext = async () => {
    if (!auth0User || !auth0User?.email) {
      console.error("DashboardLayout: no email to search");
      setCurrentUser(null);
      return;
    }

    try {
      const accessToken = await getAuth0AccessToken();
      const encodedEmail = encodeURIComponent(auth0User.email);
      const response = await fetch(`${API_BASE}/users/email/${encodedEmail}`, {
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
      } else {
        console.error(`Failed to fetch user: ${response.status} ${response.statusText}`);
      }
      setCurrentUser(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setCurrentUser(null);
    }
  };

  // TODO: CURRENT USER PERSISTENCE
  useEffect(() => {
    if (!auth0User) {
      console.error(
        "DashboardLayout: no Auth0 user, cannot persist App Context"
      );
      return;
    }
    persistUserContext();
  }, [auth0User]);

  return (
    <SidebarProvider>
      <AppSidebar collapsible="offcanvas" />

      <div className="w-full flex flex-col min-h-screen">
        <header className="flex items-center px-4 py-2 gap-2 border-b sticky top-0 bg-background z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" />

          <div className="grow flex items-center justify-between">
            <Link href="/dashboard" className="hover:text-muted-foreground">
              <p className="text-lg font-semibold">Conductor Ticketing</p>
            </Link>

            <div className="flex items-center gap-2">
              {auth0User?.picture && (
                <img
                  src={auth0User.picture}
                  alt={auth0User.name || "User Photo"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <Link
                href="/auth/logout"
                onClick={() => setCurrentUser(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
