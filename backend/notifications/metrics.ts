import { Counter, CounterGroup, Gauge } from "encore.dev/metrics";

// ── Notification delivery metrics ────────────────────────────────────

interface ChannelLabels extends Record<string, string> {
  channel: string; // "EMAIL" | "IN_APP"
}

/** Total notifications sent successfully, by channel */
export const notificationsSent = new CounterGroup<ChannelLabels>(
  "notifications_sent_total"
);

/** Total notification send failures, by channel */
export const notificationErrors = new CounterGroup<ChannelLabels>(
  "notification_errors_total"
);

// ── Email metrics ────────────────────────────────────────────────────

/** Total email send failures (Resend API errors) */
export const emailSendErrors = new Counter("email_send_errors_total");

/** Total emails sent successfully */
export const emailsSent = new Counter("emails_sent_total");

// ── Notification stream metrics ──────────────────────────────────────

/** Currently active notification streams */
export const activeNotificationStreams = new Gauge(
  "active_notification_streams"
);

/** Total notification stream disconnections */
export const streamDisconnects = new Counter(
  "notification_stream_disconnects_total"
);

// ── Error tracking ───────────────────────────────────────────────────

interface ErrorLabels extends Record<string, string> {
  source: string;
}

/** Caught errors in the notifications service */
export const caughtErrors = new CounterGroup<ErrorLabels>(
  "notification_caught_errors_total"
);
