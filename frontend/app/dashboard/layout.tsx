"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@auth0/nextjs-auth0";
import Link from "next/link";
import { AppSidebar } from "./app-sidebar";
import { useStore } from "../store-provider";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { setPrismaUser } = useStore();
  const { user: auth0User } = useUser();

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
                onClick={() => setPrismaUser(null)}
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
