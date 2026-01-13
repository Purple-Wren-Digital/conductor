import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { marketCenterRepository, userRepository } from "../ticket/db";
import type { InvitationStatus } from "../marketCenters/types";
// DOCS: https://encore.dev/docs/ts/primitives/cron-jobs?_gl=1*9ln59d*_gcl_au*MTI2NzYyODg1MS4xNzYxODgxNjMz
// DEV/Testing:  cleanupOldNotifications.cfg.endpoint()

export const updateInvitationStatus = api({}, async (): Promise<void> => {
  const now = new Date();

  const existingInvitations =
    await marketCenterRepository.findInvitationsNeedingCorrection();
  if (!existingInvitations || !existingInvitations.length) return;

  const invitationEmails = existingInvitations.map((inv) => inv.email);
  const currentUserEmails: string[] =
    await userRepository.findExistingEmails(invitationEmails);

  for (const invitation of existingInvitations) {
    let newStatus: InvitationStatus | null = null;

    const userExists = currentUserEmails.includes(invitation.email);

    // ACCEPTED = User exists
    if (userExists && invitation.status !== "ACCEPTED") {
      newStatus = "ACCEPTED";
    }
    // PENDING = No user and expiresAt in future
    if (
      !userExists &&
      invitation.expiresAt &&
      invitation.expiresAt > now &&
      invitation.status !== "PENDING"
    ) {
      newStatus = "PENDING";
    }
    // EXPIRED = No user and past expiresAt date
    if (
      invitation.expiresAt &&
      invitation.expiresAt <= now &&
      invitation.status !== "EXPIRED"
    ) {
      newStatus = "EXPIRED";
    }

    if (!newStatus) continue;

    await marketCenterRepository.updateInvitationStatus(
      invitation.id,
      newStatus
    );

    if (invitation.marketCenterId) {
      await marketCenterRepository.createHistory({
        marketCenterId: invitation.marketCenterId,
        action: "INVITE",
        field: `${newStatus}: ${invitation.email}`,
        newValue: JSON.stringify({
          status: newStatus,
          email: invitation.email,
        }),
        previousValue: JSON.stringify({
          status: invitation.status,
          email: invitation.email,
        }),
        changedById: "SYSTEM",
      });
    }
  }
});

const _ = new CronJob("update-incorrect-invitation-status", {
  title: "Update incorrect invitation statuses",
  every: "5m",
  endpoint: updateInvitationStatus,
});
