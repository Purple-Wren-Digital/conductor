"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/app/dashboard/app-sidebar";
import { useUser, UserButton, useAuth } from "@clerk/nextjs";

import AllNotifications from "@/components/notifications/notifications-list";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useStore } from "@/context/store-provider";
import { useFetchAllUserNotifications } from "@/hooks/use-user-notifications";
import { API_BASE } from "@/lib/api/utils";
import type { Notification, PrismaUser } from "@/lib/types";
import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getEncoreClient } from "@/lib/api/client-side";
import { Footer } from "@/components/ui/footer";
import conductorLogo from "@/app/(landing)/assets/conductor/Conductor Icon_White.png";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [newestNotification, setNewestNotification] =
    useState<Notification | null>(null);
  const { setCurrentUser } = useStore();
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoaded) return;
    if (isLoaded && !clerkUser) {
      console.error(
        "DashboardLayout: No Clerk user found, cannot persist App Context"
      );
      setCurrentUser(null);
      return;
    }
    const persistUserContext = async () => {
      if (!clerkUser?.id) {
        console.error("DashboardLayout: no Clerk user");
        setCurrentUser(null);
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        // Call /users/me which will auto-create the user if they don't exist
        const response = await fetch(`${API_BASE}/users/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) throw new Error("User not found");
        const data = await response.json();
        if (data) {
          setCurrentUser(data as PrismaUser);
        } else {
          throw new Error("User not found");
        }
      } catch (error) {
        isLoaded;
        console.error("Error fetching user:", error);
        setCurrentUser(null);
      }
    };
    persistUserContext();
  }, [clerkUser, isLoaded, setCurrentUser, getToken]);

  const { data: notificationsData, isLoading: isNotificationsLoading } =
    useFetchAllUserNotifications({
      isAccountLoaded: isLoaded,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? "",
      getToken,
    });

  const notifications: Notification[] = notificationsData?.notifications ?? [];
  const unReadNotificationTotal: number = notificationsData
    ? notificationsData?.unReadAmount
    : 0;

  const invalidateFetchAllUserNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "all-user-notifications",
        clerkUser?.emailAddresses?.[0]?.emailAddress ?? "",
      ],
    });
  }, [queryClient, clerkUser]);

  const markAsReadMutation = useMutation<
    { success: boolean },
    Error,
    { notificationId?: string }
  >({
    mutationFn: async ({ notificationId }) => {
      if (!clerkUser?.emailAddresses?.[0]?.emailAddress || !notificationId)
        throw new Error("Missing data");

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/${notificationId}/${clerkUser?.emailAddresses?.[0]?.emailAddress ?? ""}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      return data?.success ?? false;
    },

    onSuccess: () => {
      setNewestNotification(null);
    },
    onError: (error) => {
      console.error("Failed to mark as read", error);
      toast.warning("Unable to mark as read");
    },
    onSettled: async () => {
      await invalidateFetchAllUserNotifications();
    },
  });

  useEffect(() => {
    if (!clerkUser?.id) return;

    let stream: any = null;
    let isConnecting = false;

    const connectToStream = async () => {
      if (isConnecting) return;
      isConnecting = true;

      try {
        console.log("📡 Connecting to notification stream...");

        const token = await getToken();
        if (!token) {
          console.error("Failed to get authentication token");
          return;
        }

        const client = getEncoreClient(token);

        // Connect to the notification stream
        stream = await client.notifications.notificationStream();
        console.log("✅ Notification stream connected");

        // Listen for notifications
        for await (const notification of stream) {
          console.log("✅ Notification received!", notification);
          toast.info(`${notification?.title}`);
          setNewestNotification(notification);
          await invalidateFetchAllUserNotifications();
        }
      } catch (err) {
        console.error("❌ Notification stream error:", err);
      } finally {
        isConnecting = false;
        console.log("❌ Notification stream closed");
      }
    };

    // Handle stream errors and reconnection
    connectToStream();

    return () => {
      if (stream) {
        stream.close();
      }
    };
  }, [clerkUser?.id, invalidateFetchAllUserNotifications, getToken]);

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          props={{ collapsible: "offcanvas" }}
          newestNotification={newestNotification}
          setNewestNotification={setNewestNotification}
          markAsReadMutation={markAsReadMutation}
        />

        <div className="w-full flex flex-col min-h-screen">
          <header className="flex items-center px-4 py-2 gap-2 border-b sticky top-0 bg-[#6D1C24] z-10">
            <SidebarTrigger className="text-muted hover:text-[#A2646A] hover:bg-transparent" />
            <Separator orientation="vertical" className="text-muted" />

            <div className="grow flex items-center justify-between">
              <Link
                href="/dashboard"
                className="hover:text-[#A2646A] flex items-center gap-3"
              >
                <div className="size-10 flex items-center justify-center">
                  <Image src={conductorLogo} alt="Conductor Logo" />
                </div>
                <div className="hidden md:flex flex-col leading-tight ">
                  <h1 className="text-sm font-bold sm:text-xl text-muted">
                    Conductor
                  </h1>
                  <p className="text-xs font-medium sm:text-sm text-muted">
                    Agent Ticketing System
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <AllNotifications
                  allNotifications={notifications}
                  unReadNotificationTotal={unReadNotificationTotal}
                  isNotificationsLoading={isNotificationsLoading}
                  newNotification={newestNotification ? true : false}
                  markAsReadMutation={markAsReadMutation}
                />
                <div className="w-7 h-7 rounded">
                  <UserButton />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-grow container mx-auto p-6 pb-30 overflow-y-auto">
            {children}
          </main>
        </div>
      </SidebarProvider>
      <Footer />
    </>
  );
}
