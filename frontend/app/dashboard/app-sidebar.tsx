"use client";

import React, { Dispatch, SetStateAction } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import SideBarNewNotification from "@/components/notifications/new-notification-detail";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/types";
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
import { UseMutationResult } from "@tanstack/react-query";

type AppSidebarProps = {
  props: React.ComponentProps<typeof Sidebar>;
  // unReadNotificationTotal: number;
  newestNotification: Notification | null;
  setNewestNotification: Dispatch<SetStateAction<Notification | null>>;
  markAsReadMutation: UseMutationResult<
    {
      success: boolean;
    },
    Error,
    {
      userId?: string;
      notificationId?: string;
    },
    unknown
  >;
};

export function AppSidebar({
  props,
  newestNotification,
  setNewestNotification,
  markAsReadMutation,
}: AppSidebarProps) {
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
            {isLoading && (
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
                <Link href={"/dashboard/account"} className="hover:underline">
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
                  {currentUser?.role === "ADMIN"
                    ? "Global"
                    : currentUser?.marketCenter?.name
                      ? currentUser?.marketCenter?.name
                      : "No Market Center Assigned"}
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* DASHBOARD */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href="/dashboard">
                  <LayoutDashboard /> Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* TICKETS */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href="/dashboard/tickets">
                  <Ticket /> Tickets
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* ADMIN - USER MANAGEMENT */}
            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/users?tab=users">
                    <UsersIcon /> User Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* ADMIN - MARKET CENTER MANAGEMENT */}
            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/marketCenters">
                    <Building2 /> Market Center Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* STAFF - MARKET CENTER MANAGEMENT */}
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
            {/* REPORTS */}
            {permissions?.canAccessReports && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/reports">
                    <FileText /> Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* ACCOUNT */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading || !currentUser}>
                <Link href={`/dashboard/account`}>
                  <CircleUserRound /> Manage Account
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SideBarNewNotification
              newestNotification={newestNotification}
              setNewestNotification={setNewestNotification}
              markAsReadMutation={markAsReadMutation}
            />

            {/* <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href={`/dashboard/profile`}>
                  <CircleUserRound /> Profile
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem> */}

            {/* <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading || !currentUser}>
                <Link href={`/dashboard/account`}>
                  <CircleUserRound /> Manage Account
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu> */}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
