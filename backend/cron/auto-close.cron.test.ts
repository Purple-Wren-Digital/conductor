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
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
}));

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

// Import after mocks
import { checkAutoClose } from "./auto-close.cron";

describe("Auto-Close Cron Job Tests", () => {
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
      mockNotificationRepository.create.mockResolvedValue({});

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
      mockNotificationRepository.create.mockResolvedValue({});

      const result = await checkAutoClose();

      // Default is 2 business days, and 5 have passed
      expect(result.ticketsClosed).toBe(1);
    });

    it("should send notification to creator", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
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
      mockNotificationRepository.create.mockResolvedValue({});

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
      mockNotificationRepository.create.mockResolvedValue({});

      await checkAutoClose();

      // Should be called twice - once for creator, once for assignee
      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(2);
    });

    it("should not send duplicate notification when creator is assignee", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Test Ticket",
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
      mockNotificationRepository.create.mockResolvedValue({});

      await checkAutoClose();

      // Should only be called once since creator === assignee
      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(1);
    });

    it("should cache market center settings for multiple tickets", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Ticket 1",
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
        {
          id: "ticket-2",
          title: "Ticket 2",
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
      mockNotificationRepository.create.mockResolvedValue({});

      await checkAutoClose();

      // Market center should only be fetched once due to caching
      expect(mockMarketCenterRepository.findById).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully and continue processing", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: "Failing Ticket",
          creator_id: "user-1",
          assignee_id: null,
          category_id: "cat-1",
          market_center_id: "mc-123",
          status_changed_at: new Date("2025-01-08T12:00:00Z"),
        },
        {
          id: "ticket-2",
          title: "Successful Ticket",
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
      mockNotificationRepository.create.mockResolvedValue({});

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
      mockNotificationRepository.create.mockResolvedValue({});

      const result = await checkAutoClose();

      expect(result.ticketsClosed).toBe(1);
      expect(mockTicketRepository.findById).toHaveBeenCalledWith("ticket-1");
    });

    it("should handle tickets with null title gracefully", async () => {
      const mockAwaitingTickets = [
        {
          id: "ticket-1",
          title: null,
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
      mockNotificationRepository.create.mockResolvedValue({});

      await checkAutoClose();

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ticket "Untitled" has been auto-closed',
        })
      );
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
      mockNotificationRepository.create.mockResolvedValue({});

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
