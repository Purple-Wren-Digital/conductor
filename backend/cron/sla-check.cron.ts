import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { slaRepository, notificationRepository, userRepository } from "../shared/repositories";

/**
 * SLA Check Cron Job
 * Runs every 5 minutes to check for SLA warnings and breaches
 */

interface SlaCheckResult {
  warnings50Sent: number;
  warnings75Sent: number;
  breachesMarked: number;
}

export const checkSlaStatus = api({}, async (): Promise<SlaCheckResult> => {
  const result: SlaCheckResult = {
    warnings50Sent: 0,
    warnings75Sent: 0,
    breachesMarked: 0,
  };

  // Check for tickets needing 50% warning
  const ticketsNeedingWarning50 = await slaRepository.findTicketsNeedingWarning50();
  for (const ticket of ticketsNeedingWarning50) {
    await slaRepository.markWarning50Sent(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'WARNING_50',
      notificationSent: true,
    });

    // Send notification to assignee (or admins if unassigned)
    const notifyUserId = ticket.assignee_id;
    if (notifyUserId) {
      await notificationRepository.create({
        userId: notifyUserId,
        channel: 'IN_APP',
        category: 'ACTIVITY',
        type: 'SLA Warning',
        title: `SLA Warning: Ticket "${ticket.title || 'Untitled'}" is at 50% of SLA time`,
        body: `This ${ticket.urgency} urgency ticket is approaching its SLA deadline. Please respond soon.`,
        data: {
          ticketId: ticket.id,
          slaEventType: 'WARNING_50',
          urgency: ticket.urgency,
        },
      });
    }

    result.warnings50Sent++;
    console.log(`SLA 50% warning sent for ticket ${ticket.id}`);
  }

  // Check for tickets needing 75% warning
  const ticketsNeedingWarning75 = await slaRepository.findTicketsNeedingWarning75();
  for (const ticket of ticketsNeedingWarning75) {
    await slaRepository.markWarning75Sent(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'WARNING_75',
      notificationSent: true,
    });

    // Send notification to assignee
    const notifyUserId = ticket.assignee_id;
    if (notifyUserId) {
      await notificationRepository.create({
        userId: notifyUserId,
        channel: 'IN_APP',
        category: 'ACTIVITY',
        type: 'SLA Warning',
        title: `Urgent SLA Warning: Ticket "${ticket.title || 'Untitled'}" is at 75% of SLA time`,
        body: `This ${ticket.urgency} urgency ticket is close to breaching its SLA. Immediate action required.`,
        data: {
          ticketId: ticket.id,
          slaEventType: 'WARNING_75',
          urgency: ticket.urgency,
        },
      });
    }

    result.warnings75Sent++;
    console.log(`SLA 75% warning sent for ticket ${ticket.id}`);
  }

  // Check for tickets that have breached SLA
  const ticketsBreaching = await slaRepository.findTicketsBreachingSla();
  for (const ticket of ticketsBreaching) {
    await slaRepository.markSlaBreached(ticket.id);
    await slaRepository.createEvent({
      ticketId: ticket.id,
      eventType: 'BREACHED',
      notificationSent: true,
    });

    // Notify assignee
    if (ticket.assignee_id) {
      await notificationRepository.create({
        userId: ticket.assignee_id,
        channel: 'IN_APP',
        category: 'ACTIVITY',
        type: 'SLA Breach',
        title: `SLA Breached: Ticket "${ticket.title || 'Untitled'}"`,
        body: `This ${ticket.urgency} urgency ticket has breached its SLA response time.`,
        data: {
          ticketId: ticket.id,
          slaEventType: 'BREACHED',
          urgency: ticket.urgency,
        },
      });
    }

    // Also notify admins about the breach
    const admins = await userRepository.findByRole('ADMIN');
    for (const admin of admins) {
      await notificationRepository.create({
        userId: admin.id,
        channel: 'IN_APP',
        category: 'ACTIVITY',
        type: 'SLA Breach',
        title: `SLA Breach Alert: Ticket "${ticket.title || 'Untitled'}"`,
        body: `A ${ticket.urgency} urgency ticket has breached its SLA response time.`,
        data: {
          ticketId: ticket.id,
          slaEventType: 'BREACHED',
          urgency: ticket.urgency,
          assigneeId: ticket.assignee_id,
        },
      });
    }

    result.breachesMarked++;
    console.log(`SLA breached for ticket ${ticket.id}`);
  }

  console.log(`SLA Check completed: ${result.warnings50Sent} 50% warnings, ${result.warnings75Sent} 75% warnings, ${result.breachesMarked} breaches`);
  return result;
});

// Run every 5 minutes
const _ = new CronJob("sla-status-check", {
  title: "Check SLA status for warnings and breaches",
  every: "5m",
  endpoint: checkSlaStatus,
});
