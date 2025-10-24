"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStore } from "../store-provider";
import {
  LayoutDashboard,
  Users as UsersIcon,
  CircleUserRound,
  Ticket,
  FileText,
  Building2,
  Building,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useUserRole } from "@/hooks/use-user-role";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { className, ...rest } = props;
  const { role, permissions, isLoading } = useUserRole();
  const { currentUser } = useStore();

  if (!currentUser) {
    return (
      <Sidebar {...rest} className={cn(className, "border-r")}>
        <SidebarContent>
          <div className="p-4">
            Cannot find your account. Please contact support.
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar {...rest} className={cn(className, "border-r")}>
      <SidebarHeader>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            {isLoading && currentUser && (
              <div className="flex flex-col gap-1 items-center w-full">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse w-full opacity-25">
                    <div
                      className={`${
                        i === 0 ? "h-5" : "h-2.5"
                      } bg-muted-foreground rounded`}
                    />
                  </div>
                ))}
              </div>
            )}
            {!isLoading && currentUser && (
              <div className="flex flex-col gap-1">
                <Link href={"/dashboard/profile"} className="hover:underline">
                  <p className="font-medium text-sm">
                    {currentUser?.name
                      ? `${currentUser.name}`
                      : "User not found"}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentUser?.role && currentUser?.role?.toLowerCase()} •{" "}
                  {currentUser?.marketCenter?.name || "Global"}
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href="/dashboard">
                  <LayoutDashboard /> Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href="/dashboard/tickets">
                  <Ticket /> Tickets
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/users?tab=users">
                    <UsersIcon /> User Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/marketCenters">
                    <Building2 /> Market Center Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {role === "STAFF" && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  disabled={isLoading || !currentUser?.marketCenterId}
                >
                  <Link
                    href={`/dashboard/marketCenters/${currentUser.marketCenterId}?tab=team`}
                  >
                    <Building /> Market Center Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {permissions?.canAccessReports && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/reports">
                    <FileText /> Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href={`/dashboard/profile`}>
                  <CircleUserRound /> Profile
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
