"use client";

import useNotificationsSocket from "@/hooks/use-notifications-socket";

export default function NotificationsListener() {
  useNotificationsSocket();

  return null; // This component doesn’t render anything
}
