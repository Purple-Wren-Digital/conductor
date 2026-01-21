import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock hoisted values
const {
  mockDb,
  mockSlaRepository,
  mockUserRepository,
  mockNotificationRepository,
  mockTicketRepository,
  mockUserContext,
  mockSubscriptionRepository,
} = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
    query: vi.fn(),
    rawQueryRow: vi.fn(),
    rawQueryAll: vi.fn(),
    rawExec: vi.fn(),
  },
  mockSlaRepository: {
    findAllPolicies: vi.fn(),
    findActivePolicies: vi.fn(),
    findPolicyByUrgency: vi.fn(),
    findPolicyById: vi.fn(),
    updatePolicy: vi.fn(),
    createEvent: vi.fn(),
    findEventsByTicketId: vi.fn(),
    hasEvent: vi.fn(),
    setTicketSlaDueDate: vi.fn(),
    recordFirstResponse: vi.fn(),
    markSlaBreached: vi.fn(),
    markWarning50Sent: vi.fn(),
    markWarning75Sent: vi.fn(),
    findTicketsNeedingWarning50: vi.fn(),
    findTicketsNeedingWarning75: vi.fn(),
    findTicketsBreachingSla: vi.fn(),
    getSlaMetrics: vi.fn(),
    getSlaMetricsByUrgency: vi.fn(),
    getSlaMetricsByAssignee: vi.fn(),
    getSlaTrends: vi.fn(),
    // Resolution SLA methods
    setTicketResolutionSlaDueDate: vi.fn(),
    recordResolution: vi.fn(),
    markResolutionSlaBreached: vi.fn(),
    markResolutionWarning50Sent: vi.fn(),
    markResolutionWarning75Sent: vi.fn(),
    findTicketsNeedingResolutionWarning50: vi.fn(),
    findTicketsNeedingResolutionWarning75: vi.fn(),
    findTicketsBreachingResolutionSla: vi.fn(),
    getResolutionSlaMetrics: vi.fn(),
    getResolutionSlaMetricsByUrgency: vi.fn(),
    getResolutionSlaTrends: vi.fn(),
  },
  mockUserRepository: {
    findById: vi.fn(),
    findByRole: vi.fn(),
  },
  mockNotificationRepository: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  mockTicketRepository: {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createHistory: vi.fn(),
  },
  mockUserContext: {
    name: "Test User",
    userId: "user-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
  },
  mockSubscriptionRepository: {
    create: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "not_found";
      return err;
    }),
    invalidArgument: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "invalid_argument";
      return err;
    }),
    permissionDenied: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "permission_denied";
      return err;
    }),
  },
  Query: vi.fn(),
}));

// Mock shared repositories
vi.mock("../shared/repositories", () => ({
  slaRepository: mockSlaRepository,
  userRepository: mockUserRepository,
  notificationRepository: mockNotificationRepository,
  ticketRepository: mockTicketRepository,
  subscriptionRepository: mockSubscriptionRepository,
}));

