"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@auth0/nextjs-auth0";
import Link from "next/link";
import { AppSidebar } from "./app-sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = useUser();

  return (
    <SidebarProvider>
      <AppSidebar collapsible="offcanvas" />

      <div className="w-full flex flex-col min-h-screen">
        <header className="flex items-center px-4 py-2 gap-2 border-b sticky top-0 bg-background z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" />

          <div className="grow flex items-center justify-between">
            <Link href="/" className="hover:text-muted-foreground">
              <p className="text-lg font-semibold">Conductor Ticketing</p>
            </Link>

            <div className="flex items-center gap-2">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <Link
                href="/api/auth/logout"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
