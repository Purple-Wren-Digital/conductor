"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/app/dashboard/app-sidebar";
import { getAccessToken, useUser } from "@auth0/nextjs-auth0";
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

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [initialized, setInitialized] = useState(false);
  const [newestNotification, setNewestNotification] =
    useState<Notification | null>(null);

  const { currentUser, setCurrentUser } = useStore();
  const { user: auth0User, error, isLoading } = useUser();

  const queryClient = useQueryClient();

  const persistUserContext = useCallback(async () => {
    if (!auth0User?.email) return;

    try {
      const accessToken =
        process.env.NODE_ENV === "development"
          ? "local"
          : await getAccessToken();
      const response = await fetch(`/api/users/email/${auth0User.email}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (!response.ok) throw new Error("User not found");
      const data: { user: PrismaUser } = await response.json();
      if (data && data?.user) {
        setCurrentUser(data.user);
      } else {
        throw new Error("User not found");
      }
    } catch (error) {
      console.error("Failed to persist user context:", error);
      setCurrentUser(null);
    } finally {
      setInitialized(true);
    }
  }, [auth0User, setCurrentUser]);

  useEffect(() => {
    if (!isLoading && auth0User) persistUserContext();
  }, [isLoading, auth0User, persistUserContext]);

  const { data: notificationsData, isLoading: isNotificationsLoading } =
    useFetchAllUserNotifications({
      userId: currentUser?.id,
    });

  const notifications: Notification[] = notificationsData?.notifications ?? [];
  const unReadNotificationTotal: number = notificationsData
    ? notificationsData?.unReadAmount
    : 0;

  const invalidateFetchAllUserNotifications = queryClient.invalidateQueries({
    queryKey: ["all-user-notifications", currentUser?.id],
  });

  const markAsReadMutation = useMutation<
    { success: boolean },
    Error,
    { userId?: string; notificationId?: string }
  >({
    mutationFn: async ({ userId, notificationId }) => {
      if (!userId || !notificationId) throw new Error("Missing ID");

      const accessToken =
        process.env.NODE_ENV === "development"
          ? "local"
          : await getAccessToken();
      const response = await fetch(
        `${API_BASE}/notifications/${notificationId}/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log("Mark as Read Response", response);
      const data = await response.json();
      console.log("Mark as Read Data");
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
      await invalidateFetchAllUserNotifications;
    },
  });

  const manageWebSocket = async (userId: string) => {
    console.log("WEBSOCKET USER ID", userId);
    if (!userId) return;
    const ws = new WebSocket(`ws://localhost:8081?userId=${userId}`); // TODO: Prod = wss://<URL>

    ws.onopen = () => console.log("✅ WebSocket connected"); // TODO: happening 2x
    ws.onmessage = async (e) => {
      console.log("✅ Message received!");
      try {
        const notification: Notification = JSON.parse(e.data);
        console.log("📩 Incoming notification:", notification);
        toast.info(`${notification?.title}`);
        setNewestNotification(notification);
        await invalidateFetchAllUserNotifications;
      } catch (err) {
        console.error("Failed to parse notification", err);
      }
    };
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("❌ WebSocket closed");

    return () => ws.close();
  };

  useEffect(() => {
    if (!isLoading && initialized && currentUser?.id) {
      console.log("currentUser.id", currentUser.id);
      manageWebSocket(currentUser.id);
    }
  }, [isLoading, initialized]);

  // Don’t render until user context is known
  if (isLoading || !initialized) return null;

  return (
    <SidebarProvider>
      <AppSidebar
        props={{ collapsible: "offcanvas" }}
        unReadNotificationTotal={unReadNotificationTotal}
        newestNotification={newestNotification}
        setNewestNotification={setNewestNotification}
        markAsReadMutation={markAsReadMutation}
      />

      <div className="w-full flex flex-col min-h-screen">
        <header className="flex items-center px-4 py-2 gap-2 border-b sticky top-0 bg-background z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" />

          <div className="grow flex items-center justify-between">
            <Link href="/dashboard" className="hover:text-muted-foreground">
              <p className="text-lg font-semibold">Conductor Ticketing</p>
            </Link>

            <div className="flex items-center gap-2">
              <AllNotifications
                allNotifications={notifications}
                unReadNotificationTotal={unReadNotificationTotal}
                isNotificationsLoading={isNotificationsLoading}
                newNotification={newestNotification ? true : false}
                markAsReadMutation={markAsReadMutation}
              />
              {auth0User?.picture && (
                <img
                  src={auth0User.picture}
                  alt={auth0User.name || "User Photo"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <Link
                href="/auth/logout"
                onClick={() => setCurrentUser(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