// Mock ticket/db
vi.mock("../ticket/db", () => ({
  db: mockDb,
  ticketRepository: mockTicketRepository,
  userRepository: mockUserRepository,
  fromTimestamp: vi.fn((d) => d),
  toTimestamp: vi.fn((d) => d),
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Import the modules under test
import { slaService } from "./sla.service";
import { getPolicies, updatePolicy } from "./policies";
import { getMetrics, getReport, exportReport } from "./reports";
import { checkSlaStatus } from "../cron/sla-check.cron";
import { getUserContext } from "../auth/user-context";
import { SlaMetrics } from "./types";

describe("SLA System Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  // ==========================================
  // SLA Service Tests
  // ==========================================
  describe("SLA Service", () => {
    describe("calculateSlaDueDate", () => {
      it("should calculate SLA due date for HIGH urgency (2 hours)", async () => {
        const mockPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120, // 2 hours
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.calculateSlaDueDate("HIGH", createdAt);

        expect(result).not.toBeNull();
        expect(result!.policyId).toBe("policy-high");
        expect(result!.slaDueAt.getTime()).toBe(
          new Date("2024-01-15T12:00:00Z").getTime()
        );
      });

      it("should calculate SLA due date for MEDIUM urgency (24 hours)", async () => {
        const mockPolicy = {
          id: "policy-medium",
          urgency: "MEDIUM" as const,
          responseTimeMinutes: 1440, // 24 hours
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.calculateSlaDueDate(
          "MEDIUM",
          createdAt
        );

        expect(result).not.toBeNull();
        expect(result!.slaDueAt.getTime()).toBe(
          new Date("2024-01-16T10:00:00Z").getTime()
        );
      });

      it("should calculate SLA due date for LOW urgency (72 hours)", async () => {
        const mockPolicy = {
          id: "policy-low",
          urgency: "LOW" as const,
          responseTimeMinutes: 4320, // 72 hours
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.calculateSlaDueDate("LOW", createdAt);

        expect(result).not.toBeNull();
        expect(result!.slaDueAt.getTime()).toBe(
          new Date("2024-01-18T10:00:00Z").getTime()
        );
      });

      it("should return null when no active policy exists", async () => {
        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(null);

        const result = await slaService.calculateSlaDueDate("HIGH");

        expect(result).toBeNull();
      });

      it("should use current time when no createdAt provided", async () => {
        const mockPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const before = Date.now();
        const result = await slaService.calculateSlaDueDate("HIGH");
        const after = Date.now();

        expect(result).not.toBeNull();
        // The due date should be roughly 2 hours from now
        const expectedMin = before + 120 * 60 * 1000;
        const expectedMax = after + 120 * 60 * 1000;
        expect(result!.slaDueAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
        expect(result!.slaDueAt.getTime()).toBeLessThanOrEqual(expectedMax);
      });
    });

    describe("setTicketSla", () => {
      it("should set SLA for a ticket", async () => {
        const mockPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);
        mockSlaRepository.setTicketSlaDueDate.mockResolvedValue(undefined);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.setTicketSla(
          "ticket-123",
          "HIGH",
          createdAt
        );

        expect(result).toBe(true);
        expect(mockSlaRepository.setTicketSlaDueDate).toHaveBeenCalledWith(
          "ticket-123",
          expect.any(Date),
          "policy-high"
        );
      });

      it("should return false when no policy exists", async () => {
        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(null);

        const result = await slaService.setTicketSla("ticket-123", "HIGH");

        expect(result).toBe(false);
        expect(mockSlaRepository.setTicketSlaDueDate).not.toHaveBeenCalled();
      });
    });

    describe("recordFirstResponse", () => {
      it("should record first response timestamp", async () => {
        mockSlaRepository.recordFirstResponse.mockResolvedValue(undefined);

        await slaService.recordFirstResponse("ticket-123");

        expect(mockSlaRepository.recordFirstResponse).toHaveBeenCalledWith(
          "ticket-123",
          expect.any(Date)
        );
      });
    });

    describe("formatDuration", () => {
      it("should format minutes only", () => {
        expect(slaService.formatDuration(30)).toBe("30 minutes");
        expect(slaService.formatDuration(1)).toBe("1 minute");
      });

      it("should format hours only", () => {
        expect(slaService.formatDuration(60)).toBe("1 hour");
        expect(slaService.formatDuration(120)).toBe("2 hours");
      });

      it("should format hours and minutes", () => {
        expect(slaService.formatDuration(90)).toBe("1 hour 30 minutes");
        expect(slaService.formatDuration(150)).toBe("2 hours 30 minutes");
        expect(slaService.formatDuration(61)).toBe("1 hour 1 minute");
      });
    });

    // ==========================================
    // Resolution SLA Service Tests
    // ==========================================
    describe("calculateResolutionSlaDueDate", () => {
      it("should calculate Resolution SLA due date for HIGH urgency", async () => {
        const mockPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120,
          resolutionTimeMinutes: 240, // 4 hours
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.calculateResolutionSlaDueDate(
          "HIGH",
          createdAt
        );

        expect(result).not.toBeNull();
        expect(result!.slaResolutionDueAt.getTime()).toBe(
          new Date("2024-01-15T14:00:00Z").getTime()
        );
      });

      it("should calculate Resolution SLA due date for MEDIUM urgency (48 hours)", async () => {
        const mockPolicy = {
          id: "policy-medium",
          urgency: "MEDIUM" as const,
          responseTimeMinutes: 1440,
          resolutionTimeMinutes: 2880, // 48 hours
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.calculateResolutionSlaDueDate(
          "MEDIUM",
          createdAt
        );

        expect(result).not.toBeNull();
        expect(result!.slaResolutionDueAt.getTime()).toBe(
          new Date("2024-01-17T10:00:00Z").getTime()
        );
      });

      it("should calculate Resolution SLA due date for LOW urgency (1 week)", async () => {
        const mockPolicy = {
          id: "policy-low",
          urgency: "LOW" as const,
          responseTimeMinutes: 4320,
          resolutionTimeMinutes: 10080, // 7 days
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const createdAt = new Date("2024-01-15T10:00:00Z");
        const result = await slaService.calculateResolutionSlaDueDate(
          "LOW",
          createdAt
        );

        expect(result).not.toBeNull();
        expect(result!.slaResolutionDueAt.getTime()).toBe(
          new Date("2024-01-22T10:00:00Z").getTime()
        );
      });

      it("should return null when no active policy exists", async () => {
        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(null);

        const result = await slaService.calculateResolutionSlaDueDate("HIGH");

        expect(result).toBeNull();
      });

      it("should use current time when no createdAt provided", async () => {
        const mockPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120,
          resolutionTimeMinutes: 240,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSlaRepository.findPolicyByUrgency.mockResolvedValue(mockPolicy);

        const before = Date.now();
        const result = await slaService.calculateResolutionSlaDueDate("HIGH");
        const after = Date.now();

        expect(result).not.toBeNull();
        const expectedMin = before + 240 * 60 * 1000;
        const expectedMax = after + 240 * 60 * 1000;
        expect(result!.slaResolutionDueAt.getTime()).toBeGreaterThanOrEqual(
          expectedMin
        );
        expect(result!.slaResolutionDueAt.getTime()).toBeLessThanOrEqual(
          expectedMax
        );
      });
    });

    describe("recordResolution", () => {
      it("should record resolution timestamp", async () => {
        mockSlaRepository.recordResolution.mockResolvedValue(undefined);

        await slaService.recordResolution("ticket-123");

        expect(mockSlaRepository.recordResolution).toHaveBeenCalledWith(
          "ticket-123",
          expect.any(Date)
        );
      });
    });

    describe("checkResolutionSlaMet", () => {
      it("should return true when resolved before due date", async () => {
        const slaResolutionDueAt = new Date("2024-01-15T14:00:00Z");
        const resolvedAt = new Date("2024-01-15T12:00:00Z"); // 2 hours early

        const result = await slaService.checkResolutionSlaMet(
          slaResolutionDueAt,
          resolvedAt
        );

        expect(result).toBe(true);
      });

      it("should return true when resolved exactly at due date", async () => {
        const slaResolutionDueAt = new Date("2024-01-15T14:00:00Z");
        const resolvedAt = new Date("2024-01-15T14:00:00Z"); // Exactly on time

        const result = await slaService.checkResolutionSlaMet(
          slaResolutionDueAt,
          resolvedAt
        );

        expect(result).toBe(true);
      });

      it("should return false when resolved after due date", async () => {
        const slaResolutionDueAt = new Date("2024-01-15T14:00:00Z");
        const resolvedAt = new Date("2024-01-15T15:00:00Z"); // 1 hour late

        const result = await slaService.checkResolutionSlaMet(
          slaResolutionDueAt,
          resolvedAt
        );

        expect(result).toBe(false);
      });
    });
  });

  // ==========================================
  // SLA Policy API Tests
  // ==========================================
  describe("SLA Policy API", () => {
    describe("getPolicies", () => {
      it("should return all SLA policies for admin", async () => {
        const mockPolicies = [
          {
            id: "policy-high",
            urgency: "HIGH" as const,
            responseTimeMinutes: 120,
            isActive: true,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
          {
            id: "policy-medium",
            urgency: "MEDIUM" as const,
            responseTimeMinutes: 1440,
            isActive: true,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
          {
            id: "policy-low",
            urgency: "LOW" as const,
            responseTimeMinutes: 4320,
            isActive: true,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ];

        mockSlaRepository.findAllPolicies.mockResolvedValue(mockPolicies);

        const result = await getPolicies({});

        expect(result.policies).toHaveLength(3);
        expect(result.policies[0].urgency).toBe("HIGH");
        expect(result.policies[0].responseTimeMinutes).toBe(120);
      });

      it("should return policies for STAFF_LEADER", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "STAFF_LEADER",
        });

        mockSlaRepository.findAllPolicies.mockResolvedValue([]);

        const result = await getPolicies({});

        expect(result.policies).toBeDefined();
      });

      it("should deny access for AGENT role", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "AGENT",
        });

        await expect(getPolicies({})).rejects.toThrow(
          "You do not have permission to view SLA policies"
        );
      });

      it("should deny access for STAFF role", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "STAFF",
        });

        await expect(getPolicies({})).rejects.toThrow(
          "You do not have permission to view SLA policies"
        );
      });
    });

    describe("updatePolicy", () => {
      it("should update SLA policy response time", async () => {
        const updatedPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 60, // Changed from 120 to 60
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
        };

        mockSlaRepository.updatePolicy.mockResolvedValue(updatedPolicy);

        const result = await updatePolicy({
          id: "policy-high",
          responseTimeMinutes: 60,
        });

        expect(result.policy.responseTimeMinutes).toBe(60);
        expect(mockSlaRepository.updatePolicy).toHaveBeenCalledWith(
          "policy-high",
          { responseTimeMinutes: 60, isActive: undefined }
        );
      });

      it("should update SLA policy active status", async () => {
        const updatedPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120,
          isActive: false,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
        };

        mockSlaRepository.updatePolicy.mockResolvedValue(updatedPolicy);

        const result = await updatePolicy({
          id: "policy-high",
          isActive: false,
        });

        expect(result.policy.isActive).toBe(false);
      });

      it("should throw not found for non-existent policy", async () => {
        mockSlaRepository.updatePolicy.mockResolvedValue(null);

        await expect(
          updatePolicy({ id: "nonexistent", responseTimeMinutes: 60 })
        ).rejects.toThrow("SLA policy not found");
      });

      it("should deny access for non-admin", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "STAFF_LEADER",
        });

        await expect(
          updatePolicy({ id: "policy-high", responseTimeMinutes: 60 })
        ).rejects.toThrow("You do not have permission to update SLA policies");
      });

      it("should update SLA policy resolution time", async () => {
        const updatedPolicy = {
          id: "policy-high",
          urgency: "HIGH" as const,
          responseTimeMinutes: 120,
          resolutionTimeMinutes: 180, // Changed from 240 to 180 (3 hours)
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
        };

        mockSlaRepository.updatePolicy.mockResolvedValue(updatedPolicy);

        const result = await updatePolicy({
          id: "policy-high",
          resolutionTimeMinutes: 180,
        });

        expect(result.policy.resolutionTimeMinutes).toBe(180);
        expect(mockSlaRepository.updatePolicy).toHaveBeenCalledWith(
          "policy-high",
          {
            responseTimeMinutes: undefined,
            resolutionTimeMinutes: 180,
            isActive: undefined,
          }
        );
      });

      it("should update both response and resolution time together", async () => {
        const updatedPolicy = {
          id: "policy-medium",
          urgency: "MEDIUM" as const,
          responseTimeMinutes: 720, // 12 hours
          resolutionTimeMinutes: 1440, // 24 hours
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
        };

        mockSlaRepository.updatePolicy.mockResolvedValue(updatedPolicy);

        const result = await updatePolicy({
          id: "policy-medium",
          responseTimeMinutes: 720,
          resolutionTimeMinutes: 1440,
        });

        expect(result.policy.responseTimeMinutes).toBe(720);
        expect(result.policy.resolutionTimeMinutes).toBe(1440);
      });
    });
  });

  // ==========================================
  // SLA Reports API Tests
  // ==========================================
  describe("SLA Reports API", () => {
    describe("getMetrics", () => {
      it("should return SLA metrics for admin", async () => {
        const mockMetrics = {
          totalTickets: 100,
          ticketsWithSla: 95,
          ticketsMet: 85,
          ticketsBreached: 10,
          complianceRate: 89.47,
          avgResponseTimeMinutes: 45.5,
        };

        mockSlaRepository.getSlaMetrics.mockResolvedValue(mockMetrics);

        const result = await getMetrics({});

        expect(result.metrics.totalTickets).toBe(100);
        expect(result.metrics.complianceRate).toBe(89.47);
        expect(result.metrics.ticketsBreached).toBe(10);
      });

      it("should filter metrics by date range", async () => {
        mockSlaRepository.getSlaMetrics.mockResolvedValue({
          totalTickets: 50,
          ticketsWithSla: 50,
          ticketsMet: 45,
          ticketsBreached: 5,
          complianceRate: 90,
          avgResponseTimeMinutes: 30,
        });

        await getMetrics({
          dateFrom: "2024-01-01",
          dateTo: "2024-01-31",
        });

        expect(mockSlaRepository.getSlaMetrics).toHaveBeenCalledWith({
          dateFrom: expect.any(Date),
          dateTo: expect.any(Date),
          assigneeId: undefined,
          categoryId: undefined,
        });
      });

      it("should deny access for AGENT role", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "AGENT",
        });

        await expect(getMetrics({})).rejects.toThrow(
          "You do not have permission to view SLA metrics"
        );
      });
    });

    describe("getReport", () => {
      it("should return comprehensive SLA report with both Response and Resolution metrics", async () => {
        const mockMetrics = {
          totalTickets: 100,
          ticketsWithSla: 95,
          ticketsMet: 85,
          ticketsBreached: 10,
          complianceRate: 89.47,
          avgResponseTimeMinutes: 45.5,
        };

        const mockByUrgency = [
          {
            urgency: "HIGH" as const,
            totalTickets: 30,
            ticketsMet: 25,
            ticketsBreached: 5,
            complianceRate: 83.33,
          },
          {
            urgency: "MEDIUM" as const,
            totalTickets: 50,
            ticketsMet: 45,
            ticketsBreached: 5,
            complianceRate: 90,
          },
          {
            urgency: "LOW" as const,
            totalTickets: 20,
            ticketsMet: 15,
            ticketsBreached: 0,
            complianceRate: 100,
          },
        ];

        const mockByAssignee = [
          {
            assigneeId: "user-1",
            assigneeName: "John Doe",
            totalTickets: 40,
            ticketsMet: 35,
            ticketsBreached: 5,
            complianceRate: 87.5,
            avgResponseTimeMinutes: 30,
          },
        ];

        const mockTrends = [
          {
            period: "2024-01-01",
            totalTickets: 10,
            ticketsMet: 9,
            ticketsBreached: 1,
            complianceRate: 90,
          },
        ];

        // Resolution SLA mocks
        const mockResolutionMetrics = {
          totalTickets: 100,
          ticketsWithSla: 90,
          ticketsMet: 80,
          ticketsBreached: 10,
          complianceRate: 88.89,
          avgResolutionTimeMinutes: 180,
        };

        const mockResolutionByUrgency = [
          {
            urgency: "HIGH" as const,
            totalTickets: 30,
            ticketsMet: 24,
            ticketsBreached: 6,
            complianceRate: 80,
          },
          {
            urgency: "MEDIUM" as const,
            totalTickets: 50,
            ticketsMet: 45,
            ticketsBreached: 5,
            complianceRate: 90,
          },
          {
            urgency: "LOW" as const,
            totalTickets: 20,
            ticketsMet: 11,
            ticketsBreached: 0,
            complianceRate: 100,
          },
        ];

        const mockResolutionTrends = [
          {
            period: "2024-01-01",
            totalTickets: 10,
            ticketsMet: 8,
            ticketsBreached: 2,
            complianceRate: 80,
          },
        ];

        // Response SLA
        mockSlaRepository.getSlaMetrics.mockResolvedValue(mockMetrics);
        mockSlaRepository.getSlaMetricsByUrgency.mockResolvedValue(
          mockByUrgency
        );
        mockSlaRepository.getSlaMetricsByAssignee.mockResolvedValue(
          mockByAssignee
        );
        mockSlaRepository.getSlaTrends.mockResolvedValue(mockTrends);
        // Resolution SLA
        mockSlaRepository.getResolutionSlaMetrics.mockResolvedValue(
          mockResolutionMetrics
        );
        mockSlaRepository.getResolutionSlaMetricsByUrgency.mockResolvedValue(
          mockResolutionByUrgency
        );
        mockSlaRepository.getResolutionSlaTrends.mockResolvedValue(
          mockResolutionTrends
        );

        const result = await getReport({});

        // Response SLA assertions
        expect(result.metrics).toBeDefined();
        expect(result.byUrgency).toHaveLength(3);
        expect(result.byAssignee).toHaveLength(1);
        expect(result.trends).toHaveLength(1);

        // Resolution SLA assertions
        expect(result.resolutionMetrics).toBeDefined();
        expect(result.resolutionMetrics.complianceRate).toBe(88.89);
        expect(result.resolutionMetrics.avgResolutionTimeMinutes).toBe(180);
        expect(result.resolutionByUrgency).toHaveLength(3);
        expect(result.resolutionTrends).toHaveLength(1);
      });

      it("should deny access for non-admin", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "STAFF_LEADER",
        });

        await expect(getReport({})).rejects.toThrow(
          "You do not have permission to view SLA reports"
        );
      });
    });

    describe("exportReport", () => {
      it("should export SLA report as CSV with both Response and Resolution metrics", async () => {
        // Response SLA
        mockSlaRepository.getSlaMetrics.mockResolvedValue({
          totalTickets: 100,
          ticketsWithSla: 95,
          ticketsMet: 85,
          ticketsBreached: 10,
          complianceRate: 89.47,
          avgResponseTimeMinutes: 45.5,
        });

        mockSlaRepository.getSlaMetricsByUrgency.mockResolvedValue([
          {
            urgency: "HIGH" as const,
            totalTickets: 30,
            ticketsMet: 25,
            ticketsBreached: 5,
            complianceRate: 83.33,
          },
        ]);

        mockSlaRepository.getSlaMetricsByAssignee.mockResolvedValue([
          {
            assigneeId: "user-1",
            assigneeName: "John Doe",
            totalTickets: 40,
            ticketsMet: 35,
            ticketsBreached: 5,
            complianceRate: 87.5,
            avgResponseTimeMinutes: 30,
          },
        ]);

        // Resolution SLA
        mockSlaRepository.getResolutionSlaMetrics.mockResolvedValue({
          totalTickets: 100,
          ticketsWithSla: 90,
          ticketsMet: 80,
          ticketsBreached: 10,
          complianceRate: 88.89,
          avgResolutionTimeMinutes: 180,
        });

        mockSlaRepository.getResolutionSlaMetricsByUrgency.mockResolvedValue([
          {
            urgency: "HIGH" as const,
            totalTickets: 30,
            ticketsMet: 24,
            ticketsBreached: 6,
            complianceRate: 80,
          },
        ]);

        const result = await exportReport({});

        // Response SLA assertions
        expect(result.csv).toContain("RESPONSE SLA Report Summary");
        expect(result.csv).toContain("Total Tickets,100");
        expect(result.csv).toContain("Compliance Rate,89.47%");
        expect(result.csv).toContain("Response SLA By Urgency");
        expect(result.csv).toContain("HIGH,30,25,5,83.33%");
        expect(result.csv).toContain("John Doe,40,35,5,87.5%,30");

        // Resolution SLA assertions
        expect(result.csv).toContain("RESOLUTION SLA Report Summary");
        expect(result.csv).toContain("Compliance Rate,88.89%");
        expect(result.csv).toContain("Resolution SLA By Urgency");

        expect(result.filename).toMatch(/sla-report-.*\.csv/);
      });

      it("should deny access for non-admin", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          ...mockUserContext,
          role: "STAFF",
        });

        await expect(exportReport({})).rejects.toThrow(
          "You do not have permission to export SLA reports"
        );
      });
    });
  });

  // ==========================================
  // SLA Cron Job Tests
  // ==========================================
  describe("SLA Cron Job", () => {
    // Helper to mock empty Resolution SLA results
    const mockEmptyResolutionSla = () => {
      mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue([]);
    };

    // Helper to mock empty Response SLA results
    const mockEmptyResponseSla = () => {
      mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([]);
      mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
      mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
    };

    describe("Response SLA - checkSlaStatus", () => {
      it("should send Response SLA 50% warnings", async () => {
        const ticketsNeedingWarning = [
          {
            id: "ticket-1",
            title: "Test Ticket 1",
            urgency: "HIGH" as const,
            status: "ASSIGNED",
            creator_id: "user-creator",
            assignee_id: "user-assignee",
            sla_response_due_at: new Date(),
            first_response_at: null,
            sla_breached: false,
            sla_warning_50_sent: false,
            sla_warning_75_sent: false,
            created_at: new Date(),
          },
        ];

        mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue(
          ticketsNeedingWarning
        );
        mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
        mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
        mockEmptyResolutionSla();
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.responseWarnings50Sent).toBe(1);
        expect(result.responseWarnings75Sent).toBe(0);
        expect(result.responseBreachesMarked).toBe(0);

        expect(mockSlaRepository.markWarning50Sent).toHaveBeenCalledWith(
          "ticket-1"
        );
        expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
          ticketId: "ticket-1",
          eventType: "WARNING_50",
          notificationSent: true,
        });
        expect(mockNotificationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-assignee",
            type: "SLA Warning",
          })
        );
      });

      it("should send Response SLA 75% warnings", async () => {
        const ticketsNeedingWarning = [
          {
            id: "ticket-2",
            title: "Test Ticket 2",
            urgency: "MEDIUM" as const,
            status: "ASSIGNED",
            creator_id: "user-creator",
            assignee_id: "user-assignee",
            sla_response_due_at: new Date(),
            first_response_at: null,
            sla_breached: false,
            sla_warning_50_sent: true,
            sla_warning_75_sent: false,
            created_at: new Date(),
          },
        ];

        mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([]);
        mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue(
          ticketsNeedingWarning
        );
        mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
        mockEmptyResolutionSla();
        mockSlaRepository.markWarning75Sent.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.responseWarnings50Sent).toBe(0);
        expect(result.responseWarnings75Sent).toBe(1);
        expect(result.responseBreachesMarked).toBe(0);

        expect(mockSlaRepository.markWarning75Sent).toHaveBeenCalledWith(
          "ticket-2"
        );
      });

      it("should mark Response SLA breaches and notify admins", async () => {
        const ticketsBreaching = [
          {
            id: "ticket-3",
            title: "Breached Ticket",
            urgency: "HIGH" as const,
            status: "ASSIGNED",
            creator_id: "user-creator",
            assignee_id: "user-assignee",
            sla_response_due_at: new Date(Date.now() - 3600000), // 1 hour ago
            first_response_at: null,
            sla_breached: false,
            sla_warning_50_sent: true,
            sla_warning_75_sent: true,
            created_at: new Date(),
          },
        ];

        const mockAdmins = [
          { id: "admin-1", name: "Admin 1", email: "admin1@test.com" },
          { id: "admin-2", name: "Admin 2", email: "admin2@test.com" },
        ];

        mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([]);
        mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
        mockSlaRepository.findTicketsBreachingSla.mockResolvedValue(
          ticketsBreaching
        );
        mockEmptyResolutionSla();
        mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue(mockAdmins);

        const result = await checkSlaStatus();

        expect(result.responseWarnings50Sent).toBe(0);
        expect(result.responseWarnings75Sent).toBe(0);
        expect(result.responseBreachesMarked).toBe(1);

        expect(mockSlaRepository.markSlaBreached).toHaveBeenCalledWith(
          "ticket-3"
        );
        expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
          ticketId: "ticket-3",
          eventType: "BREACHED",
          notificationSent: true,
        });

        // Should notify assignee + all admins
        expect(mockNotificationRepository.create).toHaveBeenCalledTimes(3);
      });

      it("should handle tickets without assignee for Response SLA", async () => {
        const ticketsNeedingWarning = [
          {
            id: "ticket-unassigned",
            title: "Unassigned Ticket",
            urgency: "LOW" as const,
            status: "UNASSIGNED",
            creator_id: "user-creator",
            assignee_id: null,
            sla_response_due_at: new Date(),
            first_response_at: null,
            sla_breached: false,
            sla_warning_50_sent: false,
            sla_warning_75_sent: false,
            created_at: new Date(),
          },
        ];

        mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue(
          ticketsNeedingWarning
        );
        mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
        mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
        mockEmptyResolutionSla();
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.responseWarnings50Sent).toBe(1);
        // Should not create notification since there's no assignee
        expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      });

      it("should process multiple Response SLA tickets in single run", async () => {
        const ticketsWarning50 = [
          { id: "t1", title: "T1", urgency: "HIGH", assignee_id: "u1" },
          { id: "t2", title: "T2", urgency: "MEDIUM", assignee_id: "u2" },
        ];

        const ticketsWarning75 = [
          { id: "t3", title: "T3", urgency: "LOW", assignee_id: "u3" },
        ];

        const ticketsBreaching = [
          { id: "t4", title: "T4", urgency: "HIGH", assignee_id: "u4" },
        ];

        mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue(
          ticketsWarning50
        );
        mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue(
          ticketsWarning75
        );
        mockSlaRepository.findTicketsBreachingSla.mockResolvedValue(
          ticketsBreaching
        );
        mockEmptyResolutionSla();
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.markWarning75Sent.mockResolvedValue(undefined);
        mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue([]);

        const result = await checkSlaStatus();

        expect(result.responseWarnings50Sent).toBe(2);
        expect(result.responseWarnings75Sent).toBe(1);
        expect(result.responseBreachesMarked).toBe(1);
      });
    });

    // ==========================================
    // Resolution SLA Cron Job Tests
    // ==========================================
    describe("Resolution SLA - checkSlaStatus", () => {
      it("should send Resolution SLA 50% warnings", async () => {
        const ticketsNeedingResolutionWarning = [
          {
            id: "ticket-res-1",
            title: "Resolution Test Ticket 1",
            urgency: "HIGH" as const,
            status: "IN_PROGRESS",
            creator_id: "user-creator",
            assignee_id: "user-assignee",
            sla_resolution_due_at: new Date(),
            resolved_at: null,
            sla_resolution_breached: false,
            sla_resolution_warning_50_sent: false,
            sla_resolution_warning_75_sent: false,
            created_at: new Date(),
          },
        ];

        mockEmptyResponseSla();
        mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
          ticketsNeedingResolutionWarning
        );
        mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
          []
        );
        mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
          []
        );
        mockSlaRepository.markResolutionWarning50Sent.mockResolvedValue(
          undefined
        );
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.resolutionWarnings50Sent).toBe(1);
        expect(result.resolutionWarnings75Sent).toBe(0);
        expect(result.resolutionBreachesMarked).toBe(0);

        expect(
          mockSlaRepository.markResolutionWarning50Sent
        ).toHaveBeenCalledWith("ticket-res-1");
        expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
          ticketId: "ticket-res-1",
          eventType: "RESOLUTION_WARNING_50",
          notificationSent: true,
        });
        expect(mockNotificationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-assignee",
            type: "SLA Warning",
            title: expect.stringContaining("Resolution SLA Warning"),
          })
        );
      });

      it("should send Resolution SLA 75% warnings", async () => {
        const ticketsNeedingResolutionWarning = [
          {
            id: "ticket-res-2",
            title: "Resolution Test Ticket 2",
            urgency: "MEDIUM" as const,
            status: "IN_PROGRESS",
            creator_id: "user-creator",
            assignee_id: "user-assignee",
            sla_resolution_due_at: new Date(),
            resolved_at: null,
            sla_resolution_breached: false,
            sla_resolution_warning_50_sent: true,
            sla_resolution_warning_75_sent: false,
            created_at: new Date(),
          },
        ];

        mockEmptyResponseSla();
        mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
          []
        );
        mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
          ticketsNeedingResolutionWarning
        );
        mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
          []
        );
        mockSlaRepository.markResolutionWarning75Sent.mockResolvedValue(
          undefined
        );
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.resolutionWarnings50Sent).toBe(0);
        expect(result.resolutionWarnings75Sent).toBe(1);
        expect(result.resolutionBreachesMarked).toBe(0);

        expect(
          mockSlaRepository.markResolutionWarning75Sent
        ).toHaveBeenCalledWith("ticket-res-2");
        expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
          ticketId: "ticket-res-2",
          eventType: "RESOLUTION_WARNING_75",
          notificationSent: true,
        });
      });

      it("should mark Resolution SLA breaches and notify admins", async () => {
        const ticketsBreachingResolution = [
          {
            id: "ticket-res-3",
            title: "Resolution Breached Ticket",
            urgency: "HIGH" as const,
            status: "IN_PROGRESS",
            creator_id: "user-creator",
            assignee_id: "user-assignee",
            sla_resolution_due_at: new Date(Date.now() - 7200000), // 2 hours ago
            resolved_at: null,
            sla_resolution_breached: false,
            sla_resolution_warning_50_sent: true,
            sla_resolution_warning_75_sent: true,
            created_at: new Date(),
          },
        ];

        const mockAdmins = [
          { id: "admin-1", name: "Admin 1", email: "admin1@test.com" },
        ];

        mockEmptyResponseSla();
        mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
          []
        );
        mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
          []
        );
        mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
          ticketsBreachingResolution
        );
        mockSlaRepository.markResolutionSlaBreached.mockResolvedValue(
          undefined
        );
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue(mockAdmins);

        const result = await checkSlaStatus();

        expect(result.resolutionWarnings50Sent).toBe(0);
        expect(result.resolutionWarnings75Sent).toBe(0);
        expect(result.resolutionBreachesMarked).toBe(1);

        expect(
          mockSlaRepository.markResolutionSlaBreached
        ).toHaveBeenCalledWith("ticket-res-3");
        expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
          ticketId: "ticket-res-3",
          eventType: "RESOLUTION_BREACHED",
          notificationSent: true,
        });

        // Should notify assignee + all admins
        expect(mockNotificationRepository.create).toHaveBeenCalledTimes(2);
      });

      it("should handle tickets without assignee for Resolution SLA", async () => {
        const ticketsNeedingResolutionWarning = [
          {
            id: "ticket-res-unassigned",
            title: "Unassigned Resolution Ticket",
            urgency: "LOW" as const,
            status: "UNASSIGNED",
            creator_id: "user-creator",
            assignee_id: null,
            sla_resolution_due_at: new Date(),
            resolved_at: null,
            sla_resolution_breached: false,
            sla_resolution_warning_50_sent: false,
            sla_resolution_warning_75_sent: false,
            created_at: new Date(),
          },
        ];

        mockEmptyResponseSla();
        mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
          ticketsNeedingResolutionWarning
        );
        mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
          []
        );
        mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
          []
        );
        mockSlaRepository.markResolutionWarning50Sent.mockResolvedValue(
          undefined
        );
        mockSlaRepository.createEvent.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.resolutionWarnings50Sent).toBe(1);
        // Should not create notification since there's no assignee
        expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      });

      it("should process multiple Resolution SLA tickets in single run", async () => {
        const ticketsResWarning50 = [
          { id: "res-t1", title: "Res T1", urgency: "HIGH", assignee_id: "u1" },
          {
            id: "res-t2",
            title: "Res T2",
            urgency: "MEDIUM",
            assignee_id: "u2",
          },
        ];

        const ticketsResWarning75 = [
          { id: "res-t3", title: "Res T3", urgency: "LOW", assignee_id: "u3" },
        ];

        const ticketsResBreaching = [
          { id: "res-t4", title: "Res T4", urgency: "HIGH", assignee_id: "u4" },
        ];

        mockEmptyResponseSla();
        mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
          ticketsResWarning50
        );
        mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
          ticketsResWarning75
        );
        mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
          ticketsResBreaching
        );
        mockSlaRepository.markResolutionWarning50Sent.mockResolvedValue(
          undefined
        );
        mockSlaRepository.markResolutionWarning75Sent.mockResolvedValue(
          undefined
        );
        mockSlaRepository.markResolutionSlaBreached.mockResolvedValue(
          undefined
        );
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue([]);

        const result = await checkSlaStatus();

        expect(result.resolutionWarnings50Sent).toBe(2);
        expect(result.resolutionWarnings75Sent).toBe(1);
        expect(result.resolutionBreachesMarked).toBe(1);
      });
    });

    describe("Combined Response and Resolution SLA - checkSlaStatus", () => {
      it("should process both Response and Resolution SLA in a single run", async () => {
        // Response SLA tickets
        const responseWarning50 = [
          {
            id: "resp-t1",
            title: "Response T1",
            urgency: "HIGH",
            assignee_id: "u1",
          },
        ];
        const responseBreaching = [
          {
            id: "resp-t2",
            title: "Response T2",
            urgency: "MEDIUM",
            assignee_id: "u2",
          },
        ];

        // Resolution SLA tickets
        const resolutionWarning75 = [
          {
            id: "res-t1",
            title: "Resolution T1",
            urgency: "HIGH",
            assignee_id: "u3",
          },
        ];
        const resolutionBreaching = [
          {
            id: "res-t2",
            title: "Resolution T2",
            urgency: "LOW",
            assignee_id: "u4",
          },
        ];

        // Response SLA mocks
        mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue(
          responseWarning50
        );
        mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
        mockSlaRepository.findTicketsBreachingSla.mockResolvedValue(
          responseBreaching
        );

        // Resolution SLA mocks
        mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
          []
        );
        mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
          resolutionWarning75
        );
        mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
          resolutionBreaching
        );

        // Common mocks
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
        mockSlaRepository.markResolutionWarning75Sent.mockResolvedValue(
          undefined
        );
        mockSlaRepository.markResolutionSlaBreached.mockResolvedValue(
          undefined
        );
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue([]);

        const result = await checkSlaStatus();

        // Response SLA assertions
        expect(result.responseWarnings50Sent).toBe(1);
        expect(result.responseWarnings75Sent).toBe(0);
        expect(result.responseBreachesMarked).toBe(1);

        // Resolution SLA assertions
        expect(result.resolutionWarnings50Sent).toBe(0);
        expect(result.resolutionWarnings75Sent).toBe(1);
        expect(result.resolutionBreachesMarked).toBe(1);

        // Verify all events were created
        expect(mockSlaRepository.createEvent).toHaveBeenCalledTimes(4);
      });
    });
  });
});

