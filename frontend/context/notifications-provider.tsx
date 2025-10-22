"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Notification } from "@/lib/types";

interface NotificationsContextValue {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
}

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  return context;
}

// WEBSOCKET NOTES:
// WebSocket connects once per user
// Notifications are available throughout the app via React Context
// Cleanup happens automatically on unmount
// Dev/Prod URLs can easily be swapped in the hook
