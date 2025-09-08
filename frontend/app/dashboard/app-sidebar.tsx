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
  Wallet,
  Users as UsersIcon,
  CircleUserRound,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { UserRole } from "@/lib/types";

interface UserPrisma {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  picture?: string;
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { className, ...rest } = props;
  const { prismaUser } = useStore();

  return (
    <Sidebar {...rest} className={cn(className, "border-r")}>
      <SidebarHeader>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-sm">
                {prismaUser && prismaUser?.name
                  ? `${prismaUser.name}`
                  : "User name not set"}
              </p>
              <p className="text-xs text-muted-foreground">
                {prismaUser && prismaUser?.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {prismaUser &&
                  prismaUser?.role &&
                  prismaUser?.role?.toLowerCase()}{" "}
                • Global
                {/* TODO: Market center set up: prismaUser?.marketCenter?.name || "Global" */}
              </p>
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

            {prismaUser && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={`/dashboard/profile/${prismaUser.id}`}>
                    <CircleUserRound /> Profile
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
