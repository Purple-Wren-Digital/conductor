/**
 * Custom application metrics for observability via Encore dashboard.
 *
 * View these at: https://app.encore.dev → your app → Metrics
 *
 * All metrics use Encore's built-in metrics library which automatically
 * exports to the platform without additional configuration.
 */

import { Counter, CounterGroup, Gauge } from "encore.dev/metrics";

// ── Notification metrics ──────────────────────────────────────────────

interface NotificationLabels extends Record<string, string> {
  channel: string; // "EMAIL" | "IN_APP"
}

/** Total notifications sent successfully, by channel */
export const notificationsSent = new CounterGroup<NotificationLabels>(
  "notifications_sent_total"
);

/** Total notification send failures, by channel */
export const notificationErrors = new CounterGroup<NotificationLabels>(
  "notification_errors_total"
);

// ── Email metrics ─────────────────────────────────────────────────────

/** Total email send failures (Resend API errors) */
export const emailSendErrors = new Counter("email_send_errors_total");

/** Total emails sent successfully */
export const emailsSent = new Counter("emails_sent_total");

// ── Cron job metrics ──────────────────────────────────────────────────

interface CronLabels extends Record<string, string> {
  job: string; // "sla-check" | "cleanup" | "update-invite"
}

/** Total cron job executions, by job name */
export const cronExecutions = new CounterGroup<CronLabels>(
  "cron_executions_total"
);

/** Total cron job failures, by job name */
export const cronErrors = new CounterGroup<CronLabels>(
  "cron_errors_total"
);

// ── Stream metrics ────────────────────────────────────────────────────

/** Currently active notification streams */
export const activeNotificationStreams = new Gauge(
  "active_notification_streams"
);

/** Currently active comment streams */
export const activeCommentStreams = new Gauge(
  "active_comment_streams"
);

/** Total stream disconnections */
export const streamDisconnects = new Counter("stream_disconnects_total");

// ── Unhandled error metrics ───────────────────────────────────────────

interface ErrorLabels extends Record<string, string> {
  source: string; // "notification" | "cron" | "stream" | "webhook"
}

/** Errors that would have previously crashed the process */
export const caughtErrors = new CounterGroup<ErrorLabels>(
  "caught_errors_total"
);
