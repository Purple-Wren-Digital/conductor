import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockDb, mockUserRepository, mockTicketRepository, mockSettingsAuditRepository, mockUserContext } = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
  mockUserRepository: {
    findById: vi.fn(),
    findByIdWithMarketCenter: vi.fn(),
    findByMarketCenterIdAndRole: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  mockTicketRepository: {
    updateManyByAssignee: vi.fn(),
  },
  mockSettingsAuditRepository: {
    create: vi.fn(),
    findByMarketCenterId: vi.fn(),
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
    aborted: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "aborted";
      return err;
    }),
  },
}));

// Mock ticket/db which is used for raw queries
vi.mock("../ticket/db", () => ({
  db: mockDb,
}));

// Mock settings/db which exports repositories
vi.mock("./db", () => ({
  db: mockDb,
  userRepository: mockUserRepository,
  ticketRepository: mockTicketRepository,
  settingsAuditRepository: mockSettingsAuditRepository,
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock permissions
vi.mock("../auth/permissions", () => ({
  canChangeUserRoles: vi.fn(() => Promise.resolve(true)),
  canManageTeam: vi.fn(() => Promise.resolve(true)),
  getUserScopeFilter: vi.fn(() => ({})),
  isSuperuserProtected: vi.fn(() => false),
}));

// Import after mocks
import { getTeamMembers } from "./team-members";
import { updateMemberRole } from "./team-role";
import { removeTeamMember } from "./team-remove";
import { getSettingsAuditLog } from "./audit-log";
import { getUserContext } from "../auth/user-context";
import { canChangeUserRoles, canManageTeam } from "../auth/permissions";

describe("Settings Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default user context
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    vi.mocked(canChangeUserRoles).mockResolvedValue(true);
    vi.mocked(canManageTeam).mockResolvedValue(true);
  });

  describe("getTeamMembers", () => {
    it("should return team members and invitations", async () => {
      const mockMembers = [
        { id: "user-1", email: "admin@test.com", name: "Admin", role: "ADMIN", isActive: true, createdAt: new Date() },
        { id: "user-2", email: "staff@test.com", name: "Staff", role: "STAFF", isActive: true, createdAt: new Date() },
      ];
      const mockInvitations = [
        { id: "inv-1", email: "new@test.com", role: "STAFF", createdAt: new Date(), expiresAt: new Date() },
      ];

      mockDb.queryAll
        .mockResolvedValueOnce(mockMembers)
        .mockResolvedValueOnce(mockInvitations);

      const result = await getTeamMembers();

      expect(result.members).toHaveLength(2);
      expect(result.invitations).toHaveLength(1);
      expect(result.members[0].email).toBe("admin@test.com");
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "user-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
      });

      await expect(getTeamMembers()).rejects.toThrow(
        "Insufficient permissions to view team members"
      );
    });

    it("should return empty arrays when no members exist", async () => {
      mockDb.queryAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getTeamMembers();

      expect(result.members).toEqual([]);
      expect(result.invitations).toEqual([]);
    });

    it("should handle null names gracefully", async () => {
      const mockMembers = [
        { id: "user-1", email: "user@test.com", name: null, role: "STAFF", isActive: true, createdAt: new Date() },
      ];

      mockDb.queryAll
        .mockResolvedValueOnce(mockMembers)
        .mockResolvedValueOnce([]);

      const result = await getTeamMembers();

      expect(result.members[0].name).toBe("");
    });
  });

  describe("updateMemberRole", () => {
    it("should update a member's role successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: "admin@test.com",
        role: "ADMIN",
        marketCenterId: "mc-123",
        marketCenter: { id: "mc-123", name: "Test MC" },
      };

      const mockUserToUpdate = {
        id: "user-456",
        email: "staff@test.com",
        role: "STAFF",
        marketCenterId: "mc-123",
        isActive: true,
      };

      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue(mockUser);
      mockUserRepository.findById.mockResolvedValue(mockUserToUpdate);
      mockUserRepository.update.mockResolvedValue({ ...mockUserToUpdate, role: "AGENT" });
      mockSettingsAuditRepository.create.mockResolvedValue({});

      const result = await updateMemberRole({ id: "user-456", role: "AGENT" });

      expect(result.success).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith("user-456", { role: "AGENT" });
      expect(mockSettingsAuditRepository.create).toHaveBeenCalled();
    });

    it("should throw permission denied when user cannot change roles", async () => {
      vi.mocked(canChangeUserRoles).mockResolvedValue(false);

      await expect(
        updateMemberRole({ id: "user-456", role: "AGENT" })
      ).rejects.toThrow("Only administrators can update member roles");
    });

    it("should throw not found when user does not exist", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue(null);

      await expect(
        updateMemberRole({ id: "user-456", role: "AGENT" })
      ).rejects.toThrow("User not found");
    });

    it("should throw not found when user has no market center", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user-123",
        marketCenter: null,
      });

      await expect(
        updateMemberRole({ id: "user-456", role: "AGENT" })
      ).rejects.toThrow("Market center not found");
    });

    it("should throw not found when target user is not in same market center", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user-123",
        marketCenterId: "mc-123",
        marketCenter: { id: "mc-123" },
      });
      mockUserRepository.findById.mockResolvedValue({
        id: "user-456",
        marketCenterId: "different-mc",
        isActive: true,
      });

      await expect(
        updateMemberRole({ id: "user-456", role: "AGENT" })
      ).rejects.toThrow("User not found or not in your market center");
    });

    it("should prevent last admin from downgrading themselves", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user-123",
        marketCenterId: "mc-123",
        marketCenter: { id: "mc-123" },
      });
      mockUserRepository.findById.mockResolvedValue({
        id: "user-123", // same user
        role: "ADMIN",
        marketCenterId: "mc-123",
        isActive: true,
      });
      mockUserRepository.count.mockResolvedValue(1);
      mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValue([
        { id: "user-123", role: "ADMIN" },
      ]);

      await expect(
        updateMemberRole({ id: "user-123", role: "STAFF" })
      ).rejects.toThrow("Cannot downgrade the last admin");
    });

    it("should reassign tickets when downgrading to AGENT", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user-123",
        marketCenterId: "mc-123",
        marketCenter: { id: "mc-123" },
      });
      mockUserRepository.findById.mockResolvedValue({
        id: "user-456",
        role: "STAFF",
        marketCenterId: "mc-123",
        isActive: true,
      });
      mockUserRepository.update.mockResolvedValue({});
      mockTicketRepository.updateManyByAssignee.mockResolvedValue({ count: 3 });
      mockSettingsAuditRepository.create.mockResolvedValue({});

      await updateMemberRole({ id: "user-456", role: "AGENT" });

      expect(mockTicketRepository.updateManyByAssignee).toHaveBeenCalledWith(
        "user-456",
        { assigneeId: "user-123" },
        { statusIn: ["ASSIGNED", "IN_PROGRESS", "AWAITING_RESPONSE"] }
      );
    });
  });

  describe("removeTeamMember", () => {
    it("should remove a team member successfully", async () => {
      mockDb.queryRow
        .mockResolvedValueOnce({ id: "user-123", marketCenterId: "mc-123", role: "ADMIN" })
        .mockResolvedValueOnce({ id: "user-456", role: "STAFF" });
      vi.mocked(canManageTeam).mockResolvedValue(true);
      mockDb.exec.mockResolvedValue({ rowsAffected: 1 });

      const result = await removeTeamMember({ id: "user-456" });

      expect(result.success).toBe(true);
      expect(mockDb.exec).toHaveBeenCalled();
    });

    it("should throw permission denied when user cannot manage team", async () => {
      mockDb.queryRow.mockResolvedValueOnce({
        id: "user-123",
        marketCenterId: "mc-123",
        role: "ADMIN",
      });
      vi.mocked(canManageTeam).mockResolvedValue(false);

      await expect(removeTeamMember({ id: "user-456" })).rejects.toThrow(
        "You do not have permission to remove team members"
      );
    });

    it("should throw not found when user to remove does not exist", async () => {
      mockDb.queryRow
        .mockResolvedValueOnce({ id: "user-123", marketCenterId: "mc-123", role: "ADMIN" })
        .mockResolvedValueOnce(null);
      vi.mocked(canManageTeam).mockResolvedValue(true);

      await expect(removeTeamMember({ id: "nonexistent" })).rejects.toThrow(
        "User not found or not in your market center"
      );
    });

    it("should prevent self-removal", async () => {
      mockDb.queryRow
        .mockResolvedValueOnce({ id: "user-123", marketCenterId: "mc-123", role: "ADMIN" })
        .mockResolvedValueOnce({ id: "user-123", role: "ADMIN" });
      vi.mocked(canManageTeam).mockResolvedValue(true);

      await expect(removeTeamMember({ id: "user-123" })).rejects.toThrow(
        "Cannot remove yourself"
      );
    });

    it("should prevent staff from removing admins", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "user-123",
        email: "staff@test.com",
        role: "STAFF" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-staff",
      });
      mockDb.queryRow
        .mockResolvedValueOnce({ id: "user-123", marketCenterId: "mc-123", role: "STAFF" })
        .mockResolvedValueOnce({ id: "user-456", role: "ADMIN" });
      vi.mocked(canManageTeam).mockResolvedValue(true);

      await expect(removeTeamMember({ id: "user-456" })).rejects.toThrow(
        "Staff cannot remove administrators"
      );
    });

    it("should prevent removing the last admin", async () => {
      mockDb.queryRow
        .mockResolvedValueOnce({ id: "user-123", marketCenterId: "mc-123", role: "ADMIN" })
        .mockResolvedValueOnce({ id: "user-456", role: "ADMIN" })
        .mockResolvedValueOnce({ count: 1 }); // Only 1 admin
      vi.mocked(canManageTeam).mockResolvedValue(true);

      await expect(removeTeamMember({ id: "user-456" })).rejects.toThrow(
        "Cannot remove the last admin"
      );
    });
  });

  describe("getSettingsAuditLog", () => {
    it("should return audit logs for admin users", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user_1",
        role: "ADMIN",
        marketCenter: { id: "mc-123", name: "Test MC" },
      });

      const mockLogs = [
        {
          id: "log-1",
          action: "update",
          section: "branding",
          createdAt: new Date(),
          previousValue: { color: "blue" },
          newValue: { color: "red" },
        },
        {
          id: "log-2",
          action: "update",
          section: "businessHours",
          createdAt: new Date(),
          previousValue: {},
          newValue: {},
        },
      ];

      mockSettingsAuditRepository.findByMarketCenterId.mockResolvedValue({
        logs: mockLogs,
        total: 2,
      });

      const result = await getSettingsAuditLog({});

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should throw not found when user does not exist", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue(null);

      await expect(getSettingsAuditLog({})).rejects.toThrow("User not found");
    });

    it("should throw permission denied for non-admin users", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user_1",
        role: "STAFF",
        marketCenter: { id: "mc-123" },
      });

      await expect(getSettingsAuditLog({})).rejects.toThrow(
        "Only administrators can view audit logs"
      );
    });

    it("should apply filters correctly", async () => {
      mockUserRepository.findByIdWithMarketCenter.mockResolvedValue({
        id: "user_1",
        role: "ADMIN",
        marketCenter: { id: "mc-123" },
      });

      mockSettingsAuditRepository.findByMarketCenterId.mockResolvedValue({
        logs: [],
        total: 0,
      });

      await getSettingsAuditLog({
        section: "branding",
        action: "update",
        limit: 10,
        offset: 5,
      });

      expect(mockSettingsAuditRepository.findByMarketCenterId).toHaveBeenCalledWith(
        "mc-123",
        {
          section: "branding",
          action: "update",
          limit: 10,
          offset: 5,
        }
      );
    });
  });
});
