import { api, APIError } from "encore.dev/api";
import { CommentEvent, commentEventBus } from "./events";
import { getUserContext } from "../auth/user-context";
import { ticketRepository } from "../ticket/db";
import { canAccessTicket } from "../auth/permissions";

// Define handshake type to specify which ticket to subscribe to
interface CommentStreamHandshake {
  ticketId: string;
}

// Wrapper interface for comment events to satisfy Encore's type requirements
interface CommentStreamMessage {
  event: CommentEvent;
}

// Store active streams by ticketId
// Each ticketId maps to a Map of userId -> stream entry
interface StreamEntry {
  stream: { send: (msg: CommentStreamMessage) => Promise<void>; close: () => Promise<void> };
  active: boolean;
}
const activeStreams = new Map<string, Map<string, StreamEntry>>();

/**
 * Streaming endpoint for real-time comment events
 * Clients connect to this endpoint to receive live comment updates for a specific ticket
 */
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
      // Get authenticated user data
      const userContext = await getUserContext();
      if (!userContext) {
        throw APIError.unauthenticated("User not authenticated");
      }

      // Verify user has access to this ticket
      const ticket = await ticketRepository.findById(ticketId);

      if (!ticket) {
        throw APIError.notFound("Ticket not found");
      }

      // Check permissions (user can see ticket if they created it, are assigned to it, or are STAFF/ADMIN)
      const hasAccess = await canAccessTicket(userContext, ticketId);

      if (!hasAccess) {
        throw APIError.permissionDenied("You don't have access to this ticket");
      }

      userId = userContext.userId;

      // Initialize ticket stream map if it doesn't exist
      if (!activeStreams.has(ticketId)) {
        activeStreams.set(ticketId, new Map());
      }

      // Store the stream for this user and ticket
      const ticketStreams = activeStreams.get(ticketId)!;
      ticketStreams.set(userId, { stream, active: true });

      // Set up event handler for this stream
      const eventHandler = async (event: CommentEvent) => {
        // Only send events for the subscribed ticket
        if (event.ticketId === ticketId) {
          const entry = ticketStreams.get(userId!);
          if (entry && entry.active) {
            try {
              await entry.stream.send({ event });
            } catch {
              entry.active = false;
              ticketStreams.delete(userId!);
              if (ticketStreams.size === 0) {
                activeStreams.delete(ticketId);
              }
            }
          }
        }
      };

      // Subscribe to all comment event types for this ticket
      commentEventBus.subscribe("comment.created", eventHandler);
      commentEventBus.subscribe("comment.updated", eventHandler);
      commentEventBus.subscribe("comment.deleted", eventHandler);

      // Keep the stream alive by periodically checking if it's still active
      while (ticketStreams.get(userId)?.active) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      throw error;
    } finally {
      // Cleanup when stream ends
      if (userId && ticketId) {
        const ticketStreams = activeStreams.get(ticketId);
        if (ticketStreams) {
          ticketStreams.delete(userId);
          if (ticketStreams.size === 0) {
            activeStreams.delete(ticketId);
          }
        }
      }
    }
  }
);

/**
 * Broadcast a comment event to all users watching a specific ticket
 * This is called internally when comments are created/updated/deleted
 */
export async function broadcastCommentEvent(
  event: CommentEvent
): Promise<void> {
  const ticketStreams = activeStreams.get(event.ticketId);

  if (!ticketStreams || ticketStreams.size === 0) {
    return;
  }

  // Broadcast to all users watching this ticket
  const broadcastPromises = Array.from(ticketStreams.entries()).map(
    async ([userId, entry]) => {
      if (entry.active) {
        try {
          await entry.stream.send({ event });
        } catch {
          entry.active = false;
          ticketStreams.delete(userId);
        }
      }
    }
  );

  await Promise.all(broadcastPromises);

  // Clean up if no streams left for this ticket
  if (ticketStreams.size === 0) {
    activeStreams.delete(event.ticketId);
  }
}

/**
 * Get list of users currently watching a specific ticket
 * Useful for debugging and monitoring
 */
export function getTicketWatchers(ticketId: string): string[] {
  const ticketStreams = activeStreams.get(ticketId);
  if (!ticketStreams) return [];
  return Array.from(ticketStreams.keys());
}

/**
 * Get all active comment streams
 * Returns a map of ticketId to array of userIds
 */
export function getAllActiveStreams(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [ticketId, userMap] of activeStreams.entries()) {
    result[ticketId] = Array.from(userMap.keys());
  }
  return result;
}
