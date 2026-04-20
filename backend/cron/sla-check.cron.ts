import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import log from "encore.dev/log";
import { slaRepository, userRepository } from "../shared/repositories";
import { notificationTopic } from "../notifications/topic";
import { cronExecutions, cronErrors, caughtErrors } from "./metrics";
import type { NotificationData } from "../notifications/types";

/**
 * SLA Check Cron Job
 * Runs every 5 minutes to check for Response and Resolution SLA warnings and breaches
 */

interface SlaCheckResult {
  // Response SLA
  responseWarnings50Sent: number;
  responseWarnings75Sent: number;
  responseBreachesMarked: number;
  // Resolution SLA
  resolutionWarnings50Sent: number;
  resolutionWarnings75Sent: number;
  resolutionBreachesMarked: number;
}

async function publishSlaNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: NotificationData,
) {
  await notificationTopic.publish({
    userId,
    category: "ACTIVITY",
    type,
    inApp: { title, body },
    email: "Notifications deactivated",
    data,
    priority: "HIGH",
  });
}

export const checkSlaStatus = api({}, async (): Promise<SlaCheckResult> => {
  cronExecutions.with({ job: "sla-check" }).increment();

  const result: SlaCheckResult = {
    responseWarnings50Sent: 0,
    responseWarnings75Sent: 0,
    responseBreachesMarked: 0,
    resolutionWarnings50Sent: 0,
    resolutionWarnings75Sent: 0,
    resolutionBreachesMarked: 0,
  };

  try {
  // ==================
  // Response SLA Checks
  // ==================

  // Check for tickets needing 50% response warning
  const ticketsNeedingWarning50 = await slaRepository.findTicketsNeedingWarning50();
  for (const ticket of ticketsNeedingWarning50) {
    await slaRepository.markWarning50Sent(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'WARNING_50',
      notificationSent: true,
    });

    if (ticket.assignee_id) {
      await publishSlaNotification(
        ticket.assignee_id,
        "SLA Warning",
        `Response SLA Warning: Ticket "${ticket.title || 'Untitled'}" is at 50%`,
        `This ${ticket.urgency} urgency ticket is approaching its response SLA deadline. Please respond soon.`,
        { ticketId: ticket.id, slaEventType: 'WARNING_50', slaType: 'response', urgency: ticket.urgency },
      );
    }

    result.responseWarnings50Sent++;
  }

  // Check for tickets needing 75% response warning
  const ticketsNeedingWarning75 = await slaRepository.findTicketsNeedingWarning75();
  for (const ticket of ticketsNeedingWarning75) {
    await slaRepository.markWarning75Sent(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'WARNING_75',
      notificationSent: true,
    });

    if (ticket.assignee_id) {
      await publishSlaNotification(
        ticket.assignee_id,
        "SLA Warning",
        `Urgent Response SLA Warning: Ticket "${ticket.title || 'Untitled'}" is at 75%`,
        `This ${ticket.urgency} urgency ticket is close to breaching its response SLA. Immediate action required.`,
        { ticketId: ticket.id, slaEventType: 'WARNING_75', slaType: 'response', urgency: ticket.urgency },
      );
    }

    result.responseWarnings75Sent++;
  }

  // Check for tickets that have breached response SLA
  const ticketsBreaching = await slaRepository.findTicketsBreachingSla();
  for (const ticket of ticketsBreaching) {
    await slaRepository.markSlaBreached(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'BREACHED',
      notificationSent: true,
    });

    if (ticket.assignee_id) {
      await publishSlaNotification(
        ticket.assignee_id,
        "SLA Breach",
        `Response SLA Breached: Ticket "${ticket.title || 'Untitled'}"`,
        `This ${ticket.urgency} urgency ticket has breached its response SLA time.`,
        { ticketId: ticket.id, slaEventType: 'BREACHED', slaType: 'response', urgency: ticket.urgency },
      );
    }

    // Also notify admins about the breach
    const admins = await userRepository.findByRole('ADMIN');
    for (const admin of admins) {
      await publishSlaNotification(
        admin.id,
        "SLA Breach",
        `Response SLA Breach Alert: Ticket "${ticket.title || 'Untitled'}"`,
        `A ${ticket.urgency} urgency ticket has breached its response SLA time.`,
        { ticketId: ticket.id, slaEventType: 'BREACHED', slaType: 'response', urgency: ticket.urgency, assigneeId: ticket.assignee_id },
      );
    }

    result.responseBreachesMarked++;
  }

  // ==================
  // Resolution SLA Checks
  // ==================

  // Check for tickets needing 50% resolution warning
  const ticketsNeedingResolutionWarning50 = await slaRepository.findTicketsNeedingResolutionWarning50();
  for (const ticket of ticketsNeedingResolutionWarning50) {
    await slaRepository.markResolutionWarning50Sent(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'RESOLUTION_WARNING_50',
      notificationSent: true,
    });

    if (ticket.assignee_id) {
      await publishSlaNotification(
        ticket.assignee_id,
        "SLA Warning",
        `Resolution SLA Warning: Ticket "${ticket.title || 'Untitled'}" is at 50%`,
        `This ${ticket.urgency} urgency ticket is approaching its resolution SLA deadline. Please resolve soon.`,
        { ticketId: ticket.id, slaEventType: 'RESOLUTION_WARNING_50', slaType: 'resolution', urgency: ticket.urgency },
      );
    }

    result.resolutionWarnings50Sent++;
  }

  // Check for tickets needing 75% resolution warning
  const ticketsNeedingResolutionWarning75 = await slaRepository.findTicketsNeedingResolutionWarning75();
  for (const ticket of ticketsNeedingResolutionWarning75) {
    await slaRepository.markResolutionWarning75Sent(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'RESOLUTION_WARNING_75',
      notificationSent: true,
    });

    if (ticket.assignee_id) {
      await publishSlaNotification(
        ticket.assignee_id,
        "SLA Warning",
        `Urgent Resolution SLA Warning: Ticket "${ticket.title || 'Untitled'}" is at 75%`,
        `This ${ticket.urgency} urgency ticket is close to breaching its resolution SLA. Immediate resolution required.`,
        { ticketId: ticket.id, slaEventType: 'RESOLUTION_WARNING_75', slaType: 'resolution', urgency: ticket.urgency },
      );
    }

    result.resolutionWarnings75Sent++;
  }

  // Check for tickets that have breached resolution SLA
  const ticketsBreachingResolution = await slaRepository.findTicketsBreachingResolutionSla();
  for (const ticket of ticketsBreachingResolution) {
    await slaRepository.markResolutionSlaBreached(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'RESOLUTION_BREACHED',
      notificationSent: true,
    });

    if (ticket.assignee_id) {
      await publishSlaNotification(
        ticket.assignee_id,
        "SLA Breach",
        `Resolution SLA Breached: Ticket "${ticket.title || 'Untitled'}"`,
        `This ${ticket.urgency} urgency ticket has breached its resolution SLA time.`,
        { ticketId: ticket.id, slaEventType: 'RESOLUTION_BREACHED', slaType: 'resolution', urgency: ticket.urgency },
      );
    }

    // Also notify admins about the breach
    const admins = await userRepository.findByRole('ADMIN');
    for (const admin of admins) {
      await publishSlaNotification(
        admin.id,
        "SLA Breach",
        `Resolution SLA Breach Alert: Ticket "${ticket.title || 'Untitled'}"`,
        `A ${ticket.urgency} urgency ticket has breached its resolution SLA time.`,
        { ticketId: ticket.id, slaEventType: 'RESOLUTION_BREACHED', slaType: 'resolution', urgency: ticket.urgency, assigneeId: ticket.assignee_id },
      );
    }

    result.resolutionBreachesMarked++;
  }

  } catch (err) {
    cronErrors.with({ job: "sla-check" }).increment();
    caughtErrors.with({ source: "cron" }).increment();
    log.error("sla-check cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
});

// Run every 5 minutes
const _ = new CronJob("sla-status-check", {
  title: "Check SLA status for warnings and breaches",
  every: "5m",
  endpoint: checkSlaStatus,
});
