import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { db, marketCenterRepository } from "../ticket/db";
import { TeamInvitation } from "../marketCenters/types";
// DOCS: https://encore.dev/docs/ts/primitives/cron-jobs?_gl=1*9ln59d*_gcl_au*MTI2NzYyODg1MS4xNzYxODgxNjMz
// DEV/Testing:  cleanupOldNotifications.cfg.endpoint()

export const markInvitationExpired = api({}, async (): Promise<void> => {
  const expiredInvitations =
    await marketCenterRepository.findExpiredInvitations();

  for (const invitation of expiredInvitations) {
    // Mark invitation as expired
    await marketCenterRepository.updateInvitationStatus(
      invitation.id,
      "EXPIRED"
    );

    // Log the expiration in history
    if (invitation.marketCenterId) {
      await marketCenterRepository.createHistory({
        marketCenterId: invitation.marketCenterId,
        action: "INVITE",
        field: `expired: ${invitation.email}`,
        newValue: JSON.stringify({
          status: "EXPIRED",
          email: invitation.email,
        }),
        previousValue: JSON.stringify({
          status: invitation.status,
          email: invitation.email,
        }),
        changedById: "SYSTEM", // System action
      });
    }
  }
});

const _ = new CronJob("mark-invitation-expired", {
  title: "Mark invitation as expired based on expiration date",
  every: "4h",
  endpoint: markInvitationExpired,
});
