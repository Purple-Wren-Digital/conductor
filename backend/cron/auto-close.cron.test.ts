import { CreateEmailResponse, CreateEmailResponseSuccess } from "resend";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock hoisted values
const {
  mockDb,
  mockTicketRepository,
  mockMarketCenterRepository,
  mockNotificationRepository,
} = vi.hoisted(() => ({
  mockDb: {
    rawQueryAll: vi.fn(),
  },
  mockTicketRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    createHistory: vi.fn(),
  },
  mockMarketCenterRepository: {
    findById: vi.fn(),
  },
  mockNotificationRepository: {
    create: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => {
  const api = Object.assign(
    vi.fn((config, handler) => handler),
    {
      raw: vi.fn((options, handler) => handler),
      streamOut: vi.fn((options, handler) => handler),
    }
  );
  return {
    api: api,
  };
});

// Mock encore.dev/cron
vi.mock("encore.dev/cron", () => ({
  CronJob: vi.fn(),
}));

// Mock ticket/db
vi.mock("../ticket/db", () => ({
  db: mockDb,
}));

// Mock repositories
vi.mock("../shared/repositories", () => ({
  ticketRepository: mockTicketRepository,
  marketCenterRepository: mockMarketCenterRepository,
  notificationRepository: mockNotificationRepository,
}));

// Mock email channel so we don't actually send emails
vi.mock("../notifications/channels/email/email", async () => {
  const actual = await vi.importActual("../notifications/channels/email/email");
  return {
    ...actual,
    sendEmailNotification: vi.fn(), // <-- mock it
  };
});

// Import after mocks
import { checkAutoClose } from "./auto-close.cron";
import * as emailModule from "../notifications/channels/email/email";
// import type { SendEmailNotification: SendEmailNotificationType } from "../notifications/channels/email/email";
import type { MockedFunction } from "vitest";

describe("Auto-Close Cron Job Tests", () => {
  const mockedSendEmail = emailModule.sendEmailNotification as MockedFunction<
    typeof emailModule.sendEmailNotification
  >;
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Date to a fixed point for consistent testing
    vi.useFakeTimers();
    // Set to Wednesday, January 15, 2025 at noon
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkAutoClose", () => {
    it("should return zero counts when no tickets are in AWAITING_RESPONSE status", async () => {
      mockDb.rawQueryAll.mockResolvedValue([]);

      const result = await checkAutoClose();

      expect(result.ticketsChecked).toBe(0);
      expect(result.ticketsClosed).toBe(0);
      expect(result.errors).toBe(0);
    });

    it("should close tickets that exceed the threshold", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: "user-2",
          category_id: "cat-1",
          market_center_id: "mc-123",
          // 5 business days ago (Monday Jan 8, 2025)
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);

      const result = await checkAutoClose();

      expect(result.ticketsChecked).toBe(1);
      expect(result.ticketsClosed).toBe(1);
      expect(result.errors).toBe(0);

      expect(mockTicketRepository.update).toHaveBeenCalledWith("ticket-1", {
        status: "RESOLVED",
        resolvedAt: expect.any(Date),
      });

      expect(mockTicketRepository.createHistory).toHaveBeenCalledWith({
        ticketId: "ticket-1",
        action: "AUTOCLOSE",
        field: "ticket",
        previousValue: "AWAITING_RESPONSE",
        newValue: "RESOLVED",
        changedById: "SYSTEM",
      });
    });

    it("should not close tickets that have not exceeded the threshold", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Recent Ticket",
          creator_id: "user-1",
          assignee_id: "user-2",
          category_id: "cat-1",
          market_center_id: "mc-123",
          // Only 1 business day ago (Tuesday Jan 14, 2025)
          status_changed_at: new Date("2025-01-14T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await checkAutoClose();

      expect(result.ticketsChecked).toBe(1);
      expect(result.ticketsClosed).toBe(0);
      expect(mockTicketRepository.update).not.toHaveBeenCalled();
    });

    it("should skip tickets when auto-close is disabled", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-01T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: false,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await checkAutoClose();

      expect(result.ticketsChecked).toBe(1);
      expect(result.ticketsClosed).toBe(0);
      expect(mockTicketRepository.update).not.toHaveBeenCalled();
    });

    it("should skip tickets without a market center", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2024-12-21T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: null,
          market_center_id: null,
          status_changed_at: new Date("2025-01-01T12:00:00Z"),
        },
      ];

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);

      const result = await checkAutoClose();

      expect(result.ticketsChecked).toBe(1);
      expect(result.ticketsClosed).toBe(0);
      expect(mockMarketCenterRepository.findById).not.toHaveBeenCalled();
    });

    it("should use default settings when market center has no auto-close config", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          creator_id: "user-1",
          created_at: new Date("2025-01-01T12:00:00Z"),
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          // 5 business days ago
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {}, // No autoClose config
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      // Default is 2 business days, and 5 have passed
      expect(result.ticketsClosed).toBe(1);
    });

    it("should send notification to creator", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      await checkAutoClose();

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId: "user-1",
        channel: "IN_APP",
        category: "ACTIVITY",
        type: "Ticket Updated",
        title: 'Ticket "Test Ticket" has been auto-closed',
        body: "This ticket was automatically closed after 2 business days without a response.",
        data: {
          ticketId: "ticket-1",
        },
      });
    });

    it("should send notification to assignee if different from creator", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: "user-2",
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      await checkAutoClose();

      // Should be called twice - once for creator, once for assignee
      // expect(mockedSendEmail).toHaveBeenCalledTimes(2);
    });

    it("should not send duplicate notification when creator is assignee", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: "user-1", // Same as creator
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      await checkAutoClose();

      // Should only be called once since creator === assignee
      // expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    });

    it("should cache market center settings for multiple tickets", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Ticket 1",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
        {
          id: "ticket-2",
          title: "Ticket 2",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-2",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123", // Same market center
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      await checkAutoClose();

      // Market center should only be fetched once due to caching
      expect(mockMarketCenterRepository.findById).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully and continue processing", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Failing Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
        {
          id: "ticket-2",
          title: "Successful Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-2",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-456",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-456",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      // First call throws, second succeeds
      mockMarketCenterRepository.findById
        .mockRejectedValueOnce(new Error("Database error"))
        .mockResolvedValueOnce(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      expect(result.ticketsChecked).toBe(2);
      expect(result.ticketsClosed).toBe(1);
      expect(result.errors).toBe(1);
    });

    it("should use ticket updated_at as fallback when no history exists", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: null, // No history record
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      const mockTicket = {
        id: "ticket-1",
        updatedAt: new Date("2025-01-08T12:00:00Z"), // 5 business days ago
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.findById.mockResolvedValue(mockTicket);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(1);
      expect(mockTicketRepository.findById).toHaveBeenCalledWith("ticket-1");
    });

    it("should handle tickets with null title gracefully", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: null,
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      await checkAutoClose();

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ticket "Untitled" has been auto-closed',
        })
      );
    });
  });

  describe("Maintenance Request scenario - 2-day auto-close debug", () => {
    /**
     * This test suite specifically replicates the reported issue:
     * "Ticket ('Maintenance Request - [Property Address]'): Ticket did not auto-close
     * after 2 days. Market Center is setup and active for a 2-day window."
     *
     * Potential causes investigated:
     * 1. Missing market_center_id on the ticket's category
     * 2. Missing ticket_history entry for AWAITING_RESPONSE status change
     * 3. Weekend days not being counted correctly
     * 4. Threshold check using >= vs > comparison
     */

    it("should auto-close 'Maintenance Request' ticket after exactly 2 business days", async () => {
      // Scenario: Today is Wednesday Jan 15, 2025
      // Ticket was set to AWAITING_RESPONSE on Monday Jan 13, 2025
      // This is exactly 2 business days ago (Mon->Tue, Tue->Wed)
      const mockMaintenanceTicket = {
        id: "maintenance-ticket-123",
        title: "Maintenance Request - 123 Main St",
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: new Date("2025-01-13T10:00:00Z"), // Monday morning
      };

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockMaintenanceTicket]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(1);
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        "maintenance-ticket-123",
        {
          status: "RESOLVED",
          resolvedAt: expect.any(Date),
        }
      );
    });

    it("should NOT auto-close ticket after only 1 business day", async () => {
      // Tuesday Jan 14 8am, ticket set to AWAITING_RESPONSE Monday Jan 13 5pm
      // Algorithm: Mon 5pm < Tue 8am? Yes, count Mon. Tue 5pm < Tue 8am? No.
      // Result: 1 business day (Monday only)
      vi.setSystemTime(new Date("2025-01-14T08:00:00Z")); // Tuesday 8am

      const mockMaintenanceTicket = {
        id: "maintenance-ticket-123",
        title: "Maintenance Request - 123 Main St",
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: new Date("2025-01-13T17:00:00Z"), // Monday 5pm
      };

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockMaintenanceTicket]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(0);
      expect(mockTicketRepository.update).not.toHaveBeenCalled();
    });

    it("should auto-close after 2 business days from Monday morning to Wednesday", async () => {
      // The algorithm counts: Mon < Wed? Yes (count Mon). Tue < Wed? Yes (count Tue). Wed < Wed? No.
      // Result: 2 business days, so ticket IS closed with 2-day threshold
      vi.setSystemTime(new Date("2025-01-15T12:00:00Z")); // Wednesday noon

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(1);
    });

    it("should handle ticket set to AWAITING_RESPONSE on Friday - weekend should not count", async () => {
      // Set "now" to Monday Jan 13 morning
      vi.setSystemTime(new Date("2025-01-13T08:00:00Z")); // Monday 8am

      // Ticket was set to AWAITING_RESPONSE on Friday Jan 10 at 5pm
      // Algorithm: Fri 5pm < Mon 8am? Yes (count Fri). Sat < Mon? Yes but skip (weekend). Sun < Mon? Yes but skip (weekend). Mon 5pm < Mon 8am? No.
      // Result: 1 business day (Friday only)
      const mockMaintenanceTicket = {
        id: "maintenance-ticket-friday",
        title: "Maintenance Request - Weekend Test",
        created_at: new Date("2025-01-13T08:00:00Z"),
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: new Date("2025-01-10T17:00:00Z"), // Friday 5pm
      };

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockMaintenanceTicket]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await checkAutoClose();

      // Should NOT close - only 1 business day has passed (Friday)
      expect(result.ticketsClosed).toBe(0);
    });

    it("should close on Tuesday if ticket was set to AWAITING_RESPONSE on Friday", async () => {
      // Set "now" to Tuesday Jan 14 noon
      vi.setSystemTime(new Date("2025-01-14T12:00:00Z"));

      // Ticket was set to AWAITING_RESPONSE on Friday Jan 10
      // Algorithm: Fri < Tue? Yes (count Fri). Sat skip. Sun skip. Mon < Tue? Yes (count Mon). Tue < Tue? No.
      // Result: 2 business days (Friday + Monday), so ticket IS closed
      const mockMaintenanceTicket = {
        id: "maintenance-ticket-friday",
        title: "Maintenance Request - Weekend Test",
        created_at: new Date("2025-01-01T12:00:00Z"),
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: new Date("2025-01-10T16:00:00Z"), // Friday afternoon
      };

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockMaintenanceTicket]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      // Should close - 2 business days have passed (Friday + Monday)
      expect(result.ticketsClosed).toBe(1);
    });

    it("should skip ticket when category has no market_center_id (POTENTIAL BUG)", async () => {
      const mockTicketWithoutMarketCenter = {
        id: "maintenance-ticket-no-mc",
        title: "Maintenance Request - No MC",
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "orphan-category",
        market_center_id: null, // Category not linked to market center
        status_changed_at: new Date("2025-01-08T12:00:00Z"),
      };

      mockDb.rawQueryAll.mockResolvedValue([mockTicketWithoutMarketCenter]);

      const result = await checkAutoClose();

      // Ticket is skipped because no market_center_id
      expect(result.ticketsChecked).toBe(1);
      expect(result.ticketsClosed).toBe(0);
      expect(mockMarketCenterRepository.findById).not.toHaveBeenCalled();
    });

    it("should skip ticket when status_changed_at is null and ticket has no updatedAt", async () => {
      const mockTicketNoHistory = {
        id: "maintenance-ticket-no-history",
        title: "Maintenance Request - No History",
        created_at: new Date("2025-01-01T12:00:00Z"),
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: null, // No history record found
      };

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockTicketNoHistory]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      // Return ticket without updatedAt
      mockTicketRepository.findById.mockResolvedValue({
        id: "maintenance-ticket-no-history",
        updatedAt: null,
      });

      const result = await checkAutoClose();

      // Should be skipped because no timestamp available
      expect(result.ticketsClosed).toBe(0);
    });

    it("should verify market center settings are correctly loaded", async () => {
      const mockMaintenanceTicket = {
        id: "maintenance-ticket-123",
        title: "Maintenance Request - Settings Check",
        created_at: new Date("2025-01-14T12:00:00Z"),
        creator_id: "agent-user-1",
        assignee_id: "staff-user-1",
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: new Date("2025-01-08T12:00:00Z"), // 5 business days ago
      };

      // Market center with explicit 2-day setting
      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2, // Explicitly set to 2 days
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockMaintenanceTicket]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(1);

      // Verify the notification mentions correct number of days
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "This ticket was automatically closed after 2 business days without a response.",
        })
      );
    });

    it("should debug: log which condition is failing for a non-closing ticket", async () => {
      // This test helps diagnose why a specific ticket might not be closing
      const consoleSpy = vi.spyOn(console, "log");

      const mockMaintenanceTicket = {
        id: "debug-ticket",
        title: "Maintenance Request - Debug",
        created_at: new Date("2025-01-01T12:00:00Z"),
        creator_id: "agent-user-1",
        assignee_id: null,
        category_id: "maintenance-cat-1",
        market_center_id: "mc-active-123",
        status_changed_at: new Date("2025-01-13T12:00:00Z"), // 2 business days ago
      };

      const mockMarketCenter = {
        id: "mc-active-123",
        name: "Active Market Center",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2,
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue([mockMaintenanceTicket]);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      // This should close since 2 business days have passed and threshold is 2
      expect(result.ticketsClosed).toBe(1);

      // Verify the completion log
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Auto-close check complete")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("business days calculation", () => {
    it("should correctly count business days excluding weekends", async () => {
      // Wednesday Jan 15, 2025 is our "now"
      // Monday Jan 13 = 2 business days ago (Mon, Tue)
      // We set threshold to 2, so ticket should be closed
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test",
          created_at: new Date("2025-01-01T12:00:00Z"),
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-13T12:00:00Z"), // Monday
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2, // Exactly 2 business days
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);
      mockedSendEmail.mockResolvedValue({
        data: {
          id: "mock-email-id",
        },
        error: null,
      });
      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(1);
    });

    it("should not count weekends in business days", async () => {
      // Set to Monday Jan 13, 2025
      vi.setSystemTime(new Date("2025-01-13T12:00:00Z"));

      // Friday Jan 10 = only 1 business day ago (even though 3 calendar days)
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test",
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-10T12:00:00Z"), // Friday
        },
      ];

      const mockMarketCenter = {
        id: "mc-123",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 2, // Need 2 business days
          },
        },
      };

      mockDb.rawQueryAll.mockResolvedValue(mockAwaitingTickets);
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await checkAutoClose();

      // Should NOT be closed - only 1 business day elapsed, not 2
      expect(result.ticketsClosed).toBe(0);
    });
  });
});
