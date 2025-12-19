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
  HomeIcon,
  Users as UsersIcon,
  CircleUserRound,
  Ticket,
  Building2,
  Building,
  BookMarked,
  Folder,
  Clock,
  ChartNoAxesCombined,
  CreditCard,
  TagIcon,
} from "lucide-react";
import Link from "next/link";
import { UseMutationResult } from "@tanstack/react-query";

type AppSidebarProps = {
  props: React.ComponentProps<typeof Sidebar>;
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
                  {currentUser?.role &&
                    currentUser?.role?.split("_").join(" ").toLowerCase()}{" "}
                  •{" "}
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
        <SidebarMenu>
          <SidebarGroup>
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href="/dashboard">
                  <HomeIcon className="text-muted-foreground" /> Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* TICKETS */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading}>
                <Link href="/dashboard/tickets">
                  <Ticket className="text-muted-foreground" /> Tickets
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* ADMIN - USER MANAGEMENT */}
            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/users?tab=users">
                    <UsersIcon className="text-muted-foreground" /> User
                    Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* ADMIN - MARKET CENTER MANAGEMENT */}
            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/marketCenters">
                    <Building2 className="text-muted-foreground" /> Market
                    Centers
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* STAFF - MARKET CENTER MANAGEMENT */}
            {(role === "STAFF" || role === "STAFF_LEADER") &&
              currentUser?.marketCenterId && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    disabled={isLoading || !currentUser?.marketCenterId}
                  >
                    <Link
                      href={`/dashboard/marketCenters/${currentUser.marketCenterId}?tab=team`}
                    >
                      <Building className="text-muted-foreground" /> Market
                      Center Team
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

            {/* AGENT - MARKET CENTER INFORMATION */}
            {role === "AGENT" && currentUser?.marketCenterId && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  disabled={isLoading || !currentUser?.marketCenterId}
                >
                  <Link
                    href={`/dashboard/marketCenters/${currentUser.marketCenterId}/team`}
                  >
                    <BookMarked className="text-muted-foreground" />
                    Market Center
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* CATEGORY MANAGEMENT */}
            {permissions?.canManageMarketCenterCategories && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link
                    href={`/dashboard/marketCenters/${currentUser.marketCenterId}?tab=categories`}
                  >
                    <TagIcon className="text-muted-foreground" /> Ticket
                    Categories
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {role && role !== "AGENT" && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    disabled={isLoading || !currentUser?.marketCenterId}
                  >
                    <Link href={`/dashboard/reports`}>
                      <ChartNoAxesCombined className="text-muted-foreground" />
                      Reports
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {role !== "STAFF" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild disabled={isLoading}>
                      <Link href="/dashboard/sla">
                        <Clock className="text-muted-foreground" /> SLA
                        Management
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </>
            )}
            {/* NOTIFICATION TEMPLATES */}
            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/notification-templates">
                    <Folder className="text-muted-foreground" /> Notification
                    Templates
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarGroup>

          <SidebarGroup>
            {/* NEW NOTIFICATIONS */}
            <SideBarNewNotification
              newestNotification={newestNotification}
              setNewestNotification={setNewestNotification}
              markAsReadMutation={markAsReadMutation}
            />
          </SidebarGroup>

          <SidebarGroup className="mb-2 fixed bottom-0 sm:bottom-15 max-w-[16rem]">
            {/* Subscription */}
            {permissions?.canManageSubscription && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading || !currentUser}>
                  <Link href={`/dashboard/subscription`}>
                    <CreditCard className="text-muted-foreground" />
                    Subscription
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* ACCOUNT */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading || !currentUser}>
                <Link href={`/dashboard/account`}>
                  <CircleUserRound className="text-muted-foreground" /> Manage
                  Account
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* SUPPORT/HELP */}
            {/* <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={isLoading || !currentUser}>
                <Link href={`/help`}>
                  <Info className="text-muted-foreground" /> Support
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem> */}
          </SidebarGroup>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
