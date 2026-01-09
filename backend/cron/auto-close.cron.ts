import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { db } from "../ticket/db";
import {
  ticketRepository,
  marketCenterRepository,
  notificationRepository,
} from "../shared/repositories";
import type { MarketCenterSettings } from "../settings/types";

/**
 * Auto-Close Cron Job
 * Runs every 6 hours to check for tickets in AWAITING_RESPONSE status
 * that should be auto-closed based on market center settings.
 */

const DEFAULT_AUTO_CLOSE_DAYS = 2;
const SYSTEM_USER_ID = "SYSTEM";

interface AutoCloseResult {
  ticketsChecked: number;
  ticketsClosed: number;
  errors: number;
}

interface AwaitingTicketRow {
  id: string;
  title: string | null;
  creator_id: string;
  assignee_id: string | null;
  category_id: string | null;
  market_center_id: string | null;
  status_changed_at: Date | null;
}

/**
 * Calculate business days between two dates (excludes weekends)
 */
function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Find tickets in AWAITING_RESPONSE status with their status change timestamp
 * and associated market center
 */
async function findAwaitingResponseTickets(): Promise<AwaitingTicketRow[]> {
  // Get tickets in AWAITING_RESPONSE status with the timestamp of when they entered this status
  const rows = await db.rawQueryAll<AwaitingTicketRow>(
    `
    SELECT
      t.id,
      t.title,
      t.creator_id,
      t.assignee_id,
      t.category_id,
      tc.market_center_id,
      (
        SELECT th.changed_at
        FROM ticket_history th
        WHERE th.ticket_id = t.id
          AND th.field = 'status'
          AND th.new_value = 'AWAITING_RESPONSE'
        ORDER BY th.changed_at DESC
        LIMIT 1
      ) as status_changed_at
    FROM tickets t
    LEFT JOIN ticket_categories tc ON t.category_id = tc.id
    WHERE t.status = 'AWAITING_RESPONSE'
  `
  );

  return rows;
}

/**
 * Main auto-close check endpoint
 */
export const checkAutoClose = api({}, async (): Promise<AutoCloseResult> => {
  const result: AutoCloseResult = {
    ticketsChecked: 0,
    ticketsClosed: 0,
    errors: 0,
  };

  const now = new Date();

  // Get all tickets in AWAITING_RESPONSE status
  const awaitingTickets = await findAwaitingResponseTickets();
  result.ticketsChecked = awaitingTickets.length;

  // Cache market center settings to avoid repeated lookups
  const marketCenterSettingsCache: Map<
    string,
    { enabled: boolean; days: number }
  > = new Map();

  for (const ticket of awaitingTickets) {
    try {
      // Skip if no market center or no status change timestamp
      if (!ticket.market_center_id) {
        continue;
      }

      // Get market center settings (with caching)
      let autoCloseConfig = marketCenterSettingsCache.get(
        ticket.market_center_id
      );

      if (!autoCloseConfig) {
        const marketCenter = await marketCenterRepository.findById(
          ticket.market_center_id
        );
        const settings = marketCenter?.settings as
          | MarketCenterSettings
          | undefined;

        autoCloseConfig = {
          enabled: settings?.autoClose?.enabled ?? true,
          days:
            settings?.autoClose?.awaitingResponseDays ??
            DEFAULT_AUTO_CLOSE_DAYS,
        };

        marketCenterSettingsCache.set(ticket.market_center_id, autoCloseConfig);
      }

      // Skip if auto-close is disabled for this market center
      if (!autoCloseConfig.enabled) {
        continue;
      }

      // Determine when the ticket entered AWAITING_RESPONSE status
      // If no history found, use updated_at as fallback
      let statusChangedAt = ticket.status_changed_at;
      if (!statusChangedAt) {
        // Fallback: get the ticket's updated_at
        const fullTicket = await ticketRepository.findById(ticket.id);
        statusChangedAt = fullTicket?.updatedAt ?? null;
      }

      if (!statusChangedAt) {
        continue;
      }

      // Calculate business days since status change
      const businessDays = getBusinessDaysBetween(statusChangedAt, now);

      // Check if threshold exceeded
      if (businessDays >= autoCloseConfig.days) {
        // Auto-close the ticket
        await ticketRepository.update(ticket.id, {
          status: "RESOLVED",
          resolvedAt: now,
        });

        // Create history entry for auto-close
        await ticketRepository.createHistory({
          ticketId: ticket.id,
          action: "AUTOCLOSE",
          field: "ticket",
          previousValue: "AWAITING_RESPONSE",
          newValue: "RESOLVED",
          changedById: SYSTEM_USER_ID,
        });

        // Send notification to ticket creator
        if (ticket.creator_id) {
          await notificationRepository.create({
            userId: ticket.creator_id,
            channel: "IN_APP",
            category: "ACTIVITY",
            type: "Ticket Updated",
            title: `Ticket "${ticket.title || "Untitled"}" has been auto-closed`,
            body: `This ticket was automatically closed after ${autoCloseConfig.days} business days without a response.`,
            data: {
              ticketId: ticket.id,
            },
          });
        }

        // Notify assignee if different from creator
        if (ticket.assignee_id && ticket.assignee_id !== ticket.creator_id) {
          await notificationRepository.create({
            userId: ticket.assignee_id,
            channel: "IN_APP",
            category: "ACTIVITY",
            type: "Ticket Updated",
            title: `Ticket "${ticket.title || "Untitled"}" has been auto-closed`,
            body: `This ticket was automatically closed after ${autoCloseConfig.days} business days without a response.`,
            data: {
              ticketId: ticket.id,
            },
          });
        }

        result.ticketsClosed++;
      }
    } catch (error) {
      console.error(
        `Error processing ticket ${ticket.id} for auto-close:`,
        error
      );
      result.errors++;
    }
  }

  console.log(
    `Auto-close check complete: ${result.ticketsClosed}/${result.ticketsChecked} tickets closed, ${result.errors} errors`
  );

  return result;
});

// Run every 6 hours
const _ = new CronJob("auto-close-awaiting-tickets", {
  title: "Auto-close tickets in Awaiting Response status",
  every: "6h",
  endpoint: checkAutoClose,
});
