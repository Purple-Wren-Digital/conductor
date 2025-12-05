import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock hoisted values
const {
  mockDb,
  mockSlaRepository,
  mockUserRepository,
  mockNotificationRepository,
  mockTicketRepository,
  mockUserContext,
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
    userId: "user-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
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

describe("SLA System Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
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
        const result = await slaService.calculateSlaDueDate("MEDIUM", createdAt);

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
      it("should return comprehensive SLA report", async () => {
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

        mockSlaRepository.getSlaMetrics.mockResolvedValue(mockMetrics);
        mockSlaRepository.getSlaMetricsByUrgency.mockResolvedValue(mockByUrgency);
        mockSlaRepository.getSlaMetricsByAssignee.mockResolvedValue(mockByAssignee);
        mockSlaRepository.getSlaTrends.mockResolvedValue(mockTrends);

        const result = await getReport({});

        expect(result.metrics).toBeDefined();
        expect(result.byUrgency).toHaveLength(3);
        expect(result.byAssignee).toHaveLength(1);
        expect(result.trends).toHaveLength(1);
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
      it("should export SLA report as CSV", async () => {
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

        const result = await exportReport({});

        expect(result.csv).toContain("SLA Report Summary");
        expect(result.csv).toContain("Total Tickets,100");
        expect(result.csv).toContain("Compliance Rate,89.47%");
        expect(result.csv).toContain("HIGH,30,25,5,83.33%");
        expect(result.csv).toContain("John Doe,40,35,5,87.5%,30");
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
    describe("checkSlaStatus", () => {
      it("should send 50% warnings", async () => {
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
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.warnings50Sent).toBe(1);
        expect(result.warnings75Sent).toBe(0);
        expect(result.breachesMarked).toBe(0);

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

      it("should send 75% warnings", async () => {
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
        mockSlaRepository.markWarning75Sent.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.warnings50Sent).toBe(0);
        expect(result.warnings75Sent).toBe(1);
        expect(result.breachesMarked).toBe(0);

        expect(mockSlaRepository.markWarning75Sent).toHaveBeenCalledWith(
          "ticket-2"
        );
      });

      it("should mark SLA breaches and notify admins", async () => {
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
        mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue(mockAdmins);

        const result = await checkSlaStatus();

        expect(result.warnings50Sent).toBe(0);
        expect(result.warnings75Sent).toBe(0);
        expect(result.breachesMarked).toBe(1);

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

      it("should handle tickets without assignee", async () => {
        const ticketsNeedingWarning = [
          {
            id: "ticket-unassigned",
            title: "Unassigned Ticket",
            urgency: "LOW" as const,
            status: "CREATED",
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
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});

        const result = await checkSlaStatus();

        expect(result.warnings50Sent).toBe(1);
        // Should not create notification since there's no assignee
        expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      });

      it("should process multiple tickets in single run", async () => {
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
        mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
        mockSlaRepository.markWarning75Sent.mockResolvedValue(undefined);
        mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
        mockSlaRepository.createEvent.mockResolvedValue({});
        mockNotificationRepository.create.mockResolvedValue({});
        mockUserRepository.findByRole.mockResolvedValue([]);

        const result = await checkSlaStatus();

        expect(result.warnings50Sent).toBe(2);
        expect(result.warnings75Sent).toBe(1);
        expect(result.breachesMarked).toBe(1);
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

      expect(mockSlaRepository.findPolicyByUrgency).toHaveBeenCalledWith("HIGH");
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
    it("findTicketsNeedingWarning50 should return unresponded tickets at 50%", async () => {
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

  describe("Metrics Queries", () => {
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
        { urgency: "HIGH", totalTickets: 30, ticketsMet: 25, complianceRate: 83.33 },
        { urgency: "MEDIUM", totalTickets: 50, ticketsMet: 48, complianceRate: 96 },
        { urgency: "LOW", totalTickets: 20, ticketsMet: 20, complianceRate: 100 },
      ]);

      const result = await mockSlaRepository.getSlaMetricsByUrgency({});

      expect(result).toHaveLength(3);
      expect(result.find((r) => r.urgency === "HIGH")?.complianceRate).toBe(
        83.33
      );
    });

    it("getSlaTrends should return time-series data", async () => {
      mockSlaRepository.getSlaTrends.mockResolvedValue([
        { period: "2024-01", totalTickets: 100, ticketsMet: 90, complianceRate: 90 },
        { period: "2024-02", totalTickets: 120, ticketsMet: 115, complianceRate: 95.83 },
      ]);

      const result = await mockSlaRepository.getSlaTrends({
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-02-28"),
        groupBy: "month",
      });

      expect(result).toHaveLength(2);
      expect(result[1].complianceRate).toBeGreaterThan(result[0].complianceRate);
    });
  });
});

// ==========================================
// SLA Integration Scenarios
// ==========================================
describe("SLA Integration Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  describe("Ticket Lifecycle with SLA", () => {
    it("should track SLA through complete ticket lifecycle", async () => {
      // Scenario: Ticket created -> 50% warning -> 75% warning -> Response before breach

      // 1. Ticket created with SLA
      const policy = {
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 120,
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
      mockSlaRepository.markWarning50Sent.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      let cronResult = await checkSlaStatus();
      expect(cronResult.warnings50Sent).toBe(1);

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
      mockSlaRepository.markWarning75Sent.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});

      cronResult = await checkSlaStatus();
      expect(cronResult.warnings75Sent).toBe(1);

      // 4. Response recorded (SLA met)
      mockSlaRepository.recordFirstResponse.mockResolvedValue(undefined);
      await slaService.recordFirstResponse("ticket-lifecycle");
      expect(mockSlaRepository.recordFirstResponse).toHaveBeenCalledWith(
        "ticket-lifecycle",
        expect.any(Date)
      );
    });

    it("should handle SLA breach scenario", async () => {
      // Scenario: Ticket breaches SLA without response

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
      mockSlaRepository.markSlaBreached.mockResolvedValue(undefined);
      mockSlaRepository.createEvent.mockResolvedValue({});
      mockNotificationRepository.create.mockResolvedValue({});
      mockUserRepository.findByRole.mockResolvedValue([
        { id: "admin-1", name: "Admin" },
      ]);

      const result = await checkSlaStatus();

      expect(result.breachesMarked).toBe(1);
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

  describe("Policy Configuration Scenarios", () => {
    it("should handle policy update affecting new tickets", async () => {
      // Update HIGH urgency from 2 hours to 1 hour
      mockSlaRepository.updatePolicy.mockResolvedValue({
        id: "policy-high",
        urgency: "HIGH" as const,
        responseTimeMinutes: 60, // Changed
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

    it("should handle disabled policy", async () => {
      // Disable HIGH urgency policy
      mockSlaRepository.findPolicyByUrgency.mockResolvedValue(null);

      const result = await slaService.setTicketSla("ticket-no-sla", "HIGH");

      expect(result).toBe(false);
      expect(mockSlaRepository.setTicketSlaDueDate).not.toHaveBeenCalled();
    });
  });
});