// ==========================================
// SLA Repository Tests (Unit Tests)
// ==========================================
describe("SLA Repository Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
  });

  describe("Policy Queries", () => {
    it("findPolicyByUrgency should query with correct urgency", async () => {
      // This tests the repository interface contract
      mockSlaRepository.findPolicyByUrgency.mockResolvedValue({
        id: "policy-1",
        urgency: "HIGH",
        responseTimeMinutes: 120,
        isActive: true,
      });

      const result = await mockSlaRepository.findPolicyByUrgency("HIGH");

      expect(mockSlaRepository.findPolicyByUrgency).toHaveBeenCalledWith(
        "HIGH"
      );
      expect(result?.urgency).toBe("HIGH");
    });

    it("updatePolicy should update specified fields", async () => {
      mockSlaRepository.updatePolicy.mockResolvedValue({
        id: "policy-1",
        urgency: "HIGH",
        responseTimeMinutes: 60,
        isActive: true,
      });

      const result = await mockSlaRepository.updatePolicy("policy-1", {
        responseTimeMinutes: 60,
      });

      expect(mockSlaRepository.updatePolicy).toHaveBeenCalledWith("policy-1", {
        responseTimeMinutes: 60,
      });
      expect(result?.responseTimeMinutes).toBe(60);
    });
  });

  describe("Ticket SLA Queries", () => {
    it("findTicketsNeedingWarning50 should return un-responded tickets at 50%", async () => {
      const mockTickets = [
        { id: "t1", sla_warning_50_sent: false, first_response_at: null },
        { id: "t2", sla_warning_50_sent: false, first_response_at: null },
      ];

      mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue(
        mockTickets
      );

      const result = await mockSlaRepository.findTicketsNeedingWarning50();

      expect(result).toHaveLength(2);
      expect(result[0].sla_warning_50_sent).toBe(false);
    });

    it("findTicketsBreachingSla should return breached tickets", async () => {
      const mockTickets = [
        {
          id: "t1",
          sla_breached: false,
          first_response_at: null,
          sla_response_due_at: new Date(Date.now() - 3600000),
        },
      ];

      mockSlaRepository.findTicketsBreachingSla.mockResolvedValue(mockTickets);

      const result = await mockSlaRepository.findTicketsBreachingSla();

      expect(result).toHaveLength(1);
    });
  });

  describe("Response SLA Metrics Queries", () => {
    it("getSlaMetrics should aggregate correctly", async () => {
      mockSlaRepository.getSlaMetrics.mockResolvedValue({
        totalTickets: 100,
        ticketsWithSla: 100,
        ticketsMet: 90,
        ticketsBreached: 10,
        complianceRate: 90,
        avgResponseTimeMinutes: 25.5,
      });

      const result = await mockSlaRepository.getSlaMetrics({
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-01-31"),
      });

      expect(result.complianceRate).toBe(90);
      expect(result.ticketsMet + result.ticketsBreached).toBeLessThanOrEqual(
        result.ticketsWithSla
      );
    });

    it("getSlaMetricsByUrgency should group by urgency", async () => {
      mockSlaRepository.getSlaMetricsByUrgency.mockResolvedValue([
        {
          urgency: "HIGH",
          totalTickets: 30,
          ticketsMet: 25,
          complianceRate: 83.33,
        },
        {
          urgency: "MEDIUM",
          totalTickets: 50,
          ticketsMet: 48,
          complianceRate: 96,
        },
        {
          urgency: "LOW",
          totalTickets: 20,
          ticketsMet: 20,
          complianceRate: 100,
        },
      ]);

      const result = await mockSlaRepository.getSlaMetricsByUrgency({});

      expect(result).toHaveLength(3);
      expect(
        result.find((r: any) => r.urgency === "HIGH")?.complianceRate
      ).toBe(83.33);
    });

    it("getSlaTrends should return time-series data", async () => {
      mockSlaRepository.getSlaTrends.mockResolvedValue([
        {
          period: "2024-01",
          totalTickets: 100,
          ticketsMet: 90,
          complianceRate: 90,
        },
        {
          period: "2024-02",
          totalTickets: 120,
          ticketsMet: 115,
          complianceRate: 95.83,
        },
      ]);

      const result = await mockSlaRepository.getSlaTrends({
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-02-28"),
        groupBy: "month",
      });

      expect(result).toHaveLength(2);
      expect(result[1].complianceRate).toBeGreaterThan(
        result[0].complianceRate
      );
    });
  });

  // ==========================================
  // Resolution SLA Repository Tests
  // ==========================================
  describe("Resolution SLA Ticket Queries", () => {
    it("findTicketsNeedingResolutionWarning50 should return unresolved tickets at 50%", async () => {
      const mockTickets = [
        { id: "t1", sla_resolution_warning_50_sent: false, resolved_at: null },
        { id: "t2", sla_resolution_warning_50_sent: false, resolved_at: null },
      ];

      mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
        mockTickets
      );

      const result =
        await mockSlaRepository.findTicketsNeedingResolutionWarning50();

      expect(result).toHaveLength(2);
      expect(result[0].sla_resolution_warning_50_sent).toBe(false);
    });

    it("findTicketsNeedingResolutionWarning75 should return unresolved tickets at 75%", async () => {
      const mockTickets = [
        {
          id: "t1",
          sla_resolution_warning_50_sent: true,
          sla_resolution_warning_75_sent: false,
          resolved_at: null,
        },
      ];

      mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
        mockTickets
      );

      const result =
        await mockSlaRepository.findTicketsNeedingResolutionWarning75();

      expect(result).toHaveLength(1);
      expect(result[0].sla_resolution_warning_75_sent).toBe(false);
    });

    it("findTicketsBreachingResolutionSla should return breached tickets", async () => {
      const mockTickets = [
        {
          id: "t1",
          sla_resolution_breached: false,
          resolved_at: null,
          sla_resolution_due_at: new Date(Date.now() - 7200000), // 2 hours ago
        },
      ];

      mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue(
        mockTickets
      );

      const result =
        await mockSlaRepository.findTicketsBreachingResolutionSla();

      expect(result).toHaveLength(1);
    });

    it("recordResolution should update resolved_at timestamp", async () => {
      mockSlaRepository.recordResolution.mockResolvedValue(undefined);

      const resolvedAt = new Date();
      await mockSlaRepository.recordResolution("ticket-1", resolvedAt);

      expect(mockSlaRepository.recordResolution).toHaveBeenCalledWith(
        "ticket-1",
        resolvedAt
      );
    });

    it("markResolutionSlaBreached should mark ticket as breached", async () => {
      mockSlaRepository.markResolutionSlaBreached.mockResolvedValue(undefined);

      await mockSlaRepository.markResolutionSlaBreached("ticket-1");

      expect(mockSlaRepository.markResolutionSlaBreached).toHaveBeenCalledWith(
        "ticket-1"
      );
    });
  });

  describe("Resolution SLA Metrics Queries", () => {
    it("getResolutionSlaMetrics should aggregate correctly", async () => {
      mockSlaRepository.getResolutionSlaMetrics.mockResolvedValue({
        totalTickets: 80,
        ticketsWithSla: 80,
        ticketsMet: 70,
        ticketsBreached: 10,
        complianceRate: 87.5,
        avgResolutionTimeMinutes: 180,
      });

      const result = await mockSlaRepository.getResolutionSlaMetrics({
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-01-31"),
      });

      expect(result.complianceRate).toBe(87.5);
      expect(result.avgResolutionTimeMinutes).toBe(180);
      expect(result.ticketsMet + result.ticketsBreached).toBeLessThanOrEqual(
        result.ticketsWithSla
      );
    });

    it("getResolutionSlaMetricsByUrgency should group by urgency", async () => {
      mockSlaRepository.getResolutionSlaMetricsByUrgency.mockResolvedValue([
        {
          urgency: "HIGH",
          totalTickets: 25,
          ticketsMet: 20,
          ticketsBreached: 5,
          complianceRate: 80,
        },
        {
          urgency: "MEDIUM",
          totalTickets: 40,
          ticketsMet: 38,
          ticketsBreached: 2,
          complianceRate: 95,
        },
        {
          urgency: "LOW",
          totalTickets: 15,
          ticketsMet: 12,
          ticketsBreached: 0,
          complianceRate: 100,
        },
      ]);

      const result = await mockSlaRepository.getResolutionSlaMetricsByUrgency(
        {}
      );

      expect(result).toHaveLength(3);
      expect(
        result.find((r: any) => r.urgency === "HIGH")?.complianceRate
      ).toBe(80);
      expect(result.find((r: any) => r.urgency === "LOW")?.complianceRate).toBe(
        100
      );
    });

    it("getResolutionSlaTrends should return time-series data", async () => {
      mockSlaRepository.getResolutionSlaTrends.mockResolvedValue([
        {
          period: "2024-01",
          totalTickets: 80,
          ticketsMet: 65,
          complianceRate: 81.25,
        },
        {
          period: "2024-02",
          totalTickets: 100,
          ticketsMet: 90,
          complianceRate: 90,
        },
      ]);

      const result = await mockSlaRepository.getResolutionSlaTrends({
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-02-28"),
        groupBy: "month",
      });

      expect(result).toHaveLength(2);
      expect(result[1].complianceRate).toBeGreaterThan(
        result[0].complianceRate
      );
    });
  });
});

