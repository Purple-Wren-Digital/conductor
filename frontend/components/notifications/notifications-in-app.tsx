"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Bell, BellDot, Check, CheckCheck, X } from "lucide-react";
import { API_BASE } from "@/lib/api/utils";
import { Notification } from "@/lib/types";

export default function InAppNotifications({
  userId,
  disabled,
}: {
  userId?: string;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTotal, setNotificationTotal] = useState<number>(0);

  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const fetchNotifications = async () => {
    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(
        `${API_BASE}/notifications/in-app/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log("NOTIFICATIONS RESPONSE", response);

      const data = await response.json();
      console.log("NOTIFICATIONS DATA", data);

      setNotificationTotal(data && data?.unReadAmount ? data.unReadAmount : 0);
      setNotifications(data && data?.notifications ? data.notifications : []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setNotificationTotal(0);
      setNotifications([]);
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, getAuth0AccessToken]);

  const handleMarkAsRead = async (notificationId: string) => {
    console.log(
      "Market as Read pressed. TODO: actually mark as read",
      notificationId
    );
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled={disabled || isNotificationsLoading}
          className={`justify-between ${notificationTotal > 0 && "font-semibold"}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex flex-row items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </div>
          {notificationTotal > 0 && (
            <div className="flex flex-row items-center gap-1">
              {notificationTotal} New
              <Badge
                variant="orange"
                className="ml-1 h-2 w-2 rounded-full p-0"
              />
            </div>
          )}
        </SidebarMenuButton>
        {isOpen && (
          <Card
            className="p-2.5 gap-2 mt-5" //
          >
            <CardHeader className="p-0 m-0">
              <CardTitle className="flex items-center justify-between text-md">
                Recent Activity
                <div
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              {notifications &&
                notifications.length > 0 &&
                notifications.map((notification, index) => {
                  return (
                    <div
                      key={`${index}-${notification.id}`}
                      className="p-1 border-b"
                    >
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      {notification?.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      )}
                      <div className=" py-2">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification?.body}{" "}
                        </p>

                        <div className="flex flex-row items-center justify-between">
                          {/* TODO: 
                                (1) MARK AS READ
                                (2) Link to account,ticket, market center
                                
                            */}
                          <Button
                            variant={"link"}
                            size={"sm"}
                            className="flex flex-row items-center gap-1  p-1"
                          >
                            <p className="text-xs">See more</p>
                          </Button>

                          <Button
                            variant={"link"}
                            size={"sm"}
                            className="flex flex-row items-center gap-1 p-1"
                            disabled={notification.read}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <p className="text-xs">Mark as Read</p>
                            <CheckCheck className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {/* variant={"link"} size={"sm"} */}
                    </div>
                  );
                })}

              {!notifications ||
                (!notifications.length && (
                  <p className="text-sm text-muted-foreground">
                    {/* No notifications found.  */}
                    Ain't nothin here
                  </p>
                ))}
            </CardContent>
          </Card>
        )}
      </SidebarMenuItem>
    </>
  );
}
