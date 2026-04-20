import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import log from "encore.dev/log";
import { db } from "../ticket/db";
import { cronExecutions, cronErrors, caughtErrors } from "../shared/metrics";
// DOCS: https://encore.dev/docs/ts/primitives/cron-jobs?_gl=1*9ln59d*_gcl_au*MTI2NzYyODg1MS4xNzYxODgxNjMz
// DEV/Testing:  cleanupOldNotifications.cfg.endpoint()

export const cleanupNotifications = api({}, async () => {
  cronExecutions.with({ job: "cleanup" }).increment();

  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await db.exec`
      DELETE FROM notifications
      WHERE read = true
        AND created_at <= ${tenDaysAgo}
    `;
  } catch (err) {
    cronErrors.with({ job: "cleanup" }).increment();
    caughtErrors.with({ source: "cron" }).increment();
    log.error("cleanup cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

const _ = new CronJob("cleanup-old-notifications", {
  title: "Cleanup old read notifications",
  every: "24h",
  endpoint: cleanupNotifications,
});