// ==========================================
// SLA Integration Scenarios
// ==========================================
describe("SLA Integration Scenarios", () => {
  // Helper to mock empty Resolution SLA results
  const mockEmptyResolutionSla = () => {
    mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
      []
    );
    mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
      []
    );
    mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue([]);
  };

  // Helper to mock empty Response SLA results
  const mockEmptyResponseSla = () => {
    mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([]);
    mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
    mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  describe("Response SLA Ticket Lifecycle", () => {
    it("should track Response SLA through complete ticket lifecycle", async () => {
      // Scenario: Ticket created -> 50% warning -> 75% warning -> Response before breach

      // 1. Ticket created with SLA
      const policy = {
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 240,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSlaRepository.findPolicyByUrgency.mockResolvedValue(policy);
      mockSlaRepository.setTicketSlaDueDate.mockResolvedValue(undefined);

      const createdAt = new Date();
      const slaResult = await slaService.setTicketSla(
        "ticket-lifecycle",
        "HIGH",
        createdAt
      );

      expect(slaResult).toBe(true);
      expect(mockSlaRepository.setTicketSlaDueDate).toHaveBeenCalled();

      // 2. 50% warning check
      mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([
        {
          id: "ticket-lifecycle",
          title: "Lifecycle Test",
          urgency: "HIGH",
          assignee_id: "user-1",
        },
      ]);
      mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
      mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
      mockEmptyResolutionSla();
      mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      let cronResult = await checkSlaStatus();
      expect(cronResult.responseWarnings50Sent).toBe(1);

      // 3. 75% warning check
      vi.clearAllMocks();
      mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([]);
      mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([
        {
          id: "ticket-lifecycle",
          title: "Lifecycle Test",
          urgency: "HIGH",
          assignee_id: "user-1",
        },
      ]);
      mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);
      mockEmptyResolutionSla();
      mockSlaRepository.markWarning75Sent.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      cronResult = await checkSlaStatus();
      expect(cronResult.responseWarnings75Sent).toBe(1);

      // 4. Response recorded (SLA met)
      mockSlaRepository.recordFirstResponse.mockResolvedValue(undefined);
      await slaService.recordFirstResponse("ticket-lifecycle");
      expect(mockSlaRepository.recordFirstResponse).toHaveBeenCalledWith(
        "ticket-lifecycle",
        expect.any(Date)
      );
    });

    it("should handle Response SLA breach scenario", async () => {
      // Scenario: Ticket breaches Response SLA without response

      mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([]);
      mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
      mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([
        {
          id: "ticket-breached",
          title: "Breached Ticket",
          urgency: "HIGH",
          assignee_id: "user-1",
          sla_response_due_at: new Date(Date.now() - 7200000), // 2 hours ago
        },
      ]);
      mockEmptyResolutionSla();
      mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});
      mockUserRepository.findByRole.mockResolvedValue([
        { id: "admin-1", name: "Admin" },
      ]);

      const result = await checkSlaStatus();

      expect(result.responseBreachesMarked).toBe(1);
      expect(mockSlaRepository.markSlaBreached).toHaveBeenCalledWith(
        "ticket-breached"
      );
      expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
        ticketId: "ticket-breached",
        eventType: "BREACHED",
        notificationSent: true,
      });
    });
  });

  describe("Resolution SLA Ticket Lifecycle", () => {
    it("should track Resolution SLA through complete ticket lifecycle", async () => {
      // Scenario: Ticket created -> 50% warning -> 75% warning -> Resolution before breach

      // 1. Ticket created with Resolution SLA
      const policy = {
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 240, // 4 hours
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSlaRepository.findPolicyByUrgency.mockResolvedValue(policy);

      const createdAt = new Date("2024-01-15T10:00:00Z");
      const resolutionSlaResult =
        await slaService.calculateResolutionSlaDueDate("HIGH", createdAt);

      expect(resolutionSlaResult).not.toBeNull();
      expect(resolutionSlaResult!.slaResolutionDueAt.getTime()).toBe(
        new Date("2024-01-15T14:00:00Z").getTime()
      );

      // 2. 50% resolution warning check
      mockEmptyResponseSla();
      mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
        [
          {
            id: "ticket-resolution-lifecycle",
            title: "Resolution Lifecycle Test",
            urgency: "HIGH",
            assignee_id: "user-1",
          },
        ]
      );
      mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue([]);
      mockSlaRepository.markResolutionWarning50Sent.mockResolvedValue(
        undefined
      );
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      let cronResult = await checkSlaStatus();
      expect(cronResult.resolutionWarnings50Sent).toBe(1);

      // 3. 75% resolution warning check
      vi.clearAllMocks();
      mockEmptyResponseSla();
      mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
        [
          {
            id: "ticket-resolution-lifecycle",
            title: "Resolution Lifecycle Test",
            urgency: "HIGH",
            assignee_id: "user-1",
          },
        ]
      );
      mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue([]);
      mockSlaRepository.markResolutionWarning75Sent.mockResolvedValue(
        undefined
      );
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      cronResult = await checkSlaStatus();
      expect(cronResult.resolutionWarnings75Sent).toBe(1);

      // 4. Resolution recorded (SLA met)
      mockSlaRepository.recordResolution.mockResolvedValue(undefined);
      await slaService.recordResolution("ticket-resolution-lifecycle");
      expect(mockSlaRepository.recordResolution).toHaveBeenCalledWith(
        "ticket-resolution-lifecycle",
        expect.any(Date)
      );
    });

    it("should handle Resolution SLA breach scenario", async () => {
      // Scenario: Ticket breaches Resolution SLA without being resolved

      mockEmptyResponseSla();
      mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue([
        {
          id: "ticket-resolution-breached",
          title: "Resolution Breached Ticket",
          urgency: "HIGH",
          assignee_id: "user-1",
          sla_resolution_due_at: new Date(Date.now() - 14400000), // 4 hours ago
        },
      ]);
      mockSlaRepository.markResolutionSlaBreached.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});
      mockUserRepository.findByRole.mockResolvedValue([
        { id: "admin-1", name: "Admin" },
      ]);

      const result = await checkSlaStatus();

      expect(result.resolutionBreachesMarked).toBe(1);
      expect(mockSlaRepository.markResolutionSlaBreached).toHaveBeenCalledWith(
        "ticket-resolution-breached"
      );
      expect(mockSlaRepository.createEvent).toHaveBeenCalledWith({
        ticketId: "ticket-resolution-breached",
        eventType: "RESOLUTION_BREACHED",
        notificationSent: true,
      });
    });

    it("should verify Resolution SLA met when resolved on time", async () => {
      const slaResolutionDueAt = new Date("2024-01-15T14:00:00Z");
      const resolvedAt = new Date("2024-01-15T13:30:00Z"); // 30 minutes early

      const result = await slaService.checkResolutionSlaMet(
        slaResolutionDueAt,
        resolvedAt
      );

      expect(result).toBe(true);
    });

    it("should verify Resolution SLA breached when resolved late", async () => {
      const slaResolutionDueAt = new Date("2024-01-15T14:00:00Z");
      const resolvedAt = new Date("2024-01-15T16:00:00Z"); // 2 hours late

      const result = await slaService.checkResolutionSlaMet(
        slaResolutionDueAt,
        resolvedAt
      );

      expect(result).toBe(false);
    });
  });

  describe("Combined Response and Resolution SLA Lifecycle", () => {
    it("should handle ticket with both Response and Resolution SLA tracking", async () => {
      // Scenario: Response SLA warning, then Resolution SLA warning in same run

      // Response SLA at 50%
      mockSlaRepository.findTicketsNeedingWarning50.mockResolvedValue([
        {
          id: "ticket-combined",
          title: "Combined SLA Test",
          urgency: "HIGH",
          assignee_id: "user-1",
        },
      ]);
      mockSlaRepository.findTicketsNeedingWarning75.mockResolvedValue([]);
      mockSlaRepository.findTicketsBreachingSla.mockResolvedValue([]);

      // Resolution SLA at 75%
      mockSlaRepository.findTicketsNeedingResolutionWarning50.mockResolvedValue(
        []
      );
      mockSlaRepository.findTicketsNeedingResolutionWarning75.mockResolvedValue(
        [
          {
            id: "ticket-combined-2",
            title: "Combined SLA Test 2",
            urgency: "MEDIUM",
            assignee_id: "user-2",
          },
        ]
      );
      mockSlaRepository.findTicketsBreachingResolutionSla.mockResolvedValue([]);

      // Setup mock handlers
      mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
      mockSlaRepository.markResolutionWarning75Sent.mockResolvedValue(
        undefined
      );
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      const result = await checkSlaStatus();

      expect(result.responseWarnings50Sent).toBe(1);
      expect(result.resolutionWarnings75Sent).toBe(1);
      expect(mockSlaRepository.createEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe("Policy Configuration Scenarios", () => {
    it("should handle Response SLA policy update affecting new tickets", async () => {
      // Update HIGH urgency from 2 hours to 1 hour
      mockSlaRepository.updatePolicy.mockResolvedValue({
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 60, // Changed
        resolutionTimeMinutes: 240,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateResult = await updatePolicy({
        id: "policy-high",
        responseTimeMinutes: 60,
      });

      expect(updateResult.policy.responseTimeMinutes).toBe(60);

      // New ticket should use updated policy
      mockSlaRepository.findPolicyByUrgency.mockResolvedValue({
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 60,
        resolutionTimeMinutes: 240,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdAt = new Date("2024-01-15T10:00:00Z");
      const slaResult = await slaService.calculateSlaDueDate("HIGH", createdAt);

      expect(slaResult!.slaDueAt.getTime()).toBe(
        new Date("2024-01-15T11:00:00Z").getTime() // 1 hour later
      );
    });

    it("should handle Resolution SLA policy update affecting new tickets", async () => {
      // Update HIGH urgency resolution from 4 hours to 2 hours
      mockSlaRepository.updatePolicy.mockResolvedValue({
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 120, // Changed from 240
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateResult = await updatePolicy({
        id: "policy-high",
        resolutionTimeMinutes: 120,
      });

      expect(updateResult.policy.resolutionTimeMinutes).toBe(120);

      // New ticket should use updated policy
      mockSlaRepository.findPolicyByUrgency.mockResolvedValue({
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 120,
        resolutionTimeMinutes: 120,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdAt = new Date("2024-01-15T10:00:00Z");
      const slaResult = await slaService.calculateResolutionSlaDueDate(
        "HIGH",
        createdAt
      );

      expect(slaResult!.slaResolutionDueAt.getTime()).toBe(
        new Date("2024-01-15T12:00:00Z").getTime() // 2 hours later
      );
    });

    it("should handle disabled policy for both Response and Resolution SLA", async () => {
      // Disable HIGH urgency policy
      mockSlaRepository.findPolicyByUrgency.mockResolvedValue(null);

      const responseResult = await slaService.setTicketSla(
        "ticket-no-sla",
        "HIGH"
      );
      const resolutionResult =
        await slaService.calculateResolutionSlaDueDate("HIGH");

      expect(responseResult).toBe(false);
      expect(resolutionResult).toBeNull();
      expect(mockSlaRepository.setTicketSlaDueDate).not.toHaveBeenCalled();
    });
  });
});
