import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import { Notification } from "./types";
import { activeNotificationStreams, streamDisconnects, caughtErrors } from "./metrics";

// Max time a stream can stay open. Frontend auto-reconnects on close.
const MAX_STREAM_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours

interface StreamEntry {
  stream: {
    send: (msg: Notification) => Promise<void>;
    close: () => Promise<void>;
  };
  connectedAt: number;
  // Call release() to unblock the handler and let cleanup run
  release: () => void;
}
const activeStreams = new Map<string, StreamEntry>();

// One global reaper — closes streams that exceeded max lifetime.
// Also logs stream count every cycle for monitoring.
const reaper = setInterval(() => {
  const now = Date.now();
  const count = activeStreams.size;
  if (count > 0) {
    log.info("[notif-streams] reaper tick", { activeCount: count });
  }
  for (const [clerkId, entry] of activeStreams) {
    if (now - entry.connectedAt > MAX_STREAM_LIFETIME_MS) {
      log.info("[notif-streams] releasing — max lifetime", { clerkId, ageMs: now - entry.connectedAt });
      entry.release();
    }
  }
}, 60_000);
reaper.unref();

export const notificationStream = api.streamOut<Notification>(
  {
    expose: true,
    auth: true,
    path: "/notifications/stream",
  },
  async (stream) => {
    let clerkId: string | null = null;

    try {
      const authData = await getAuthData();
      if (!authData) {
        throw APIError.unauthenticated("User not authenticated");
      }

      clerkId = authData.userID;

      // Evict existing stream for this user (duplicate tab, reconnect, etc.)
      const existing = activeStreams.get(clerkId);
      if (existing) {
        log.info("[notif-streams] releasing — duplicate connection", { clerkId });
        existing.release();
      }

      let release: () => void;
      const closed = new Promise<void>((resolve) => { release = resolve; });

      const entry: StreamEntry = { stream, connectedAt: Date.now(), release: release! };
      activeStreams.set(clerkId, entry);
      activeNotificationStreams.set(activeStreams.size);
      log.info("[notif-streams] connected", { clerkId, activeCount: activeStreams.size });

      // Block until released (send failure, duplicate eviction, reaper, or explicit disconnect)
      await closed;
      log.info("[notif-streams] released, cleaning up", { clerkId });
    } catch (error) {
      caughtErrors.with({ source: "stream" }).increment();
      throw error;
    } finally {
      if (clerkId) {
        activeStreams.delete(clerkId);
        activeNotificationStreams.set(activeStreams.size);
        streamDisconnects.increment();
        log.info("[notif-streams] cleaned up", { clerkId, activeCount: activeStreams.size });
      }
    }
  }
);

/**
 * Broadcast a notification to a specific user.
 * If the send fails (client disconnected), the stream handler is released.
 */
export async function broadcastNotification(
  clerkId: string,
  notification: Notification
): Promise<void> {
  const entry = activeStreams.get(clerkId);
  if (!entry) return;

  try {
    await entry.stream.send(notification);
  } catch (err) {
    log.info("[notif-streams] releasing — send failed", { clerkId, error: String(err) });
    entry.release();
  }
}

export function getConnectedUsers(): string[] {
  return Array.from(activeStreams.keys());
}

export async function disconnectUser(clerkId: string): Promise<void> {
  const entry = activeStreams.get(clerkId);
  if (entry) {
    try { await entry.stream.close(); } catch { /* ignore */ }
    entry.release();
  }
}
