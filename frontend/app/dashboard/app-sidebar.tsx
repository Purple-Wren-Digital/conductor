"use client";

import React, { Dispatch, SetStateAction, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  useSidebar,
} from "@/components/ui/sidebar";
import SideBarNewNotification from "@/components/notifications/new-notification-detail";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useIsEnterprise } from "@/hooks/useSubscription";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/types";
import { MarketCenterSwitcher } from "@/components/ui/market-center-switcher";
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
import { useRouter } from "next/navigation";
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

  const { closeSidebar } = useSidebar();
  const router = useRouter();
  const { className, ...rest } = props;
  const { role, permissions, isSuperuser, isLoading } = useUserRole();
  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();

  const navigate = (href: string) => {
    router.push(href);
    closeSidebar();
  };

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
      className={cn(className, "border-r h-[calc(100vh-70px)]")}
    >
      <SidebarHeader>
        <div className="border-b">
          <SidebarMenuButton
            onClick={() => navigate("/dashboard/account")}
            disabled={isLoading || !currentUser}
            className="flex items-center gap-2 h-[100px]"
          >
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
              <div
                className="flex flex-col gap-1"
                aria-label="Navigate to your account"
              >
                <p className="font-medium text-sm hover:underline">
                  {currentUser?.name ? `${currentUser.name}` : "User not found"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentUser?.role &&
                    currentUser?.role?.split("_").join(" ").toLowerCase()}{" "}
                  •{" "}
                  <MarketCenterSwitcher />
                </p>
              </div>
            )}
          </SidebarMenuButton>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <ScrollArea className={`overflow-y-scroll scroll-smooth`}>
            <SidebarGroup>
              {/* DASHBOARD */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  disabled={isLoading}
                >
                  <HomeIcon className="text-muted-foreground" /> Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* TICKETS */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard/tickets")}
                  disabled={isLoading}
                >
                  <Ticket className="text-muted-foreground" /> Tickets
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* AGENT - MARKET CENTER INFORMATION */}
              {role === "AGENT" && !!currentUser?.marketCenterId && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() =>
                      navigate(
                        `/dashboard/marketCenters/${currentUser.marketCenterId}/team`
                      )
                    }
                    disabled={isLoading || !currentUser?.marketCenterId}
                  >
                    <BookMarked className="text-muted-foreground" />
                    Market Center
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {permissions?.canAccessReports && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/dashboard/reports")}
                    disabled={isLoading || !currentUser?.marketCenterId}
                  >
                    <ChartNoAxesCombined className="text-muted-foreground" />
                    Reports
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* ADMIN - USER MANAGEMENT */}
              {permissions?.canManageAllUsers && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/dashboard/users?tab=users")}
                    disabled={isLoading}
                  >
                    <UsersIcon className="text-muted-foreground" /> Users
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* ENTERPRISE / SUPERUSER - ADMIN - MARKET CENTERS MANAGEMENT */}
              {(isEnterprise || isSuperuser) && permissions?.canManageAllMarketCenters && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/dashboard/marketCenters")}
                    disabled={isLoading}
                  >
                    <Building2 className="text-muted-foreground" /> Market
                    Centers
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* NON-ENTERPRISE - ADMIN, STAFF LEADER, STAFF - MARKET CENTER MANAGEMENT */}
              {!isEnterprise &&
                !isSuperuser &&
                !!currentUser?.marketCenterId &&
                permissions?.canManageTeam && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() =>
                        setMarketCenterSubMenuOpen((prev) => !prev)
                      }
                      disabled={isLoading || !currentUser?.marketCenterId}
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
                          <SidebarMenuButton
                            onClick={() =>
                              navigate(
                                `/dashboard/marketCenters/${currentUser.marketCenterId}?tab=team`
                              )
                            }
                            disabled={isLoading}
                          >
                            Team Members
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {/* CATEGORY MANAGEMENT */}
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() =>
                              navigate(
                                `/dashboard/marketCenters/${currentUser.marketCenterId}?tab=categories`
                              )
                            }
                            disabled={isLoading}
                          >
                            Ticket Categories
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() =>
                              navigate(
                                `/dashboard/marketCenters/${currentUser.marketCenterId}?tab=activity`
                              )
                            }
                            disabled={isLoading}
                          >
                            Activity
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )}

              {permissions?.canAccessSettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setSettingsSubMenuOpen((prev) => !prev)}
                    disabled={isLoading}
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
                          <SidebarMenuButton
                            onClick={() =>
                              navigate(`/dashboard/notification-preferences`)
                            }
                            disabled={isLoading}
                          >
                            <BellRing className="text-muted-foreground" />
                            Alert Preferences
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}

                      {permissions?.canManageNotificationTemplateSettings && (
                        <SidebarMenuSubItem>
                          <SidebarMenuButton
                            onClick={() =>
                              navigate(`/dashboard/template-customization`)
                            }
                            disabled={isLoading}
                          >
                            <FolderPen className="text-muted-foreground" />
                            Notification Templates
                          </SidebarMenuButton>
                        </SidebarMenuSubItem>
                      )}

                      {permissions?.canManageTicketTemplateSettings && (
                        <SidebarMenuSubItem>
                          <SidebarMenuButton
                            onClick={() =>
                              navigate(`/dashboard/ticket-templates`)
                            }
                            disabled={isLoading}
                          >
                            <FolderPen className="text-muted-foreground" />
                            Ticket Templates
                          </SidebarMenuButton>
                        </SidebarMenuSubItem>
                      )}

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => navigate(`/dashboard/sla`)}
                          disabled={isLoading}
                        >
                          <CalendarClock className="text-muted-foreground" />
                          SLA Management
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => navigate(`/dashboard/settings`)}
                          disabled={isLoading}
                        >
                          <LockKeyholeIcon className="text-muted-foreground" />
                          Auto-Close Management
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
          </ScrollArea>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t list-none p-4">
        <SidebarMenu className="">
          {/* Subscription */}
          {permissions?.canManageSubscription && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/dashboard/subscription")}
                disabled={isLoading || !currentUser}
              >
                <CreditCard className="text-muted-foreground" />
                Subscription
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* ACCOUNT */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/dashboard/account")}
              disabled={isLoading || !currentUser}
            >
              <CircleUserRound className="text-muted-foreground" /> Manage
              Account
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
