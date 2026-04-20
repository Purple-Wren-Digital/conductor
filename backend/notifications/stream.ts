import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import { Notification } from "./types";
import { activeNotificationStreams, streamDisconnects, caughtErrors } from "./metrics";

// Store active streams for broadcasting
// Map key is clerkId, value is the stream instance and a flag to indicate if it's active
interface StreamEntry {
  stream: {
    send: (msg: Notification) => Promise<void>;
    close: () => Promise<void>;
  };
  active: boolean;
}
const activeStreams = new Map<string, StreamEntry>();

/**
 * Streaming endpoint for real-time notifications
 * Clients connect to this endpoint to receive live notifications
 */
export const notificationStream = api.streamOut<Notification>(
  {
    expose: true,
    auth: true,
    path: "/notifications/stream",
  },
  async (stream) => {
    let clerkId: string | null = null;

    try {
      // Get authenticated user data
      const authData = await getAuthData();
      if (!authData) {
        throw APIError.unauthenticated("User not authenticated");
      }

      clerkId = authData.userID;

      // Store the stream for broadcasting
      activeStreams.set(clerkId, { stream, active: true });
      activeNotificationStreams.set(activeStreams.size);

      // Keep the stream alive by periodically checking if it's still active
      // The stream will automatically close when the client disconnects
      while (activeStreams.get(clerkId)?.active) {
        // Wait for a short period before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      caughtErrors.with({ source: "stream" }).increment();
      throw error;
    } finally {
      // Cleanup when stream ends
      if (clerkId) {
        activeStreams.delete(clerkId);
        activeNotificationStreams.set(activeStreams.size);
        streamDisconnects.increment();
      }
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
  const entry = activeStreams.get(clerkId);

  if (entry && entry.active) {
    try {
      await entry.stream.send(notification);
    } catch {
      // Stream might be closed or errored
      entry.active = false;
      activeStreams.delete(clerkId);
    }
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
export async function disconnectUser(clerkId: string): Promise<void> {
  const entry = activeStreams.get(clerkId);
  if (entry) {
    entry.active = false;
    try {
      await entry.stream.close();
    } catch {
      // Ignore close errors
    }
    activeStreams.delete(clerkId);
  }
}
