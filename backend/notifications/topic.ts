import { Topic, Subscription } from "encore.dev/pubsub";
import type { CreateNotificationRequest } from "./create";

// Notification topic — decouples notification delivery from request lifecycle.
// Publishers (API endpoints, cron jobs) fire-and-forget; the subscription
// handles DB writes, email sends, and in-app broadcasts with fault isolation.
export const notificationTopic = new Topic<CreateNotificationRequest>(
  "notification-events",
  {
    deliveryGuarantee: "at-least-once",
  }
);

// Processes notifications asynchronously with retries and concurrency control.
const _ = new Subscription(notificationTopic, "notification-processor", {
  handler: async (msg) => {
    // Dynamic import avoids circular dependency with create.ts
    const { sendNotification } = await import("./create");
    await sendNotification(msg);
  },
  maxConcurrency: 5,
  retryPolicy: {
    minBackoff: "1s",
    maxBackoff: "1m",
    maxRetries: 3,
  },
  ackDeadline: "30s",
});
