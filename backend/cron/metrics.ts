import { CounterGroup } from "encore.dev/metrics";

// ── Cron job metrics ─────────────────────────────────────────────────

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

// ── Error tracking ───────────────────────────────────────────────────

interface ErrorLabels extends Record<string, string> {
  source: string;
}

/** Caught errors in cron jobs */
export const caughtErrors = new CounterGroup<ErrorLabels>(
  "cron_caught_errors_total"
);
