import { useEffect } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useNotifications } from "../context/notifications-provider";
import type { Notification } from "@/lib/types";

const getAuth0AccessToken = async () => {
  if (process.env.NODE_ENV === "development") return "local";
  return await getAccessToken();
};

export default async function useNotificationsSocket() {
  const { addNotification } = useNotifications();

  const token = await getAuth0AccessToken();

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`ws://localhost:8081?&token=${token}`); // TODO: Prod = wss://<URL>

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onmessage = (e) => {
      try {
        const notification: Notification = JSON.parse(e.data);
        console.log("📩 Incoming notification:", notification);
        addNotification(notification);
      } catch (err) {
        console.error("Failed to parse notification", err);
      }
    };
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("❌ WebSocket closed");

    return () => ws.close();
  }, [token, addNotification]);
}
