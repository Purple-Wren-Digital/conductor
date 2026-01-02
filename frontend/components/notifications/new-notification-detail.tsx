"use client";

import { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SafeHtml } from "@/components/ui/safe-html";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { CheckCheck, X } from "lucide-react";
import type { Notification } from "@/lib/types";
import { UseMutationResult } from "@tanstack/react-query";

export default function SideBarNewNotification({
  newestNotification,
  setNewestNotification,
  markAsReadMutation,
}: {
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
              <CardTitle>
                {newestNotification?.title && (
                  <SafeHtml
                    content={newestNotification.title}
                    className="text-sm"
                  />
                )}
              </CardTitle>
              {newestNotification?.createdAt && (
                <CardDescription className="text-xs">
                  {new Date(newestNotification.createdAt).toLocaleString()}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-1 space-y-2">
            {newestNotification?.body && (
              <SafeHtml
                content={newestNotification.body}
                className="text-sm line-clamp-10 font-medium"
              />
            )}

            <div className="flex flex-row flex-wrap items-center justify-between gap-1">
              <Button
                variant={"outline"}
                size={"sm"}
                className="flex flex-row items-center gap-1 p-1"
                onClick={(e) => {
                  e.preventDefault();
                  setNewestNotification(null);
                }}
              >
                <p className="text-xs">Dismiss</p>
                <X className="w-3 h-3" />
              </Button>
              <Button
                variant={"outline"}
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
