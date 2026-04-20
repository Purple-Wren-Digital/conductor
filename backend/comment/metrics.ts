import { Counter, CounterGroup, Gauge } from "encore.dev/metrics";

// ── Comment stream metrics ───────────────────────────────────────────

/** Currently active comment streams */
export const activeCommentStreams = new Gauge("active_comment_streams");

/** Total comment stream disconnections */
export const streamDisconnects = new Counter(
  "comment_stream_disconnects_total"
);

// ── Error tracking ───────────────────────────────────────────────────

interface ErrorLabels extends Record<string, string> {
  source: string;
}

/** Caught errors in the comment service */
export const caughtErrors = new CounterGroup<ErrorLabels>(
  "comment_caught_errors_total"
);
