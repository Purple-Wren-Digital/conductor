import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import type { CommentEvent } from "./events";
import { getUserContext } from "../auth/user-context";
import { ticketRepository } from "../ticket/db";
import { canAccessTicket } from "../auth/permissions";
import { activeCommentStreams, streamDisconnects, caughtErrors } from "./metrics";

// Max time a stream can stay open. Frontend auto-reconnects on close.
const MAX_STREAM_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CommentStreamHandshake {
  ticketId: string;
}

interface CommentStreamMessage {
  event: CommentEvent;
}

interface StreamEntry {
  stream: { send: (msg: CommentStreamMessage) => Promise<void>; close: () => Promise<void> };
  connectedAt: number;
  release: () => void;
}

// ticketId → (userId → StreamEntry)
const activeStreams = new Map<string, Map<string, StreamEntry>>();

function totalStreamCount(): number {
  let count = 0;
  for (const m of activeStreams.values()) count += m.size;
  return count;
}

// One global reaper for all comment streams
const reaper = setInterval(() => {
  const now = Date.now();
  const count = totalStreamCount();
  if (count > 0) {
    log.info("[comment-streams] reaper tick", { activeCount: count });
  }
  for (const [ticketId, ticketStreams] of activeStreams) {
    for (const [userId, entry] of ticketStreams) {
      if (now - entry.connectedAt > MAX_STREAM_LIFETIME_MS) {
        log.info("[comment-streams] releasing — max lifetime", { ticketId, userId, ageMs: now - entry.connectedAt });
        entry.release();
      }
    }
  }
}, 60_000);
reaper.unref();

export const commentStream = api.streamOut<
  CommentStreamHandshake,
  CommentStreamMessage
>(
  {
    expose: true,
    auth: true,
    path: "/comments/stream/:ticketId",
  },
  async ({ ticketId }, stream) => {
    let userId: string | null = null;

    try {
      const userContext = await getUserContext();
      if (!userContext) {
        throw APIError.unauthenticated("User not authenticated");
      }

      const ticket = await ticketRepository.findById(ticketId);
      if (!ticket) {
        throw APIError.notFound("Ticket not found");
      }

      const hasAccess = await canAccessTicket(userContext, ticketId);
      if (!hasAccess) {
        throw APIError.permissionDenied("You don't have access to this ticket");
      }

      userId = userContext.userId;

      if (!activeStreams.has(ticketId)) {
        activeStreams.set(ticketId, new Map());
      }
      const ticketStreams = activeStreams.get(ticketId)!;

      // Evict existing stream for this user on this ticket
      const existing = ticketStreams.get(userId);
      if (existing) {
        log.info("[comment-streams] releasing — duplicate connection", { ticketId, userId });
        existing.release();
      }

      let release: () => void;
      const closed = new Promise<void>((resolve) => { release = resolve; });

      const entry: StreamEntry = { stream, connectedAt: Date.now(), release: release! };
      ticketStreams.set(userId, entry);
      activeCommentStreams.set(totalStreamCount());
      log.info("[comment-streams] connected", { ticketId, userId, activeCount: totalStreamCount() });

      // Block until released (send failure, duplicate eviction, reaper, or explicit disconnect)
      await closed;
      log.info("[comment-streams] released, cleaning up", { ticketId, userId });
    } catch (error) {
      caughtErrors.with({ source: "stream" }).increment();
      throw error;
    } finally {
      streamDisconnects.increment();

      if (userId && ticketId) {
        const ticketStreams = activeStreams.get(ticketId);
        if (ticketStreams) {
          ticketStreams.delete(userId);
          if (ticketStreams.size === 0) {
            activeStreams.delete(ticketId);
          }
        }
        activeCommentStreams.set(totalStreamCount());
        log.info("[comment-streams] cleaned up", { ticketId, userId, activeCount: totalStreamCount() });
      }
    }
  }
);

/**
 * Broadcast a comment event to all users watching a ticket.
 * Send failures release the dead stream handler immediately.
 */
export async function broadcastCommentEvent(
  event: CommentEvent
): Promise<void> {
  const ticketStreams = activeStreams.get(event.ticketId);
  if (!ticketStreams || ticketStreams.size === 0) return;

  const promises = Array.from(ticketStreams.entries()).map(
    async ([, entry]) => {
      try {
        await entry.stream.send({ event });
      } catch (err) {
        log.info("[comment-streams] releasing — send failed", { ticketId: event.ticketId, error: String(err) });
        entry.release();
      }
    }
  );

  await Promise.allSettled(promises);
}

export function getTicketWatchers(ticketId: string): string[] {
  const ticketStreams = activeStreams.get(ticketId);
  if (!ticketStreams) return [];
  return Array.from(ticketStreams.keys());
}

export function getAllActiveStreams(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [ticketId, userMap] of activeStreams.entries()) {
    result[ticketId] = Array.from(userMap.keys());
  }
  return result;
}
