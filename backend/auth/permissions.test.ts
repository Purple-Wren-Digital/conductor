import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockTicketRepository, mockSubscriptionRepository } = vi.hoisted(() => ({
  mockTicketRepository: {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
  },
  mockSubscriptionRepository: {
    canAccessMarketCenter: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
    findByMarketCenterId: vi.fn(),
    getSubscriptionById: vi.fn(),
  },
}));

// Mock ticket/db
vi.mock("../ticket/db", () => ({
  ticketRepository: mockTicketRepository,
}));

// Mock shared/repositories
vi.mock("../shared/repositories", () => ({
  subscriptionRepository: mockSubscriptionRepository,
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", async () => {
  return {
    api: Object.assign(
      // callable api(config, handler)
      vi.fn((config, handler) => handler),
      {
        // api.raw(...)
        raw: vi.fn((config, handler) => handler),
      }
    ),
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
      failedPrecondition: vi.fn((msg) => {
        const err = new Error(msg);
        (err as any).code = "failed_precondition";
        return err;
      }),
    },
  };
});

import {
  requireRole,
  canAccessTicket,
  canModifyTicket,
  canViewTicket,
  canCreateTicket,
  canDeleteTicket,
  canReassignTicket,
  canChangeTicketCreator,
  canViewInternalComments,
  canCreateInternalComments,
  canBeNotifiedAboutComments,
  canManageTeam,
  canChangeUserRoles,
  canModifyUsers,
  canDeactivateUsers,
  canModifyOwnProfile,
  canCreateMarketCenters,
  canManageMarketCenters,
  canDeleteMarketCenters,
  getTicketScopeFilter,
  getUserScopeFilter,
  marketCenterScopeFilter,
  getAccessibleMarketCenterIds,
} from "./permissions";
import type { UserContext } from "./user-context";
import { fail } from "assert";

// Helper to create UserContext
function createUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    name: "Test User",
    userId: "user-123",
    email: "user@test.com",
    role: "AGENT",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    ...overrides,
  };
}

// Helper to create a ticket with relations
function createTicketWithRelations(overrides: any = {}) {
  return {
    id: "ticket-123",
    creatorId: "creator-123",
    assigneeId: "assignee-123",
    category: {
      id: "cat-123",
      marketCenterId: "mc-123",
    },
    creator: {
      id: "creator-123",
      marketCenterId: "mc-123",
    },
    assignee: {
      id: "assignee-123",
      marketCenterId: "mc-456",
    },
    ...overrides,
  };
}

