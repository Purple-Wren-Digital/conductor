import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import log from "encore.dev/log";
import { db } from "../ticket/db";
import {
  ticketRepository,
  marketCenterRepository,
  surveyRepository,
} from "../shared/repositories";
import type { MarketCenterSettings } from "../settings/types";
import { activityTopic } from "../notifications/activity-topic";
import { cronExecutions, cronErrors, caughtErrors } from "./metrics";

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
  created_at: Date;
  creator_id: string;
  creator_role: string | null;
  assignee_id: string | null;
  category_id: string | null;
  market_center_id: string | null;
  status_changed_at: Date | null;
}

/**
 * Calculate business days between two dates (excludes weekends)
 */
function getBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endMidnight = new Date(end);
  endMidnight.setHours(0, 0, 0, 0);

  while (current < endMidnight) {
    const dayOfWeek = current.getDay();
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
  // Get tickets in AWAITING_RESPONSE status
  // with the timestamp of when they entered this status from ticket_history
  const rows = await db.rawQueryAll<AwaitingTicketRow>(
    `
    SELECT
      t.id,
      t.title,
      t.created_at,
      t.creator_id,
      u.role as creator_role,
      t.assignee_id,
      t.category_id,
      COALESCE(tc.market_center_id, u.market_center_id) AS market_center_id,
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
    LEFT JOIN users u ON t.creator_id = u.id
    WHERE t.status = 'AWAITING_RESPONSE'
  `
  );

  return rows;
}

/**
 * Main auto-close check endpoint
 */
export const checkAutoClose = api({}, async (): Promise<AutoCloseResult> => {
  cronExecutions.with({ job: "auto-close" }).increment();

  const result: AutoCloseResult = {
    ticketsChecked: 0,
    ticketsClosed: 0,
    errors: 0,
  };

  try {
  const now = new Date();
  log.info("[auto-close] starting", { time: now.toISOString() });

  // Get all tickets in AWAITING_RESPONSE status
  const awaitingTickets = await findAwaitingResponseTickets();
  result.ticketsChecked = awaitingTickets.length;
  log.info("[auto-close] found awaiting tickets", { count: awaitingTickets.length });

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
        // Create survey for AGENT creators (same as manual close flow)
        let surveyId: string | undefined;
        if (ticket.creator_role === "AGENT") {
          const survey = await surveyRepository.findOrCreate({
            ticketId: ticket.id,
            surveyorId: ticket.creator_id,
            assigneeId: ticket.assignee_id || null,
            marketCenterId: ticket.market_center_id!,
          });
          surveyId = survey?.id;
        }

        // Auto-close the ticket
        await ticketRepository.update(ticket.id, {
          status: "RESOLVED",
          resolvedAt: now,
          ...(surveyId && { surveyId }),
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

        // Publish ticket.closed event — the activity handler dispatches
        // survey or closed notifications based on creator role
        await activityTopic.publish({
          type: "ticket.closed",
          ticketId: ticket.id,
          ticketTitle: ticket.title || "",
          creatorId: ticket.creator_id,
          creatorRole: ticket.creator_role ?? undefined,
          assigneeId: ticket.assignee_id ?? undefined,
          surveyId,
        });

        log.info("[auto-close] closed ticket", {
          ticketId: ticket.id,
          businessDays,
          threshold: autoCloseConfig.days,
        });
        result.ticketsClosed++;
      }
    } catch (error) {
      log.error("error processing ticket for auto-close", {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
      });
      result.errors++;
    }
  }

  log.info("auto-close check complete", {
    ticketsClosed: result.ticketsClosed,
    ticketsChecked: result.ticketsChecked,
    errors: result.errors,
  });

  } catch (err) {
    cronErrors.with({ job: "auto-close" }).increment();
    caughtErrors.with({ source: "cron" }).increment();
    log.error("auto-close cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
});

// Run every 6 hours
const _ = new CronJob("auto-close-awaiting-tickets", {
  title: "Auto-close tickets in Awaiting Response status",
  every: "6h",
  endpoint: checkAutoClose,
});
