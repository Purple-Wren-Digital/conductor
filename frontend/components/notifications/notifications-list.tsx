"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog/base-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import type { Notification, NotificationData } from "@/lib/types";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { UseMutationResult } from "@tanstack/react-query";

export default function AllNotifications({
  allNotifications,
  unReadNotificationTotal,
  isNotificationsLoading,
  newNotification,
  markAsReadMutation,
}: {
  allNotifications: Notification[];
  unReadNotificationTotal: number;
  isNotificationsLoading: boolean;
  newNotification: boolean;
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
}) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [notificationList, setNotificationList] =
    useState<Notification[]>(allNotifications);

  const { permissions } = useUserRole();
  const { currentUser } = useStore();

  const filterNotifications = (filter: string) => {
    if (filter === "Read") {
      const unReadOnly: Notification[] = allNotifications.filter(
        (n) => n.read === true
      );
      setSelectedFilter(filter);

      setNotificationList(unReadOnly);
      return;
    }

    if (filter === "Unread") {
      const readOnly: Notification[] = allNotifications.filter(
        (n) => n.read === false
      );
      setSelectedFilter(filter);

      setNotificationList(readOnly);
      return;
    }
    setNotificationList(allNotifications);
    setSelectedFilter("All");
  };

  const formatUrl = (category: string, urlData?: NotificationData) => {
    let url: string | null = null;

    if (
      category === "ACCOUNT" ||
      (urlData && urlData?.userId && urlData.userId === currentUser?.id)
    ) {
      return (url = `/dashboard/account`);
    }
    if (
      category !== "ACCOUNT" &&
      urlData &&
      urlData?.userId &&
      permissions?.canManageAllUsers
    ) {
      return (url = `/dashboard/users/${urlData.userId}`);
    }

    if (urlData && urlData?.url) {
      url = urlData.url;
      return;
    }
    if (urlData && urlData?.marketCenterId) {
      return (url = `/dashboard/marketCenters/${urlData.marketCenterId}${urlData?.categoryId ? `?tab=categories` : ""}`);
    }
    if (urlData && urlData?.ticketId) {
      return (url = `/dashboard/tickets/${urlData.ticketId}`);
    }

    return url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <DialogTrigger asChild className="flex flex-row items-center gap-2">
        <Button variant={"ghost"} disabled={isNotificationsLoading}>
          <div className="relative inline-block">
            <Bell className="w-6 h-6" />
            {newNotification || unReadNotificationTotal > 0 ? (
              <Badge
                aria-label={`${unReadNotificationTotal} Unread Notifications`}
                className={`absolute -top-0.25 -right-0.25 p-1 leading-none rounded-full border motion-safe:animate-conductor-ping`}
              />
            ) : null}
          </div>
          <p
            className={`hidden sm:inline ${newNotification || unReadNotificationTotal > 0 ? "font-semibold" : "font-medium"}`}
          >
            Notifications
          </p>
        </Button>
      </DialogTrigger>

      <DialogPortal>
        <DialogContent>
          <DialogHeader className="flex flex-col flex-wrap">
            <DialogTitle className="w-fit">Notifications</DialogTitle>
            <div className="flex flex-row items-center gap-4 w-fit">
              {["All", "Read", "Unread"].map((selection) => {
                return (
                  <div
                    key={selection}
                    className="hover:underline"
                    onClick={() =>
                      !isNotificationsLoading && filterNotifications(selection)
                    }
                  >
                    <DialogDescription
                      className={
                        selection === selectedFilter
                          ? "font-bold"
                          : "font-medium"
                      }
                    >
                      {selection}
                      {selection === "Unread" &&
                        ` (${unReadNotificationTotal})`}
                    </DialogDescription>
                  </div>
                );
              })}
            </div>
          </DialogHeader>
          <Separator />

          <ScrollArea className="flex flex-col gap-4 h-100">
            {isNotificationsLoading &&
              (!notificationList || !notificationList.length) && (
                <p className="text-sm font-medium">Loading...</p>
              )}

            {!isNotificationsLoading &&
              (!notificationList || !notificationList.length) && (
                <p className="text-sm font-medium">No notifications yet</p>
              )}
            {!isNotificationsLoading &&
              notificationList &&
              notificationList.length > 0 &&
              notificationList.map((notification, index) => {
                const url = formatUrl(
                  notification.category,
                  notification?.data
                );
                return (
                  <div
                    key={`${index}-${notification.id}`}
                    className={`flex items-center justify-between space-y-2 ${url && "rounded hover:bg-muted"}`}
                    onClick={() => {
                      if (url) {
                        setIsOpen(false);
                        router.push(url);
                      }
                    }}
                  >
                    <div
                      className={`max-w-3xs pl-1 ${url && "hover:underline"}`}
                    >
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      {notification?.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      )}
                      {notification?.body && (
                        <p className="text-xs text-muted-foreground line-clamp-3 text-ellipsis">
                          {notification?.body}
                        </p>
                      )}
                    </div>

                    <Button
                      variant={"link"}
                      size={"sm"}
                      disabled={notification.read || isNotificationsLoading}
                      className="flex flex-row items-center gap-1 p-1"
                      aria-label="Mark as Read"
                      onClick={() => {
                        markAsReadMutation.mutate({
                          userId: notification?.userId,
                          notificationId: notification?.id,
                        });
                      }}
                    >
                      <p
                        className={`hidden lg:inline text-xs ${notification.read && "text-muted-foreground"}`}
                      >
                        Mark as Read
                      </p>
                      <CheckCheck className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
          </ScrollArea>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