describe("Permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
      id: "sub-123",
      marketCenterId: "mc-123",
      status: "ACTIVE",
      planType: "ENTERPRISE",
    });
  });

  describe("requireRole", () => {
    it("should not throw when user has required role", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      await expect(requireRole(userContext, ["ADMIN"])).resolves.not.toThrow();
    });

    it("should not throw when user has one of multiple required roles", async () => {
      const userContext = createUserContext({ role: "STAFF" });
      await expect(
        requireRole(userContext, ["ADMIN", "STAFF", "STAFF_LEADER"])
      ).resolves.not.toThrow();
    });

    it("should throw when user does not have required role", async () => {
      const userContext = createUserContext({ role: "AGENT" });
      await expect(requireRole(userContext, ["ADMIN"])).rejects.toThrow(
        "User does not have required role"
      );
    });

    it("should throw with descriptive message showing required and current roles", async () => {
      const userContext = createUserContext({ role: "AGENT" });
      await expect(
        requireRole(userContext, ["ADMIN", "STAFF"])
      ).rejects.toThrow("Required: ADMIN, STAFF, Current: AGENT");
    });
  });

  describe("canAccessTicket", () => {
    describe("ADMIN role", () => {
      it("should return true for any ticket", async () => {
        const userContext = createUserContext({ role: "ADMIN" });
        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
        expect(
          mockTicketRepository.findByIdWithRelations
        ).not.toHaveBeenCalled();
      });
    });

    describe("STAFF_LEADER role", () => {
      it("should return true for any ticket", async () => {
        const userContext = createUserContext({ role: "STAFF_LEADER" });
        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
        expect(
          mockTicketRepository.findByIdWithRelations
        ).not.toHaveBeenCalled();
      });
    });

    describe("AGENT role", () => {
      it("should return true when agent is the ticket creator", async () => {
        const userContext = createUserContext({
          role: "AGENT",
          userId: "agent-123",
        });
        const ticket = createTicketWithRelations({ creatorId: "agent-123" });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
      });

      it("should return false when agent is not the ticket creator", async () => {
        const userContext = createUserContext({
          role: "AGENT",
          userId: "agent-123",
        });
        const ticket = createTicketWithRelations({ creatorId: "other-user" });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(false);
      });

      it("should return false when ticket does not exist", async () => {
        const userContext = createUserContext({ role: "AGENT" });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(null);

        const result = await canAccessTicket(userContext, "nonexistent");
        expect(result).toBe(false);
      });
    });

    describe("STAFF role", () => {
      it("should return true when ticket category is in staff's market center", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          userId: "staff-123",
          marketCenterId: "mc-123",
        });
        const ticket = createTicketWithRelations({
          category: { marketCenterId: "mc-123" },
          creatorId: "other-user",
          assigneeId: null,
        });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
      });

      it("should return true when ticket creator is in staff's market center", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          marketCenterId: "mc-123",
        });
        const ticket = createTicketWithRelations({
          category: { marketCenterId: "other-mc" },
          creator: { marketCenterId: "mc-123" },
        });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
      });

      it("should return true when staff is the ticket creator", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          userId: "staff-123",
          marketCenterId: "mc-123",
        });
        const ticket = createTicketWithRelations({
          creatorId: "staff-123",
          category: { marketCenterId: "other-mc" },
          creator: { marketCenterId: "other-mc" },
        });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
      });

      it("should return true when ticket assignee is in staff's market center", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          marketCenterId: "mc-123",
        });
        const ticket = createTicketWithRelations({
          category: { marketCenterId: "other-mc" },
          creator: { marketCenterId: "other-mc" },
          assignee: { marketCenterId: "mc-123" },
        });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
      });

      it("should return true when staff is the ticket assignee", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          userId: "staff-123",
          marketCenterId: "mc-123",
        });
        const ticket = createTicketWithRelations({
          assigneeId: "staff-123",
          category: { marketCenterId: "other-mc" },
          creator: { marketCenterId: "other-mc" },
          assignee: { marketCenterId: "other-mc" },
        });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(true);
      });

      it("should return false when ticket has no relation to staff's market center", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          userId: "staff-123",
          marketCenterId: "mc-123",
        });
        const ticket = createTicketWithRelations({
          creatorId: "other-user",
          assigneeId: "other-assignee",
          category: { marketCenterId: "other-mc" },
          creator: { marketCenterId: "other-mc" },
          assignee: { marketCenterId: "other-mc" },
        });
        mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

        const result = await canAccessTicket(userContext, "ticket-123");
        expect(result).toBe(false);
      });
    });
  });

  describe("canModifyTicket", () => {
    it("should return true for ADMIN role", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canModifyTicket(userContext, "ticket-123");
      expect(result).toBe(true);
    });

    it("should return true for AGENT when they are the creator", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        userId: "agent-123",
      });
      mockTicketRepository.findById.mockResolvedValue({
        id: "ticket-123",
        creatorId: "agent-123",
      });

      const result = await canModifyTicket(userContext, "ticket-123");
      expect(result).toBe(true);
    });

    it("should return false for AGENT when they are not the creator", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        userId: "agent-123",
      });
      mockTicketRepository.findById.mockResolvedValue({
        id: "ticket-123",
        creatorId: "other-user",
      });

      const result = await canModifyTicket(userContext, "ticket-123");
      expect(result).toBe(false);
    });

    it("should delegate to canAccessTicket for STAFF role", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        marketCenterId: "mc-123",
      });
      const ticket = createTicketWithRelations({
        category: { marketCenterId: "mc-123" },
      });
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);

      const result = await canModifyTicket(userContext, "ticket-123");
      expect(result).toBe(true);
    });

    it("should delegate to canAccessTicket for STAFF_LEADER role", async () => {
      const userContext = createUserContext({ role: "STAFF_LEADER" });
      const result = await canModifyTicket(userContext, "ticket-123");
      expect(result).toBe(true);
    });
  });

  describe("canViewTicket", () => {
    it("should delegate to canAccessTicket", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canViewTicket(userContext, "ticket-123");
      expect(result).toBe(true);
    });
  });

  describe("canCreateTicket", () => {
    it("should return true when userContext exists with role", async () => {
      const userContext = createUserContext();
      const result = await canCreateTicket(userContext);
      expect(result).toBe(true);
    });

    it("should return false when userContext is undefined", async () => {
      const result = await canCreateTicket(undefined);
      expect(result).toBe(false);
    });

    it("should return false when userContext has no role", async () => {
      const result = await canCreateTicket({ role: undefined } as any);
      expect(result).toBe(false);
    });
  });

  describe("canDeleteTicket", () => {
    it("should delegate to canAccessTicket", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canDeleteTicket(userContext, "ticket-123");
      expect(result).toBe(true);
    });
  });

  describe("canReassignTicket", () => {
    it("should return false when newAssigneeId is not provided", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canReassignTicket({ userContext });
      expect(result).toBe(false);
    });

    it("should return false for AGENT role", async () => {
      const userContext = createUserContext({ role: "AGENT" });
      const result = await canReassignTicket({
        userContext,
        newAssigneeId: "new-assignee",
      });
      expect(result).toBe(false);
    });

    it("should return true for ADMIN role", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canReassignTicket({
        userContext,
        newAssigneeId: "new-assignee",
      });
      expect(result).toBe(true);
    });

    it("should return true for STAFF_LEADER role", async () => {
      const userContext = createUserContext({ role: "STAFF_LEADER" });
      const result = await canReassignTicket({
        userContext,
        newAssigneeId: "new-assignee",
      });
      expect(result).toBe(true);
    });

    it("should return true for STAFF when assigning to themselves", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        userId: "staff-123",
      });
      const result = await canReassignTicket({
        userContext,
        newAssigneeId: "staff-123",
      });
      expect(result).toBe(true);
    });

    it("should return true for STAFF when unassigning", async () => {
      const userContext = createUserContext({ role: "STAFF" });
      const result = await canReassignTicket({
        userContext,
        newAssigneeId: "unassigned",
      });
      expect(result).toBe(true);
    });

    it("should return false for STAFF when assigning to someone else", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        userId: "staff-123",
      });
      const result = await canReassignTicket({
        userContext,
        newAssigneeId: "other-staff",
      });
      expect(result).toBe(false);
    });
  });

  describe("canChangeTicketCreator", () => {
    it("should return true for ADMIN", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canChangeTicketCreator(userContext);
      expect(result).toBe(true);
    });

    it("should return true for STAFF_LEADER", async () => {
      const userContext = createUserContext({ role: "STAFF_LEADER" });
      const result = await canChangeTicketCreator(userContext);
      expect(result).toBe(true);
    });

    it("should return false for STAFF", async () => {
      const userContext = createUserContext({ role: "STAFF" });
      const result = await canChangeTicketCreator(userContext);
      expect(result).toBe(false);
    });

    it("should return false for AGENT", async () => {
      const userContext = createUserContext({ role: "AGENT" });
      const result = await canChangeTicketCreator(userContext);
      expect(result).toBe(false);
    });
  });

  describe("canViewInternalComments", () => {
    it("should return true for ADMIN", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canViewInternalComments(userContext);
      expect(result).toBe(true);
    });

    it("should return true for STAFF", async () => {
      const userContext = createUserContext({ role: "STAFF" });
      const result = await canViewInternalComments(userContext);
      expect(result).toBe(true);
    });

    it("should return true for STAFF_LEADER", async () => {
      const userContext = createUserContext({ role: "STAFF_LEADER" });
      const result = await canViewInternalComments(userContext);
      expect(result).toBe(true);
    });

    it("should return false for AGENT", async () => {
      const userContext = createUserContext({ role: "AGENT" });
      const result = await canViewInternalComments(userContext);
      expect(result).toBe(false);
    });
  });

  describe("canCreateInternalComments", () => {
    it("should return true for ADMIN", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canCreateInternalComments(userContext);
      expect(result).toBe(true);
    });

    it("should return true for STAFF", async () => {
      const userContext = createUserContext({ role: "STAFF" });
      const result = await canCreateInternalComments(userContext);
      expect(result).toBe(true);
    });

    it("should return true for STAFF_LEADER", async () => {
      const userContext = createUserContext({ role: "STAFF_LEADER" });
      const result = await canCreateInternalComments(userContext);
      expect(result).toBe(true);
    });

    it("should return false for AGENT", async () => {
      const userContext = createUserContext({ role: "AGENT" });
      const result = await canCreateInternalComments(userContext);
      expect(result).toBe(false);
    });
  });

  describe("canBeNotifiedAboutComments", () => {
    it("should return true for non-internal comments for any role", async () => {
      expect(
        await canBeNotifiedAboutComments({
          userId: "agent-123",
          role: "AGENT",
          isInternal: false,
          currentUserId: "current-user",
        })
      ).toBe(true);
      expect(
        await canBeNotifiedAboutComments({
          userId: "staff-123",
          role: "STAFF",
          isInternal: false,
          currentUserId: "current-user",
        })
      ).toBe(true);
      expect(
        await canBeNotifiedAboutComments({
          userId: "admin-123",
          role: "ADMIN",
          isInternal: false,
          currentUserId: "current-user",
        })
      ).toBe(true);
    });

    it("should return true for internal comments for ADMIN", async () => {
      const result = await canBeNotifiedAboutComments({
        userId: "admin-123",
        role: "ADMIN",
        isInternal: true,
        currentUserId: "current-user",
      });
      expect(result).toBe(true);
    });

    it("should return true for internal comments for STAFF", async () => {
      const result = await canBeNotifiedAboutComments({
        userId: "staff-123",
        role: "STAFF",
        isInternal: true,
        currentUserId: "current-user",
      });
      expect(result).toBe(true);
    });

    it("should return true for internal comments for STAFF_LEADER", async () => {
      const result = await canBeNotifiedAboutComments({
        userId: "staff-leader-123",
        role: "STAFF_LEADER",
        isInternal: true,
        currentUserId: "current-user",
      });
      expect(result).toBe(true);
    });

    it("should return false for internal comments for AGENT", async () => {
      const result = await canBeNotifiedAboutComments({
        userId: "agent-123",
        role: "AGENT",
        isInternal: true,
        currentUserId: "current-user",
      });
      expect(result).toBe(false);
    });
  });

  describe("canManageTeam", () => {
    it("should return true for ADMIN", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canManageTeam(userContext);
      expect(result).toBe(true);
    });

    it("should return true when managing own profile", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        userId: "user-123",
      });
      const result = await canManageTeam(userContext, "user-123");
      expect(result).toBe(true);
    });

    it("should return true for STAFF in same market center", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        marketCenterId: "mc-123",
      });
      const result = await canManageTeam(userContext, "other-user", "mc-123");
      expect(result).toBe(true);
    });

    it("should return true for STAFF_LEADER in same market center", async () => {
      const userContext = createUserContext({
        role: "STAFF_LEADER",
        marketCenterId: "mc-123",
      });
      const result = await canManageTeam(userContext, "other-user", "mc-123");
      expect(result).toBe(true);
    });

    it("should return false for STAFF in different market center", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        marketCenterId: "mc-123",
      });
      const result = await canManageTeam(userContext, "other-user", "mc-456");
      expect(result).toBe(false);
    });

    it("should return false for AGENT trying to manage others", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        userId: "user-123",
      });
      const result = await canManageTeam(userContext, "other-user", "mc-123");
      expect(result).toBe(false);
    });
  });

  describe("canChangeUserRoles", () => {
    it("should return true for ADMIN", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await canChangeUserRoles(userContext);
      expect(result).toBe(true);
    });

    it("should return false for non-ADMIN roles", async () => {
      expect(
        await canChangeUserRoles(createUserContext({ role: "STAFF" }))
      ).toBe(false);
      expect(
        await canChangeUserRoles(createUserContext({ role: "STAFF_LEADER" }))
      ).toBe(false);
      expect(
        await canChangeUserRoles(createUserContext({ role: "AGENT" }))
      ).toBe(false);
    });
  });

  describe("canModifyUsers", () => {
    it("should return true only for ADMIN", async () => {
      expect(await canModifyUsers(createUserContext({ role: "ADMIN" }))).toBe(
        true
      );
      expect(await canModifyUsers(createUserContext({ role: "STAFF" }))).toBe(
        false
      );
      expect(
        await canModifyUsers(createUserContext({ role: "STAFF_LEADER" }))
      ).toBe(false);
      expect(await canModifyUsers(createUserContext({ role: "AGENT" }))).toBe(
        false
      );
    });
  });

  describe("canDeactivateUsers", () => {
    it("should return true only for ADMIN", async () => {
      expect(
        await canDeactivateUsers(createUserContext({ role: "ADMIN" }))
      ).toBe(true);
      expect(
        await canDeactivateUsers(createUserContext({ role: "STAFF" }))
      ).toBe(false);
      expect(
        await canDeactivateUsers(createUserContext({ role: "STAFF_LEADER" }))
      ).toBe(false);
      expect(
        await canDeactivateUsers(createUserContext({ role: "AGENT" }))
      ).toBe(false);
    });
  });

  describe("canModifyOwnProfile", () => {
    it("should return true when userId matches", async () => {
      const userContext = createUserContext({ userId: "user-123" });
      const result = await canModifyOwnProfile(userContext, "user-123");
      expect(result).toBe(true);
    });

    it("should return false when userId does not match", async () => {
      const userContext = createUserContext({ userId: "user-123" });
      const result = await canModifyOwnProfile(userContext, "other-user");
      expect(result).toBe(false);
    });
  });

  describe("Market Center permissions", () => {
    describe("canCreateMarketCenters", () => {
      it("returns true for ADMIN with Enterprise subscription", async () => {
        mockSubscriptionRepository.getSubscriptionById.mockResolvedValue({
          status: "ACTIVE",
          planType: "ENTERPRISE",
          marketCenterId: "mc-123",
        });

        expect(await canCreateMarketCenters("mc-123", "ADMIN")).toBe(true);
      });

      it("returns false for non-admin roles", async () => {
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
          status: "ACTIVE",
          planType: "ENTERPRISE",
          marketCenterId: "mc-123",
        });
        const userContext = createUserContext({
          role: "STAFF",
          marketCenterId: "mc-123",
        });
        expect(
          await canCreateMarketCenters(
            userContext.marketCenterId ?? "",
            userContext.role
          )
        ).toBe(false);
      });

      it("throws if no active subscription exists", async () => {
        const userContext = createUserContext({
          role: "ADMIN",
          marketCenterId: "mc-123",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
          status: "INACTIVE",
          planType: "ENTERPRISE",
          marketCenterId: "mc-123",
        });

        await expect(
          canCreateMarketCenters("mc-123", "ADMIN")
        ).rejects.toThrow();
      });
    });

    describe("canManageMarketCenters", () => {
      it("should return true only for ADMIN", async () => {
        expect(
          await canManageMarketCenters(createUserContext({ role: "ADMIN" }))
        ).toBe(true);
        expect(
          await canManageMarketCenters(createUserContext({ role: "STAFF" }))
        ).toBe(false);
      });
    });

    describe("canDeleteMarketCenters", () => {
      it("should return true only for ADMIN", async () => {
        expect(
          await canDeleteMarketCenters(createUserContext({ role: "ADMIN" }))
        ).toBe(true);
        expect(
          await canDeleteMarketCenters(createUserContext({ role: "STAFF" }))
        ).toBe(false);
      });
    });
  });

  describe("getTicketScopeFilter", () => {
    it("should return empty object for ADMIN without marketCenterId", async () => {
      const userContext = createUserContext({
        role: "ADMIN",
        marketCenterId: null,
      });
      const result = await getTicketScopeFilter(userContext);
      expect(result).toEqual({});
    });

    it("should return market center OR filter for ADMIN with marketCenterId", async () => {
      const userContext = createUserContext({
        role: "ADMIN",
        marketCenterId: "mc-123",
      });
      const result = await getTicketScopeFilter(userContext, "mc-456");
      expect(result).toHaveProperty("OR");
      expect((result as any).OR.length).toBe(5);
    });

    it("should return market center OR filter for STAFF_LEADER with marketCenterId", async () => {
      const userContext = createUserContext({
        role: "STAFF_LEADER",
        marketCenterId: "mc-123",
      });
      const result = await getTicketScopeFilter(userContext);
      expect(result).toHaveProperty("OR");
      expect((result as any).OR.length).toBe(5);
    });

    it("should return user-specific filter for STAFF with marketCenterId", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        userId: "staff-123",
        marketCenterId: "mc-123",
      });
      const result = await getTicketScopeFilter(userContext);
      expect(result).toHaveProperty("OR");
      expect((result as any).OR).toContainEqual({
        assigneeId: "staff-123",
      });
    });

    it("should return user-specific filter for STAFF without marketCenterId", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        userId: "staff-123",
        marketCenterId: null,
      });
      const result = await getTicketScopeFilter(userContext);
      expect(result).toHaveProperty("OR");
      expect((result as any).OR).toContainEqual({
        assigneeId: "staff-123",
      });
      expect((result as any).OR).toContainEqual({
        creatorId: "staff-123",
      });
    });

    it("should return creatorId filter for AGENT", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        userId: "agent-123",
      });
      const result = await getTicketScopeFilter(userContext);
      expect(result).toEqual({ creatorId: "agent-123" });
    });

    it("should return impossible filter for unknown role", async () => {
      const userContext = createUserContext({ role: "UNKNOWN" as any });
      const result = await getTicketScopeFilter(userContext);
      expect(result).toEqual({ id: "impossible-id" });
    });
  });

  describe("getUserScopeFilter", () => {
    it("should return empty object for ADMIN", async () => {
      const userContext = createUserContext({ role: "ADMIN" });
      const result = await getUserScopeFilter(userContext);
      expect(result).toEqual({});
    });

    it("should return marketCenterId filter for STAFF with market center", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        marketCenterId: "mc-123",
      });
      const result = await getUserScopeFilter(userContext);
      expect(result).toEqual({ marketCenterId: "mc-123" });
    });

    it("should return marketCenterId filter for STAFF_LEADER with market center", async () => {
      const userContext = createUserContext({
        role: "STAFF_LEADER",
        marketCenterId: "mc-123",
      });
      const result = await getUserScopeFilter(userContext);
      expect(result).toEqual({ marketCenterId: "mc-123" });
    });

    it("should return userId filter for other cases", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        userId: "agent-123",
      });
      const result = await getUserScopeFilter(userContext);
      expect(result).toEqual({ id: "agent-123" });
    });
  });

  describe("marketCenterScopeFilter", () => {
    describe("ADMIN role - subscription-based access", () => {
      it("should return marketCenterId when Admin can access market center (Enterprise)", async () => {
        mockSubscriptionRepository.canAccessMarketCenter.mockResolvedValue(
          true
        );
        const userContext = createUserContext({
          role: "ADMIN",
          marketCenterId: "mc-123",
        });
        const result = await marketCenterScopeFilter(userContext, "mc-456");
        expect(result).toEqual({ id: "mc-456" });
        expect(
          mockSubscriptionRepository.canAccessMarketCenter
        ).toHaveBeenCalledWith("mc-123", "mc-456");
      });

      it("should return null when Admin cannot access market center (non-Enterprise)", async () => {
        mockSubscriptionRepository.canAccessMarketCenter.mockResolvedValue(
          false
        );
        const userContext = createUserContext({
          role: "ADMIN",
          marketCenterId: "mc-123",
        });
        const result = await marketCenterScopeFilter(userContext, "mc-456");
        expect(result).toBeNull();
      });

      it("should allow Admin to access their own market center", async () => {
        mockSubscriptionRepository.canAccessMarketCenter.mockResolvedValue(
          true
        );
        const userContext = createUserContext({
          role: "ADMIN",
          marketCenterId: "mc-123",
        });
        const result = await marketCenterScopeFilter(userContext, "mc-123");
        expect(result).toEqual({ id: "mc-123" });
      });
    });

    it("should return user's marketCenterId for STAFF", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        marketCenterId: "mc-123",
      });
      const result = await marketCenterScopeFilter(userContext, "mc-456");
      expect(result).toEqual({ id: "mc-123" });
    });

    it("should return user's marketCenterId for STAFF_LEADER", async () => {
      const userContext = createUserContext({
        role: "STAFF_LEADER",
        marketCenterId: "mc-123",
      });
      const result = await marketCenterScopeFilter(userContext, "mc-456");
      expect(result).toEqual({ id: "mc-123" });
    });

    it("should return user's marketCenterId for AGENT", async () => {
      const userContext = createUserContext({
        role: "AGENT",
        marketCenterId: "mc-123",
      });
      const result = await marketCenterScopeFilter(userContext, "mc-456");
      expect(result).toEqual({ id: "mc-123" });
    });

    it("should return null for users without marketCenterId", async () => {
      const userContext = createUserContext({
        role: "STAFF",
        marketCenterId: null,
      });
      const result = await marketCenterScopeFilter(userContext, "mc-456");
      expect(result).toBeNull();
    });
  });

  describe("getAccessibleMarketCenterIds", () => {
    it("should return empty array when user has no marketCenterId", async () => {
      const userContext = createUserContext({
        role: "ADMIN",
        marketCenterId: null,
      });
      const result = await getAccessibleMarketCenterIds(userContext);
      expect(result).toEqual([]);
    });

    describe("ADMIN role - uses subscription repository", () => {
      it("should delegate to subscriptionRepository for ADMIN", async () => {
        mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue(
          ["mc-1", "mc-2", "mc-3"]
        );
        const userContext = createUserContext({
          role: "ADMIN",
          marketCenterId: "mc-1",
        });

        const result = await getAccessibleMarketCenterIds(userContext);

        expect(result).toEqual(["mc-1", "mc-2", "mc-3"]);
        expect(
          mockSubscriptionRepository.getAccessibleMarketCenterIds
        ).toHaveBeenCalledWith("mc-1");
      });

      it("should return single market center for non-Enterprise admin", async () => {
        mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue(
          ["mc-123"]
        );
        const userContext = createUserContext({
          role: "ADMIN",
          marketCenterId: "mc-123",
        });

        const result = await getAccessibleMarketCenterIds(userContext);

        expect(result).toEqual(["mc-123"]);
      });
    });

    describe("Non-ADMIN roles - returns only own market center", () => {
      it("should return only own market center for STAFF", async () => {
        const userContext = createUserContext({
          role: "STAFF",
          marketCenterId: "mc-123",
        });

        const result = await getAccessibleMarketCenterIds(userContext);

        expect(result).toEqual(["mc-123"]);
        expect(
          mockSubscriptionRepository.getAccessibleMarketCenterIds
        ).not.toHaveBeenCalled();
      });

      it("should return only own market center for STAFF_LEADER", async () => {
        const userContext = createUserContext({
          role: "STAFF_LEADER",
          marketCenterId: "mc-123",
        });

        const result = await getAccessibleMarketCenterIds(userContext);

        expect(result).toEqual(["mc-123"]);
      });

      it("should return only own market center for AGENT", async () => {
        const userContext = createUserContext({
          role: "AGENT",
          marketCenterId: "mc-123",
        });

        const result = await getAccessibleMarketCenterIds(userContext);

        expect(result).toEqual(["mc-123"]);
      });
    });
  });
});
