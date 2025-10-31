import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { prisma } from "../ticket/db";
// DOCS: https://encore.dev/docs/ts/primitives/cron-jobs?_gl=1*9ln59d*_gcl_au*MTI2NzYyODg1MS4xNzYxODgxNjMz
// DEV/Testing:  cleanupOldNotifications.cfg.endpoint()

export const cleanupNotifications = api({}, async () => {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lte: tenDaysAgo },
    },
  });
});

const _ = new CronJob("cleanup-old-notifications", {
  title: "Cleanup old read notifications",
  every: "24h", // Daily Max
  endpoint: cleanupNotifications,
});
