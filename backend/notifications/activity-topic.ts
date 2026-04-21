import { Topic, Subscription } from "encore.dev/pubsub";
import type { ActivityEvent } from "./activity-events";

export const activityTopic = new Topic<ActivityEvent>("activity-events", {
  deliveryGuarantee: "at-least-once",
});

const _ = new Subscription(activityTopic, "activity-notifier", {
  handler: async (event) => {
    const { resolveAndNotify } = await import("./activity-handlers");
    await resolveAndNotify(event);
  },
  maxConcurrency: 5,
  retryPolicy: {
    minBackoff: "1s",
    maxBackoff: "1m",
    maxRetries: 3,
  },
  ackDeadline: "30s",
});
