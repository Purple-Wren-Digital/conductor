"use client";

import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { AppSidebar } from "./app-sidebar";
import { useStore } from "../store-provider";
import { PrismaUser } from "@/lib/types";
import { API_BASE } from "@/lib/api/utils";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { setCurrentUser } = useStore();
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  const persistUserContext = async () => {
    if (!clerkUser?.id) {
      console.error("DashboardLayout: no Clerk user");
      setCurrentUser(null);
      return;
    }

    try {
      // Call /users/me which will auto-create the user if they don't exist
      const response = await fetch(`${API_BASE}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkUser.id}`, // Clerk user ID as token for now
        },
        cache: "no-store",
      });

      if (!response.ok) throw new Error("User not found");
      const data = await response.json();
      console.log("DASHBOARD LAYOUT: ", data);
      if (data) {
        setCurrentUser(data as PrismaUser);
      } else {
        throw new Error("User not found");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    // if (!isLoaded) return;
    if (isLoaded && !clerkUser) {
      console.error(
        "DashboardLayout: No Clerk user found, cannot persist App Context"
      );
      setCurrentUser(null);
      return;
    }
    persistUserContext();
  }, [clerkUser, isLoaded]);

  // const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  if (isLoaded && !isSignedIn) return null;

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
              <UserButton afterSignOutUrl="/" />
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
