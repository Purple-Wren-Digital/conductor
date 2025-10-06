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
  Cog,
  LayoutDashboard,
  Users as UsersIcon,
  CircleUserRound,
  Ticket,
  FileText,
  Folder,
  Building2,
  Building,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useRouter } from "next/navigation";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();

  const { className, ...rest } = props;
  const { role, permissions, isLoading } = useUserRole();
  const { currentUser } = useStore();

  // if (isLoading) {
  //   return (
  //     <Sidebar {...rest} className={cn(className, "border-r")}>
  //       <SidebarContent>
  //         <div className="p-4">Loading...</div>
  //       </SidebarContent>
  //     </Sidebar>
  //   );
  // }

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
            <div className="flex flex-col gap-1">
              <p className="font-medium text-sm">
                {currentUser?.name
                  ? `${currentUser.name}`
                  : "User name not set"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUser?.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentUser?.role && currentUser?.role?.toLowerCase()} •{" "}
                {currentUser?.marketCenter?.name || "Global"}
              </p>
            </div>
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
                    <Building2 /> Market Centers
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* {permissions?.canManageTeam && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/settings?tab=team" disabled={isLoading}>
                    <Folder /> Team Management
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )} */}

            {permissions?.canAccessReports && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/reports">
                    <FileText /> Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Manage your team members, roles, and invitations */}

            {role === "STAFF" && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  disabled={isLoading || !currentUser?.marketCenterId}
                  // onClick={() => {
                  //   router.push(
                  //     `dashboard/marketCenters/${currentUser.marketCenterId}`
                  //   );
                  // }}
                >
                  <Link
                    href={`/dashboard/marketCenters/${currentUser.marketCenterId}`}
                  >
                    <Building /> Market Center Management
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
