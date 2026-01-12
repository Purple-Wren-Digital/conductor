import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockGetUserContext,
  mockGetAuthData,
  mockCanManageTeam,
  mockCheckCanAddUser,
  mockUserRepository,
  mockMarketCenterRepository,
  mockSendInvitationEmail,
  subscriptionRepository,
} = vi.hoisted(() => ({
  mockGetUserContext: vi.fn(),
  mockGetAuthData: vi.fn(),
  mockCanManageTeam: vi.fn(),
  mockCheckCanAddUser: vi.fn(),
  mockUserRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByClerkId: vi.fn(),
    findByIdWithSettings: vi.fn(),
    createUserSettings: vi.fn(),
    createNotificationPreferences: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createHistory: vi.fn(),
  },
  mockMarketCenterRepository: {
    findById: vi.fn(),
    findInvitationByToken: vi.fn(),
    findInvitationByEmailAndMarketCenterID: vi.fn(),
    findInvitationsByMarketCenterId: vi.fn(),
    findInvitationsByMultipleMarketCenterIds: vi.fn(),
    createInvitation: vi.fn(),
    updateInvitationStatus: vi.fn(),
    createHistory: vi.fn(),
    listInvitations: vi.fn(),
  },
  mockSendInvitationEmail: vi.fn(),
  subscriptionRepository: {
    getSubscriptionById: vi.fn(),
    findByMarketCenterId: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
  },
}));

// Mock modules
vi.mock("../auth/user-context", () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock("~encore/auth", () => ({
  getAuthData: mockGetAuthData,
}));

vi.mock("../auth/permissions", () => ({
  canManageTeam: mockCanManageTeam,
}));

vi.mock("../auth/subscription-check", () => ({
  checkCanAddUser: mockCheckCanAddUser,
}));

vi.mock("../ticket/db", () => ({
  db: { exec: vi.fn() },
  userRepository: mockUserRepository,
  marketCenterRepository: mockMarketCenterRepository,
  subscriptionRepository: subscriptionRepository,
}));

vi.mock("./email", () => ({
  sendInvitationEmail: mockSendInvitationEmail,
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    unauthenticated: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "unauthenticated";
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
    notFound: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "not_found";
      return err;
    }),
    alreadyExists: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "already_exists";
      return err;
    }),
    internal: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "internal";
      return err;
    }),
  },
}));

// Import after mocking
import {
  inviteTeamMember,
  getInvitation,
  acceptInvitation,
  cancelInvitation,
  listInvitations,
} from "./invite";

// Helper functions
function createUserContext(overrides: any = {}) {
  return {
    name: "Test User",
    userId: "user-123",
    email: "admin@test.com",
    role: "ADMIN",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    ...overrides,
  };
}

