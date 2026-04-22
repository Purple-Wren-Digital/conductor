import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import log from "encore.dev/log";
import { db } from "../ticket/db";

/**
 * DB keepalive — prevents AWS NAT Gateway from dropping idle TCP connections
 * to RDS (~350s idle timeout). Runs every 4 minutes via Encore cron.
 */
export const dbHeartbeat = api({}, async () => {
  const start = Date.now();
  try {
    await db.queryRow`SELECT 1 as heartbeat`;
    const ms = Date.now() - start;
    if (ms > 1000) {
      log.warn("[db-heartbeat] slow", { durationMs: ms });
    }
  } catch (err) {
    log.error("[db-heartbeat] failed", {
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    });
    throw err;
  }
});

const _ = new CronJob("db-heartbeat", {
  title: "DB connection keepalive",
  every: "4m",
  endpoint: dbHeartbeat,
});
