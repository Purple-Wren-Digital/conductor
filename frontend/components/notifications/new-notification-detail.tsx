"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Bell, CheckCheck, X } from "lucide-react";
import type { Notification } from "@/lib/types";
import { UseMutationResult } from "@tanstack/react-query";

export default function SideBarNewNotification({
  disabled,
  unReadNotificationTotal,
  newestNotification,
  setNewestNotification,
  markAsReadMutation,
}: {
  disabled: boolean;
  unReadNotificationTotal: number;
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
}) {
  return (
    <SidebarMenuItem>
      {newestNotification && (
        <Card className="p-2.5 gap-2 mt-5">
          <CardHeader className="p-0 m-0 flex flex-row flex-wrap justify-between text-md">
            <div className="flex flex-col px-1 pt-1">
              <CardTitle className="text-sm">
                {newestNotification?.title}
              </CardTitle>
              {newestNotification?.createdAt && (
                <CardDescription className="text-xs">
                  {new Date(newestNotification.createdAt).toLocaleString()}
                </CardDescription>
              )}
            </div>
            <Button
              variant={"ghost"}
              size={"icon"}
              className="p-1 mt-[-4]"
              onClick={() => setNewestNotification(null)}
              aria-label="Dismiss new notification"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-1 space-y-2">
            {newestNotification?.body && (
              <p className="text-sm line-clamp-10 font-medium">
                {newestNotification?.body}
              </p>
            )}

            <div className="flex flex-row flex-wrap items-center gap-3">
              <Button
                variant={"link"}
                size={"sm"}
                className="flex flex-row items-center gap-1 p-1"
                onClick={() => setNewestNotification(null)}
              >
                <p className="text-xs">Dismiss</p>
              </Button>
              <Button
                variant={"link"}
                size={"sm"}
                className="flex flex-row items-center gap-1 p-1"
                disabled={newestNotification?.read}
                onClick={(e) => {
                  e.preventDefault();

                  markAsReadMutation.mutate({
                    userId: newestNotification?.userId,
                    notificationId: newestNotification?.id,
                  });
                }}
              >
                <p className="text-xs decor">Mark as Read</p>
                <CheckCheck className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </SidebarMenuItem>
  );
}
