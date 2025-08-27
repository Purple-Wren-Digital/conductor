"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@auth0/nextjs-auth0";
import {
  Cog,
  LayoutDashboard,
  Wallet,
  Users as UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { className, ...rest } = props;
  const { user } = useUser();

  return (
    <Sidebar {...rest} className={cn(className, "border-r")}>
      <SidebarHeader>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-sm">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard">
                  <LayoutDashboard /> Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/subscription">
                  <Wallet /> Subscription
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/users">
                  <UsersIcon /> User Management
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/settings">
                  <Cog /> Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