function createInvitation(overrides: any = {}) {
  return {
    id: "inv-123",
    email: "invitee@test.com",
    role: "AGENT",
    status: "PENDING",
    marketCenterId: "mc-123",
    invitedBy: "user-123",
    token: "test-token-abc123",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createUser(overrides: any = {}) {
  return {
    id: "user-123",
    email: "admin@test.com",
    name: "Admin User",
    role: "ADMIN",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isActive: true,
    ...overrides,
  };
}

function createMarketCenter(overrides: any = {}) {
  return {
    id: "mc-123",
    name: "Test Market Center",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Invitation System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteTeamMember", () => {
    it("should create invitation and send email successfully", async () => {
      const userContext = createUserContext();
      const inviter = createUser();
      const marketCenter = createMarketCenter();
      const invitation = createInvitation();

      mockGetUserContext.mockResolvedValue(userContext);
      mockCanManageTeam.mockResolvedValue(true);
      mockCheckCanAddUser.mockResolvedValue(undefined);
      mockUserRepository.findById.mockResolvedValue(inviter);
      mockMarketCenterRepository.findById.mockResolvedValue(marketCenter);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockMarketCenterRepository.findInvitationByEmailAndMarketCenterID.mockResolvedValue(
        null
      );
      mockMarketCenterRepository.createInvitation.mockResolvedValue(invitation);
      mockSendInvitationEmail.mockResolvedValue(undefined);
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await inviteTeamMember({
        email: "invitee@test.com",
        role: "AGENT",
        name: "New User",
      });

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe("inv-123");
      expect(mockSendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "invitee@test.com",
          inviteeRole: "AGENT",
        })
      );
    });

    it("should throw error if user cannot manage team", async () => {
      mockGetUserContext.mockResolvedValue(createUserContext());
      mockCanManageTeam.mockResolvedValue(false);

      await expect(
        inviteTeamMember({
          email: "invitee@test.com",
          role: "AGENT",
          name: "New User",
        })
      ).rejects.toThrow("You do not have permission to invite team members");
    });

    it("should throw error if user has no market center", async () => {
      mockGetUserContext.mockResolvedValue(
        createUserContext({ marketCenterId: null })
      );
      mockCanManageTeam.mockResolvedValue(true);

      await expect(
        inviteTeamMember({
          email: "invitee@test.com",
          role: "AGENT",
          name: "New User",
        })
      ).rejects.toThrow("You do not have permission to invite team members");
    });

    it("should throw error if seat limit is reached", async () => {
      mockGetUserContext.mockResolvedValue(createUserContext());
      mockCanManageTeam.mockResolvedValue(true);
      mockCheckCanAddUser.mockRejectedValue(
        new Error("Seat limit reached (5/5 seats)")
      );

      await expect(
        inviteTeamMember({
          email: "invitee@test.com",
          role: "AGENT",
          name: "New User",
        })
      ).rejects.toThrow("Seat limit reached");
    });

    it("should throw error if user already exists in market center", async () => {
      mockGetUserContext.mockResolvedValue(createUserContext());
      mockCanManageTeam.mockResolvedValue(true);
      mockCheckCanAddUser.mockResolvedValue(undefined);
      mockUserRepository.findById.mockResolvedValue(createUser());
      mockMarketCenterRepository.findById.mockResolvedValue(
        createMarketCenter()
      );
      mockUserRepository.findByEmail.mockResolvedValue(
        createUser({ id: "existing-user", email: "invitee@test.com" })
      );

      await expect(
        inviteTeamMember({
          email: "invitee@test.com",
          role: "AGENT",
          name: "New User",
        })
      ).rejects.toThrow("A user already exists with this email");
    });

    it("should throw error if pending invitation already exists", async () => {
      mockGetUserContext.mockResolvedValue(createUserContext());
      mockCanManageTeam.mockResolvedValue(true);
      mockCheckCanAddUser.mockResolvedValue(undefined);
      mockUserRepository.findById.mockResolvedValue(createUser());
      mockMarketCenterRepository.findById.mockResolvedValue(
        createMarketCenter()
      );
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockMarketCenterRepository.findInvitationByEmailAndMarketCenterID.mockResolvedValue(
        createInvitation({ status: "PENDING" })
      );

      await expect(
        inviteTeamMember({
          email: "invitee@test.com",
          role: "AGENT",
          name: "New User",
        })
      ).rejects.toThrow("A pending invitation already exists");
    });
  });

  describe("getInvitation", () => {
    it("should return valid invitation details", async () => {
      const invitation = createInvitation();
      const marketCenter = createMarketCenter();
      const inviter = createUser();

      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );
      mockMarketCenterRepository.findById.mockResolvedValue(marketCenter);
      mockUserRepository.findById.mockResolvedValue(inviter);

      const result = await getInvitation({ token: "test-token-abc123" });

      expect(result.valid).toBe(true);
      expect(result.invitation).not.toBeNull();
      expect(result.invitation?.email).toBe("invitee@test.com");
      expect(result.invitation?.marketCenterName).toBe("Test Market Center");
    });

    it("should return invalid for non-existent token", async () => {
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(null);

      const result = await getInvitation({ token: "invalid-token" });

      expect(result.valid).toBe(false);
      expect(result.invitation).toBeNull();
      expect(result.message).toBe("Invitation not found");
    });

    it("should return invalid for already accepted invitation", async () => {
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        createInvitation({ status: "ACCEPTED" })
      );

      const result = await getInvitation({ token: "test-token" });

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Invitation has been accepted");
    });

    it("should return invalid for expired invitation", async () => {
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        createInvitation({
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        })
      );
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );

      const result = await getInvitation({ token: "test-token" });

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Invitation has expired");
      expect(
        mockMarketCenterRepository.updateInvitationStatus
      ).toHaveBeenCalledWith(expect.any(String), "EXPIRED");
    });
  });

  describe("acceptInvitation", () => {
    const validAuthData = {
      userID: "new-clerk-id",
      emailAddress: "invitee@test.com",
    };

    it("should accept invitation and create new user when authenticated", async () => {
      const invitation = createInvitation();
      const newUser = createUser({
        id: "new-user-123",
        email: "invitee@test.com",
        role: "AGENT",
      });

      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockUserRepository.findByIdWithSettings.mockResolvedValue({
        ...newUser,
        userSettings: { id: "settings-123", notificationPreferences: [{}] },
      });
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await acceptInvitation({ token: "test-token" });

      expect(result.success).toBe(true);
      expect(result.userId).toBe("new-user-123");
      expect(result.marketCenterId).toBe("mc-123");
      expect(result.role).toBe("AGENT");
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "invitee@test.com",
          role: "AGENT",
          marketCenterId: "mc-123",
          clerkId: "new-clerk-id",
        })
      );
    });

    it("should accept invitation and update existing user found by clerkId", async () => {
      const invitation = createInvitation();
      const existingUser = createUser({
        id: "existing-user",
        email: "invitee@test.com",
        marketCenterId: null,
        clerkId: "new-clerk-id",
      });

      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );
      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);
      mockUserRepository.findByIdWithSettings.mockResolvedValue({
        ...existingUser,
        userSettings: { id: "settings-123", notificationPreferences: [{}] },
      });
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await acceptInvitation({ token: "test-token" });

      expect(result.success).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        "existing-user",
        expect.objectContaining({
          marketCenterId: "mc-123",
          role: "AGENT",
          clerkId: "new-clerk-id",
        })
      );
    });

    it("should accept invitation and update existing user found by email (race condition handling)", async () => {
      const invitation = createInvitation();
      const existingUser = createUser({
        id: "existing-user",
        email: "invitee@test.com",
        marketCenterId: null,
      });

      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);
      mockUserRepository.findByIdWithSettings.mockResolvedValue({
        ...existingUser,
        userSettings: { id: "settings-123", notificationPreferences: [{}] },
      });
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await acceptInvitation({ token: "test-token" });

      expect(result.success).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        "existing-user",
        expect.objectContaining({
          marketCenterId: "mc-123",
          role: "AGENT",
          clerkId: "new-clerk-id",
        })
      );
    });

    it("should throw error when not authenticated", async () => {
      mockGetAuthData.mockResolvedValue(null);

      await expect(acceptInvitation({ token: "test-token" })).rejects.toThrow(
        "User not authenticated"
      );
    });

    it("should throw error when email does not match invitation (security check)", async () => {
      const invitation = createInvitation({ email: "different@test.com" });

      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );

      await expect(acceptInvitation({ token: "test-token" })).rejects.toThrow(
        "This invitation was sent to a different email address"
      );
    });

    it("should allow email match case-insensitively", async () => {
      const invitation = createInvitation({ email: "INVITEE@TEST.COM" });
      const newUser = createUser({
        id: "new-user-123",
        email: "invitee@test.com",
        role: "AGENT",
      });

      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);
      mockUserRepository.findByIdWithSettings.mockResolvedValue({
        ...newUser,
        userSettings: { id: "settings-123", notificationPreferences: [{}] },
      });
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await acceptInvitation({ token: "test-token" });

      expect(result.success).toBe(true);
    });

    it("should throw error when auth has no email address", async () => {
      mockGetAuthData.mockResolvedValue({
        userID: "clerk-id",
        emailAddress: null,
      });

      await expect(acceptInvitation({ token: "test-token" })).rejects.toThrow(
        "No email address found for authenticated user"
      );
    });

    it("should throw error for non-existent invitation", async () => {
      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(null);

      await expect(
        acceptInvitation({ token: "invalid-token" })
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw error for already accepted invitation", async () => {
      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        createInvitation({ status: "ACCEPTED" })
      );

      await expect(acceptInvitation({ token: "test-token" })).rejects.toThrow(
        "Invitation has been accepted"
      );
    });

    it("should throw error for expired invitation", async () => {
      mockGetAuthData.mockResolvedValue(validAuthData);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        createInvitation({
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        })
      );
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );

      await expect(acceptInvitation({ token: "test-token" })).rejects.toThrow(
        "Invitation has expired"
      );
    });
  });

  describe("cancelInvitation", () => {
    it("should cancel a pending invitation", async () => {
      const userContext = createUserContext();
      const invitation = createInvitation();

      mockGetUserContext.mockResolvedValue(userContext);
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        invitation
      );
      mockMarketCenterRepository.updateInvitationStatus.mockResolvedValue(
        undefined
      );
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await cancelInvitation({ token: "test-token" });

      expect(result.success).toBe(true);
      expect(
        mockMarketCenterRepository.updateInvitationStatus
      ).toHaveBeenCalledWith("inv-123", "CANCELLED");
    });

    it("should throw error if user doesn't have permission", async () => {
      mockGetUserContext.mockResolvedValue(
        createUserContext({ marketCenterId: "different-mc" })
      );
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        createInvitation()
      );

      await expect(cancelInvitation({ token: "test-token" })).rejects.toThrow(
        "You do not have permission to cancel this invitation"
      );
    });

    it("should throw error for already accepted invitation", async () => {
      mockGetUserContext.mockResolvedValue(createUserContext());
      mockMarketCenterRepository.findInvitationByToken.mockResolvedValue(
        createInvitation({ status: "ACCEPTED" })
      );

      await expect(cancelInvitation({ token: "test-token" })).rejects.toThrow(
        "Cannot cancel invitation with status: ACCEPTED"
      );
    });
  });

  describe("listInvitations", () => {
    it("should return all invitations for user's market center", async () => {
      const userContext = createUserContext();

      const invitations = [
        createInvitation({
          id: "inv-1",
          email: "invite@test.com",
          marketCenterId: "mc-123",
        }),
        createInvitation({
          id: "inv-2",
          email: "another@test.com",
          marketCenterId: "mc-123",
        }),
      ];

      mockGetUserContext.mockResolvedValue(userContext);
      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
        "mc-123",
      ]);
      mockMarketCenterRepository.findInvitationsByMultipleMarketCenterIds.mockResolvedValue(
        invitations
      );

      const result = await listInvitations({ marketCenterIds: "mc-123" });

      expect(result.invitations).toHaveLength(2);
      expect(
        mockMarketCenterRepository.findInvitationsByMultipleMarketCenterIds
      ).toHaveBeenCalledWith({
        marketCenterIds: ["mc-123"],
        inviteStatus: undefined,
        limit: 25,
        offset: 0,
      });
    });

    it("should return empty array if user has no market center", async () => {
      mockGetUserContext.mockResolvedValue(
        createUserContext({ marketCenterId: undefined })
      );

      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([]);
      mockMarketCenterRepository.findInvitationsByMultipleMarketCenterIds.mockResolvedValue(
        []
      );

      const result = await listInvitations({});

      expect(result.invitations).toHaveLength(0);
    });
  });
});
