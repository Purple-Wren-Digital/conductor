"use client";

import React, { Dispatch, SetStateAction, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import SideBarNewNotification from "@/components/notifications/new-notification-detail";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useIsEnterprise } from "@/hooks/useSubscription";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/types";
import {
  BellRing,
  BookMarked,
  Building,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronDown,
  CircleUserRound,
  CogIcon,
  CreditCard,
  FolderPen,
  HomeIcon,
  LockKeyholeIcon,
  Ticket,
  Users as UsersIcon,
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
  const [settingsSubMenuOpen, setSettingsSubMenuOpen] = useState(false);
  const [marketCenterSubMenuOpen, setMarketCenterSubMenuOpen] = useState(false);

  const { className, ...rest } = props;
  const { role, permissions, isLoading } = useUserRole();
  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();

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
    <Sidebar
      {...rest}
      className={cn(className, "border-r h-[calc(100vh-65px)]")}
    >
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
                <Link
                  href={"/dashboard/account"}
                  className="hover:underline"
                  aria-label="Navigate to your account"
                >
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

      <SidebarContent className="overscroll-contain scroll-smooth">
        <SidebarMenu>
          <SidebarGroup>
            {/* DASHBOARD */}
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

            {permissions?.canAccessReports && (
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
            )}

            {/* ADMIN - USER MANAGEMENT */}
            {permissions?.canManageAllUsers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/users?tab=users">
                    <UsersIcon className="text-muted-foreground" /> Users
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* ENTERPRISE - ADMIN - MARKET CENTERS MANAGEMENT */}
            {isEnterprise && permissions?.canManageAllMarketCenters && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild disabled={isLoading}>
                  <Link href="/dashboard/marketCenters">
                    <Building2 className="text-muted-foreground" /> Market
                    Centers
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* NON-ENTERPRISE - ADMIN, STAFF LEADER, STAFF - MARKET CENTER MANAGEMENT */}
            {!isEnterprise &&
              currentUser?.marketCenterId &&
              permissions?.canManageTeam && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    // asChild
                    disabled={isLoading || !currentUser?.marketCenterId}
                    onClick={() => setMarketCenterSubMenuOpen((prev) => !prev)}
                    className="flex justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="text-muted-foreground w-4 h-4" />{" "}
                      Market Center
                    </div>

                    <ChevronDown
                      className={cn(
                        "text-muted-foreground w-4 h-4 transition-transform",
                        marketCenterSubMenuOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  {marketCenterSubMenuOpen && (
                    <SidebarMenuSub className={``}>
                      {/* TEAM MANAGEMENT */}
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link
                            href={`/dashboard/marketCenters/${currentUser.marketCenterId}?tab=team`}
                          >
                            Team Members
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {/* CATEGORY MANAGEMENT */}
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link
                            href={`/dashboard/marketCenters/${currentUser.marketCenterId}?tab=categories`}
                          >
                            Ticket Categories
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link
                            href={`/dashboard/marketCenters/${currentUser.marketCenterId}?tab=activity`}
                          >
                            Activity
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

            {permissions?.canAccessSettings && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  disabled={isLoading}
                  onClick={() => setSettingsSubMenuOpen((prev) => !prev)}
                  className="flex justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CogIcon className="text-muted-foreground w-4 h-4" />
                    Settings
                  </div>

                  <ChevronDown
                    className={cn(
                      "text-muted-foreground w-4 h-4 transition-transform",
                      settingsSubMenuOpen && "rotate-180"
                    )}
                  />
                </SidebarMenuButton>
                {settingsSubMenuOpen && (
                  <SidebarMenuSub>
                    {permissions?.canManageMCNotificationSettings && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild disabled={isLoading}>
                          <Link href={`/dashboard/notification-preferences`}>
                            <BellRing className="text-muted-foreground" />
                            Alert Preferences
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {permissions?.canManageNotificationTemplateSettings && (
                      <SidebarMenuSubItem>
                        <SidebarMenuButton asChild disabled={isLoading}>
                          <Link href="/dashboard/template-customization">
                            <FolderPen className="text-muted-foreground" />
                            Notification Templates
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuSubItem>
                    )}

                    {permissions?.canManageTicketTemplateSettings && (
                      <SidebarMenuSubItem>
                        <SidebarMenuButton asChild disabled={isLoading}>
                          <Link href="/dashboard/ticket-templates">
                            <FolderPen className="text-muted-foreground" />
                            Ticket Templates
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuSubItem>
                    )}

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild disabled={isLoading}>
                        <Link href="/dashboard/sla">
                          <CalendarClock className="text-muted-foreground" />
                          SLA Management
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild disabled={isLoading}>
                        <Link href="/dashboard/settings">
                          <LockKeyholeIcon className="text-muted-foreground" />
                          Auto-Close Management
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenuSub>
                )}
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
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t list-none p-4">
        <SidebarMenu className="">
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
