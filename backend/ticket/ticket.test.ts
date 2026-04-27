import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockDb,
  mockTicketRepository,
  mockUserRepository,
  mockTodoRepository,
  mockCommentRepository,
  mockMarketCenterRepository,
  mockSurveyRepository,
  mockActivityTopic,
  mockUserContext,
} = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
  mockTicketRepository: {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createHistory: vi.fn(),
    createManyHistory: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    updateManyByAssignee: vi.fn(),
  },
  mockUserRepository: {
    findById: vi.fn(),
    findByIdWithMarketCenter: vi.fn(),
    count: vi.fn(),
  },
  mockTodoRepository: {
    createMany: vi.fn(),
    findByTicketId: vi.fn(),
  },
  mockCommentRepository: {
    findByTicketId: vi.fn(),
    count: vi.fn(),
  },
  mockMarketCenterRepository: {
    findCategoryById: vi.fn(),
  },
  mockSurveyRepository: {
    findOrCreate: vi.fn(),
  },
  mockActivityTopic: {
    publish: vi.fn(),
  },
  mockUserContext: {
    name: "Test Admin",
    userId: "user-123",
    email: "user@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isSuperuser: false,
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
}));

// Mock ticket/db
vi.mock("./db", () => ({
  db: mockDb,
  ticketRepository: mockTicketRepository,
  userRepository: mockUserRepository,
  todoRepository: mockTodoRepository,
  commentRepository: mockCommentRepository,
  marketCenterRepository: mockMarketCenterRepository,
  surveyRepository: mockSurveyRepository,
  withTransaction: vi.fn((fn) => fn()),
}));

