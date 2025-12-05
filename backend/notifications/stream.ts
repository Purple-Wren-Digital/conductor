import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Notification } from "./types";
import { mygw } from "../auth/auth";

// Store active streams for broadcasting
// Map key is clerkId, value is the stream instance
const activeStreams = new Map<string, api.StreamOut<Notification>>();

/**
 * Streaming endpoint for real-time notifications
 * Clients connect to this endpoint to receive live notifications
 */
export const notificationStream = api.streamOut<Notification>(
  {
    expose: true,
    auth: true,
    path: "/notifications/stream",
    method: "GET",
  },
  async (stream) => {
    try {
      // Get authenticated user data
      const authData = await getAuthData();
      if (!authData) {
        throw APIError.unauthenticated("User not authenticated");
      }

      const clerkId = authData.userID;
      console.log(`📡 Notification stream connected: ${clerkId}`);

      // Store the stream for broadcasting
      activeStreams.set(clerkId, stream);

      // Keep the stream alive until client disconnects
      // We'll send notifications as they come in via the broadcast function
      await new Promise<void>((resolve, reject) => {
        // Handle stream closure
        stream.on("close", () => {
          activeStreams.delete(clerkId);
          console.log(`❌ Notification stream disconnected: ${clerkId}`);
          resolve();
        });

        // Handle stream errors
        stream.on("error", (error) => {
          activeStreams.delete(clerkId);
          console.error(`⚠️ Notification stream error for ${clerkId}:`, error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Notification stream error:", error);
      throw error;
    }
  }
);

/**
 * Broadcast a notification to a specific user
 * This replaces the WebSocket broadcastNotification function
 */
export async function broadcastNotification(
  clerkId: string,
  notification: Notification
): Promise<void> {
  const stream = activeStreams.get(clerkId);

  if (stream) {
    try {
      await stream.send(notification);
      console.log(`✅ Notification sent to ${clerkId}`);
    } catch (error) {
      // Stream might be closed or errored
      console.warn(`⚠️ Failed to send notification to ${clerkId}:`, error);
      activeStreams.delete(clerkId);
    }
  } else {
    console.warn(`⚠️ User ${clerkId} not connected to notification stream`);
  }
}

/**
 * Get list of currently connected users
 * Useful for debugging and monitoring
 */
export function getConnectedUsers(): string[] {
  return Array.from(activeStreams.keys());
}

/**
 * Disconnect a specific user's stream
 * Useful for forcing reconnection or cleanup
 */
export function disconnectUser(clerkId: string): void {
  const stream = activeStreams.get(clerkId);
  if (stream) {
    stream.close();
    activeStreams.delete(clerkId);
    console.log(`🔌 Forcefully disconnected user: ${clerkId}`);
  }
}
