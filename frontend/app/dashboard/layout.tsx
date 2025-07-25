"use client";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

      <div className="w-full flex flex-col">
        <header className="flex items-center px-2 py-2 gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" />

          <div className="grow flex items-center justify-between">
            <p className="text-lg font-semibold">Acme</p>

            <div className="flex items-center gap-2">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <Link
                href="/auth/logout"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </Link>
            </div>
          </div>
        </header>

        <div className="px-2 py-2">{children}</div>
      </div>
    </SidebarProvider>
  );
}