// Mock SLA service
vi.mock("../sla/sla.service", () => ({
  slaService: {
    setTicketSla: vi.fn(() => Promise.resolve()),
    recordFirstResponse: vi.fn(() => Promise.resolve()),
    recordResolution: vi.fn(() => Promise.resolve()),
  },
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock permissions
vi.mock("../auth/permissions", () => ({
  canCreateTicket: vi.fn(() => Promise.resolve(true)),
  canReassignTicket: vi.fn(() => Promise.resolve(true)),
  canModifyTicket: vi.fn(() => Promise.resolve(true)),
  canChangeTicketCreator: vi.fn(() => Promise.resolve(true)),
  canDeleteTicket: vi.fn(() => Promise.resolve(true)),
}));

// Mock subscription check
vi.mock("../auth/subscription-check", () => ({
  checkCanCreateTicket: vi.fn(() => Promise.resolve(true)),
}));

// Mock subscription tracking
vi.mock("../subscription/subscription", () => ({
  trackUsage: vi.fn(() => Promise.resolve()),
}));

// Mock utils
vi.mock("../utils", () => ({
  mapHistorySnapshot: vi.fn((x) => x),
}));

// Mock activity topic
vi.mock("../notifications/activity-topic", () => ({
  activityTopic: mockActivityTopic,
}));

// Import after mocks
import { create } from "./create";
import { get } from "./get";
import { assign } from "./assign";
import { update } from "./update";
import { closeTicket } from "./close";
import { getUserContext } from "../auth/user-context";
import {
  canCreateTicket,
  canReassignTicket,
  canModifyTicket,
  canChangeTicketCreator,
} from "../auth/permissions";

describe("Ticket Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivityTopic.publish.mockResolvedValue(undefined);
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    vi.mocked(canCreateTicket).mockResolvedValue(true);
    vi.mocked(canReassignTicket).mockResolvedValue(true);
    vi.mocked(canModifyTicket).mockResolvedValue(true);
    vi.mocked(canChangeTicketCreator).mockResolvedValue(true);
  });

  describe("create", () => {
    it("should create a ticket successfully", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        description: "Test Description",
        categoryId: "cat-123",
        urgency: "MEDIUM",
        creatorId: "user-123",
        assigneeId: null,
        status: "UNASSIGNED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: "user-123",
        name: "Test User",
        email: "user@test.com",
      };

      mockTicketRepository.create.mockResolvedValue(mockTicket);
      mockTicketRepository.createHistory.mockResolvedValue({});
      mockUserRepository.findById.mockResolvedValue(mockCreator);

      const result = await create({
        title: "Test Ticket",
        description: "Test Description",
        categoryId: "cat-123",
        urgency: "MEDIUM" as any,
      });

      expect(result.ticket).toBeDefined();
      expect(result.ticket.title).toBe("Test Ticket");
      expect(result.usersToNotify).toHaveLength(0);
      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ticket.created" })
      );
    });

    it("should create ticket with assignee", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        description: "Test Description",
        categoryId: "cat-123",
        urgency: "HIGH",
        creatorId: "user-123",
        assigneeId: "user-456",
        status: "ASSIGNED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: "user-123",
        name: "Creator",
        email: "creator@test.com",
      };

      const mockAssignee = {
        id: "user-456",
        name: "Assignee",
        email: "assignee@test.com",
      };

      mockTicketRepository.create.mockResolvedValue(mockTicket);
      mockTicketRepository.createHistory.mockResolvedValue({});
      mockUserRepository.findById
        .mockResolvedValueOnce(mockCreator)
        .mockResolvedValueOnce(mockAssignee);

      const result = await create({
        title: "Test Ticket",
        description: "Test Description",
        categoryId: "cat-123",
        urgency: "HIGH" as any,
        assigneeId: "user-456",
      });

      expect(result.usersToNotify).toHaveLength(0);
      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ticket.created" })
      );
    });

    it("should create ticket with todos", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        description: "Test Description",
        categoryId: null,
        urgency: "LOW",
        creatorId: "user-123",
        assigneeId: null,
        status: "UNASSIGNED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: "user-123",
        name: "Creator",
        email: "creator@test.com",
      };

      mockTicketRepository.create.mockResolvedValue(mockTicket);
      mockTicketRepository.createHistory.mockResolvedValue({});
      mockTodoRepository.createMany.mockResolvedValue([]);
      mockUserRepository.findById.mockResolvedValue(mockCreator);

      await create({
        title: "Test Ticket",
        description: "Test Description",
        categoryId: "cat-123",
        urgency: "LOW" as any,
        todos: ["Todo 1", "Todo 2"],
      });

      expect(mockTodoRepository.createMany).toHaveBeenCalledWith([
        { title: "Todo 1", ticketId: "ticket-123", createdById: "user-123" },
        { title: "Todo 2", ticketId: "ticket-123", createdById: "user-123" },
      ]);
    });

    it("should throw permission denied when user cannot create tickets", async () => {
      vi.mocked(canCreateTicket).mockResolvedValue(false);

      await expect(
        create({
          title: "Test Ticket",
          description: "Test Description",
          categoryId: "cat-123",
          urgency: "MEDIUM" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("get", () => {
    it("should return a ticket with counts", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        description: "Test Description",
        categoryId: "cat-123",
        urgency: "MEDIUM",
        status: "ASSIGNED",
        creatorId: "user-123",
        assigneeId: "user-456",
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: "user-123", name: "Creator", email: "creator@test.com" },
        assignee: {
          id: "user-456",
          name: "Assignee",
          email: "assignee@test.com",
        },
        category: {
          id: "cat-123",
          name: "Support",
          description: "Support category",
          defaultAssigneeId: null,
        },
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockDb.queryAll.mockResolvedValue([]); // No attachments
      mockDb.queryRow.mockResolvedValue({ comments: 5, attachments: 0 });

      const result = await get({ ticketId: "ticket-123" });

      expect(result.ticket).toBeDefined();
      expect(result.ticket.id).toBe("ticket-123");
      expect(result.commentCount).toBe(5);
      expect(result.attachmentCount).toBe(0);
    });

    it("should throw not found when ticket does not exist", async () => {
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(get({ ticketId: "nonexistent" })).rejects.toThrow(
        "ticket not found"
      );
    });

    it("should include attachments with uploader info", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        description: "Test Description",
        categoryId: null,
        urgency: "LOW",
        status: "UNASSIGNED",
        creatorId: "user-123",
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: "user-123", name: "Creator", email: "creator@test.com" },
        assignee: null,
        category: null,
      };

      const mockAttachments = [
        {
          id: "att-1",
          file_name: "test.pdf",
          file_type: "application/pdf",
          file_size: 1024,
          file_key: "key-123",
          ticket_id: "ticket-123",
          uploader_id: "user-123",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockDb.queryAll.mockResolvedValue(mockAttachments);
      mockDb.queryRow
        .mockResolvedValueOnce({
          id: "user-123",
          name: "Uploader",
          email: "uploader@test.com",
        })
        .mockResolvedValueOnce({ comments: 0, attachments: 1 });

      const result = await get({ ticketId: "ticket-123" });

      expect(result.ticket.attachments).toHaveLength(1);
      expect(result.ticket.attachments![0].fileName).toBe("test.pdf");
      expect(result.ticket.attachments![0].uploader?.name).toBe("Uploader");
    });
  });

  describe("assign", () => {
    it("should assign a ticket to a new user", async () => {
      const mockOldTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        status: "UNASSIGNED",
        assigneeId: null,
        assignee: null,
      };

      const mockNewAssignee = {
        id: "user-456",
        name: "New Assignee",
        email: "assignee@test.com",
      };

      const mockUpdatedTicket = {
        ...mockOldTicket,
        assigneeId: "user-456",
        status: "ASSIGNED",
        assignee: mockNewAssignee,
      };

      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(mockOldTicket)
        .mockResolvedValueOnce(mockUpdatedTicket);
      mockUserRepository.findById.mockResolvedValue(mockNewAssignee);
      mockTicketRepository.update.mockResolvedValue(mockUpdatedTicket);
      mockTicketRepository.createManyHistory.mockResolvedValue([]);
      mockCommentRepository.findByTicketId.mockResolvedValue([]);

      const result = await assign({ id: "ticket-123", assigneeId: "user-456" });

      expect(result.ticket.assigneeId).toBe("user-456");
      expect(result.usersToNotify).toHaveLength(0);
      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ticket.assigned" })
      );
    });

    it("should reassign a ticket from one user to another", async () => {
      const mockOldTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        status: "ASSIGNED",
        assigneeId: "user-old",
        assignee: {
          id: "user-old",
          name: "Old Assignee",
          email: "old@test.com",
        },
      };

      const mockNewAssignee = {
        id: "user-new",
        name: "New Assignee",
        email: "new@test.com",
      };

      const mockUpdatedTicket = {
        ...mockOldTicket,
        assigneeId: "user-new",
        assignee: mockNewAssignee,
      };

      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(mockOldTicket)
        .mockResolvedValueOnce(mockUpdatedTicket);
      mockUserRepository.findById.mockResolvedValue(mockNewAssignee);
      mockTicketRepository.update.mockResolvedValue(mockUpdatedTicket);
      mockTicketRepository.createManyHistory.mockResolvedValue([]);
      mockCommentRepository.findByTicketId.mockResolvedValue([]);

      const result = await assign({ id: "ticket-123", assigneeId: "user-new" });

      expect(result.usersToNotify).toHaveLength(0);
      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ticket.assigned" })
      );
    });

    it("should unassign a ticket", async () => {
      const mockOldTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        status: "ASSIGNED",
        assigneeId: "user-456",
        assignee: {
          id: "user-456",
          name: "Assignee",
          email: "assignee@test.com",
        },
      };

      const mockUpdatedTicket = {
        ...mockOldTicket,
        assigneeId: null,
        status: "UNASSIGNED",
        assignee: null,
      };

      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(mockOldTicket)
        .mockResolvedValueOnce(mockUpdatedTicket);
      mockTicketRepository.update.mockResolvedValue(mockUpdatedTicket);
      mockTicketRepository.createManyHistory.mockResolvedValue([]);
      mockCommentRepository.findByTicketId.mockResolvedValue([]);

      const result = await assign({
        id: "ticket-123",
        assigneeId: "Unassigned",
      });

      expect(result.usersToNotify).toHaveLength(0);
      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ticket.assigned" })
      );
    });

    it("should throw not found when ticket does not exist", async () => {
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(
        assign({ id: "nonexistent", assigneeId: "user-456" })
      ).rejects.toThrow("Ticket not found");
    });

    it("should throw error when trying to modify resolved ticket", async () => {
      const mockResolvedTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        status: "RESOLVED",
        assigneeId: "user-456",
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        mockResolvedTicket
      );

      await expect(
        assign({ id: "ticket-123", assigneeId: "user-789" })
      ).rejects.toThrow("Resolved tickets cannot be modified further");
    });

    it("should throw permission denied when user cannot reassign", async () => {
      vi.mocked(canReassignTicket).mockResolvedValue(false);

      await expect(
        assign({ id: "ticket-123", assigneeId: "user-456" })
      ).rejects.toThrow("You do not have permission to reassign tickets");
    });

    it("should throw not found when new assignee does not exist", async () => {
      const mockOldTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        status: "UNASSIGNED",
        assigneeId: null,
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        mockOldTicket
      );
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        assign({ id: "ticket-123", assigneeId: "nonexistent-user" })
      ).rejects.toThrow("New assignee not found");
    });
  });

  describe("update - creator change", () => {
    const mockOldTicket = {
      id: "ticket-123",
      title: "Test Ticket",
      description: "Test Description",
      status: "ASSIGNED",
      urgency: "MEDIUM",
      creatorId: "old-creator-123",
      assigneeId: "user-456",
      creator: {
        id: "old-creator-123",
        name: "Old Creator",
        email: "old@test.com",
        marketCenterId: "mc-123",
      },
      assignee: {
        id: "user-456",
        name: "Assignee",
        email: "assignee@test.com",
        marketCenterId: "mc-123",
      },
      category: {
        id: "cat-123",
        name: "Support",
        marketCenterId: "mc-123",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should change ticket creator successfully", async () => {
      const mockNewCreator = {
        id: "new-creator-456",
        name: "New Creator",
        email: "new@test.com",
        marketCenterId: "mc-123",
      };

      const mockUpdatedTicket = {
        ...mockOldTicket,
        creatorId: "new-creator-456",
        creator: mockNewCreator,
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        mockOldTicket
      );
      mockUserRepository.findById.mockResolvedValue(mockNewCreator);
      mockTicketRepository.update.mockResolvedValue(mockUpdatedTicket);
      mockTicketRepository.createManyHistory.mockResolvedValue([]);

      const result = await update({
        ticketId: "ticket-123",
        creatorId: "new-creator-456",
      });

      expect(result.ticket.creatorId).toBe("new-creator-456");
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        "ticket-123",
        expect.objectContaining({ creatorId: "new-creator-456" })
      );
      expect(mockTicketRepository.createManyHistory).toHaveBeenCalled();
      // Notifications now handled by activity topic
      expect(result.usersToNotify).toHaveLength(0);
      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ticket.updated" })
      );
    });

    it("should throw permission denied when user cannot change creator", async () => {
      vi.mocked(canChangeTicketCreator).mockResolvedValue(false);

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        mockOldTicket
      );

      await expect(
        update({
          ticketId: "ticket-123",
          creatorId: "new-creator-456",
        })
      ).rejects.toThrow("You do not have permission to change the ticket creator");
    });

    it("should throw not found when new creator does not exist", async () => {
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        mockOldTicket
      );
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        update({
          ticketId: "ticket-123",
          creatorId: "nonexistent-user",
        })
      ).rejects.toThrow("New creator not found");
    });

    it("should not change creator when creatorId matches current creator", async () => {
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        mockOldTicket
      );
      mockTicketRepository.update.mockResolvedValue(mockOldTicket);
      mockTicketRepository.createManyHistory.mockResolvedValue([]);

      // Try to update with same creator - should need another field to update
      await expect(
        update({
          ticketId: "ticket-123",
          creatorId: "old-creator-123", // Same as current creator
        })
      ).rejects.toThrow("no fields to update");

      // userRepository.findById should not be called for validation
      // since creator hasn't changed
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it("should not allow creator change on resolved tickets", async () => {
      const resolvedTicket = {
        ...mockOldTicket,
        status: "RESOLVED",
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(
        resolvedTicket
      );

      await expect(
        update({
          ticketId: "ticket-123",
          creatorId: "new-creator-456",
        })
      ).rejects.toThrow("Resolved tickets cannot be modified further");
    });
  });

  describe("update - close with survey (Bug #4)", () => {
    it("should create survey when closing via update for AGENT creator", async () => {
      const agentTicket = {
        id: "ticket-upd-close",
        title: "Agent Update Close",
        status: "IN_PROGRESS",
        creatorId: "agent-u1",
        assigneeId: "staff-u1",
        creator: { id: "agent-u1", name: "Agent", role: "AGENT", marketCenterId: "mc-123" },
        assignee: { id: "staff-u1", name: "Staff", role: "STAFF", marketCenterId: "mc-123" },
        category: { marketCenterId: "mc-123" },
      };

      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(agentTicket)   // oldTicket
        .mockResolvedValueOnce(agentTicket);  // closedTicket re-fetch
      mockSurveyRepository.findOrCreate.mockResolvedValue({ id: "survey-upd" });
      mockTicketRepository.update.mockResolvedValue(agentTicket);
      mockTicketRepository.createHistory.mockResolvedValue(undefined);

      await update({ ticketId: "ticket-upd-close", status: "RESOLVED" });

      expect(mockSurveyRepository.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: "ticket-upd-close",
          surveyorId: "agent-u1",
        })
      );

      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ticket.closed",
          surveyId: "survey-upd",
          creatorRole: "AGENT",
        })
      );
    });
  });

  describe("closeTicket - survey creation (Bug #4)", () => {
    const agentTicket = {
      id: "ticket-close-1",
      title: "Agent's Ticket",
      status: "IN_PROGRESS",
      creatorId: "agent-1",
      assigneeId: "staff-1",
      creator: {
        id: "agent-1",
        name: "Alice Agent",
        role: "AGENT",
        marketCenterId: "mc-123",
      },
      assignee: {
        id: "staff-1",
        name: "Bob Staff",
        role: "STAFF",
        marketCenterId: "mc-123",
      },
      category: { marketCenterId: "mc-123" },
    };

    const staffTicket = {
      ...agentTicket,
      id: "ticket-close-2",
      creatorId: "staff-1",
      creator: {
        id: "staff-1",
        name: "Bob Staff",
        role: "STAFF",
        marketCenterId: "mc-123",
      },
    };

    it("should create survey and publish ticket.closed with surveyId for AGENT creator", async () => {
      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(agentTicket)  // oldTicket
        .mockResolvedValueOnce(agentTicket); // re-fetch after update
      mockSurveyRepository.findOrCreate.mockResolvedValue({ id: "survey-99" });
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);

      await closeTicket({ ticketId: "ticket-close-1", status: "RESOLVED" });

      expect(mockSurveyRepository.findOrCreate).toHaveBeenCalledWith({
        ticketId: "ticket-close-1",
        surveyorId: "agent-1",
        assigneeId: "staff-1",
        marketCenterId: "mc-123",
      });

      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ticket.closed",
          ticketId: "ticket-close-1",
          creatorRole: "AGENT",
          surveyId: "survey-99",
        })
      );
    });

    it("should NOT create survey for non-AGENT creator", async () => {
      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(staffTicket)
        .mockResolvedValueOnce(staffTicket);
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);

      await closeTicket({ ticketId: "ticket-close-2", status: "RESOLVED" });

      expect(mockSurveyRepository.findOrCreate).not.toHaveBeenCalled();

      expect(mockActivityTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ticket.closed",
          creatorRole: "STAFF",
          surveyId: undefined,
        })
      );
    });

    it("should pass surveyId to ticket update when survey is created", async () => {
      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(agentTicket)
        .mockResolvedValueOnce(agentTicket);
      mockSurveyRepository.findOrCreate.mockResolvedValue({ id: "survey-100" });
      mockTicketRepository.update.mockResolvedValue({});
      mockTicketRepository.createHistory.mockResolvedValue(undefined);

      await closeTicket({ ticketId: "ticket-close-1", status: "RESOLVED" });

      expect(mockTicketRepository.update).toHaveBeenCalledWith("ticket-close-1", {
        status: "RESOLVED",
        resolvedAt: expect.any(Date),
        surveyId: "survey-100",
      });
    });
  });
});
