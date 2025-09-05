"use client";

import React, { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
// import { useUser } from "@auth0/nextjs-auth0";
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
  // TODO: HARD CODED USER
  // const { user } = useUser();
  const [user, setUser] = useState<UserPrisma | null>(null);
  const userId = "u1";

  const fetchUserFromPrisma = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`);

      // console.log("App Sidebar - Fetch response:", res);
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      // console.log("App Sidebar - Fetched user data:", data);
      if (data && data?.user) setUser(data.user);
    } catch (error) {
      console.error("App Sidebar - Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchUserFromPrisma(userId);
  }, []);

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

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/dashboard/profile/${userId}`}>
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
