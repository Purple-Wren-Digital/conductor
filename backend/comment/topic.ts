import { Topic, Subscription } from "encore.dev/pubsub";
import type { CommentEvent } from "./events";

// Comment event topic — decouples comment CRUD operations from stream broadcasting.
// Publishers fire-and-forget; the subscription handles pushing to active WebSocket streams.
export const commentEventTopic = new Topic<CommentEvent>("comment-events", {
  deliveryGuarantee: "at-least-once",
});

// Subscription broadcasts comment events to all active streams for the relevant ticket.
const _ = new Subscription(commentEventTopic, "comment-stream-broadcaster", {
  handler: async (event) => {
    const { broadcastCommentEvent } = await import("./stream");
    await broadcastCommentEvent(event);
  },
  maxConcurrency: 10,
  retryPolicy: {
    minBackoff: "1s",
    maxBackoff: "30s",
    maxRetries: 3,
  },
});
