import { api, APIError } from "encore.dev/api";
// import { getAuthData } from "~encore/auth";
import { CommentEvent, commentEventBus } from "./events";
// import { mygw } from "../auth/auth";
import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
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
// Each ticketId maps to a Map of userId -> stream
const activeStreams = new Map<
  string,
  Map<string, api.StreamOut<CommentStreamHandshake, CommentStreamMessage>>
>();

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
    method: "GET",
  },
  async ({ ticketId }, stream) => {
    try {
      // Get authenticated user data
      const userContext = await getUserContext();
      if (!userContext) {
        throw APIError.unauthenticated("User not authenticated");
      }

      // Verify user has access to this ticket
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw APIError.notFound("Ticket not found");
      }

      // Check permissions (user can see ticket if they created it, are assigned to it, or are STAFF/ADMIN)
      const hasAccess = await canAccessTicket(userContext, ticketId);

      if (!hasAccess) {
        throw APIError.permissionDenied("You don't have access to this ticket");
      }

      const userId = userContext.userId;
      console.log(
        `💬 Comment stream connected: User ${userId} for ticket ${ticketId}`
      );

      // Initialize ticket stream map if it doesn't exist
      if (!activeStreams.has(ticketId)) {
        activeStreams.set(ticketId, new Map());
      }

      // Store the stream for this user and ticket
      const ticketStreams = activeStreams.get(ticketId)!;
      ticketStreams.set(userId, stream);

      // Set up event handler for this stream
      const eventHandler = async (event: CommentEvent) => {
        // Only send events for the subscribed ticket
        if (event.ticketId === ticketId) {
          try {
            await stream.send({ event });
            console.log(
              `✅ Comment event sent to user ${userId} for ticket ${ticketId}: ${event.type}`
            );
          } catch (error) {
            console.warn(
              `⚠️ Failed to send comment event to user ${userId}:`,
              error
            );
            ticketStreams.delete(userId);
            if (ticketStreams.size === 0) {
              activeStreams.delete(ticketId);
            }
          }
        }
      };

      // Subscribe to all comment event types for this ticket
      commentEventBus.subscribe("comment.created", eventHandler);
      commentEventBus.subscribe("comment.updated", eventHandler);
      commentEventBus.subscribe("comment.deleted", eventHandler);

      // Keep the stream alive until client disconnects
      await new Promise<void>((resolve, reject) => {
        // Handle stream closure
        stream.on("close", () => {
          ticketStreams.delete(userId);
          if (ticketStreams.size === 0) {
            activeStreams.delete(ticketId);
          }
          console.log(
            `❌ Comment stream disconnected: User ${userId} for ticket ${ticketId}`
          );

          // Note: We're not unsubscribing from the event bus here because
          // the same handler might be used by multiple streams
          // The event bus is in-memory and handlers will be garbage collected
          // when the service restarts
          resolve();
        });

        // Handle stream errors
        stream.on("error", (error) => {
          ticketStreams.delete(userId);
          if (ticketStreams.size === 0) {
            activeStreams.delete(ticketId);
          }
          console.error(
            `⚠️ Comment stream error for user ${userId} on ticket ${ticketId}:`,
            error
          );
          reject(error);
        });
      });
    } catch (error) {
      console.error("Comment stream error:", error);
      throw error;
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
    console.log(`No active streams for ticket ${event.ticketId}`);
    return;
  }

  // Broadcast to all users watching this ticket
  const broadcastPromises = Array.from(ticketStreams.entries()).map(
    async ([userId, stream]) => {
      try {
        await stream.send({ event });
        console.log(
          `✅ Comment event broadcast to user ${userId}: ${event.type}`
        );
      } catch (error) {
        console.warn(
          `⚠️ Failed to broadcast comment event to user ${userId}:`,
          error
        );
        ticketStreams.delete(userId);
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
