/**
 * User Context Tests - Verify invitation-aware user creation
 *
 * These tests verify that getUserContext correctly handles:
 * - Creating new users from pending invitations
 * - Updating existing users who have pending invitations but no market center
 * - Race condition handling between signup and invitation acceptance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockGetAuthData,
  mockUserRepository,
  mockMarketCenterRepository,
} = vi.hoisted(() => ({
  mockGetAuthData: vi.fn(),
  mockUserRepository: {
    findByClerkId: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockMarketCenterRepository: {
    findActiveInvitationByEmail: vi.fn(),
  },
}));

// Mock modules
vi.mock("~encore/auth", () => ({
  getAuthData: mockGetAuthData,
}));

vi.mock("../ticket/db", () => ({
  userRepository: mockUserRepository,
  marketCenterRepository: mockMarketCenterRepository,
}));

vi.mock("encore.dev/api", () => ({
  APIError: {
    unauthenticated: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "unauthenticated";
      return err;
    }),
  },
}));

// Import after mocking
import { getUserContext } from "./user-context";

// Helper functions
function createUser(overrides: any = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    role: "AGENT",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createInvitation(overrides: any = {}) {
  return {
    id: "inv-123",
    email: "invitee@test.com",
    role: "STAFF",
    status: "PENDING",
    marketCenterId: "mc-456",
    invitedBy: "user-admin",
    token: "test-token",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when user is not authenticated", () => {
    it("should throw unauthenticated error when auth data is null", async () => {
      mockGetAuthData.mockResolvedValue(null);

      await expect(getUserContext()).rejects.toThrow("User not authenticated");
    });
  });

  describe("when user exists by clerkId", () => {
    it("should return existing user context", async () => {
      const existingUser = createUser();
      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);

      const context = await getUserContext();

      expect(context.userId).toBe("user-123");
      expect(context.email).toBe("test@example.com");
      expect(context.role).toBe("AGENT");
      expect(context.marketCenterId).toBe("mc-123");
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("should check for invitation and update user if no market center", async () => {
      const existingUser = createUser({ marketCenterId: null });
      const invitation = createInvitation({ email: "test@example.com" });
      const updatedUser = createUser({
        marketCenterId: "mc-456",
        role: "STAFF",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
        invitation
      );
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const context = await getUserContext();

      expect(mockMarketCenterRepository.findActiveInvitationByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
        marketCenterId: "mc-456",
        role: "STAFF",
      });
      expect(context.marketCenterId).toBe("mc-456");
      expect(context.role).toBe("STAFF");
    });

    it("should not update user if they already have a market center", async () => {
      const existingUser = createUser({ marketCenterId: "mc-existing" });

      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);

      const context = await getUserContext();

      expect(mockMarketCenterRepository.findActiveInvitationByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(context.marketCenterId).toBe("mc-existing");
    });

    it("should not update user if no invitation found", async () => {
      const existingUser = createUser({ marketCenterId: null });

      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(null);

      const context = await getUserContext();

      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(context.marketCenterId).toBeNull();
    });
  });

  describe("when user exists by email but not clerkId", () => {
    it("should find user by email and update clerkId", async () => {
      const existingUser = createUser({ clerkId: "old-clerk-id" });

      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);

      const context = await getUserContext();

      expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
        clerkId: "new-clerk-id",
      });
      expect(context.userId).toBe("user-123");
    });

    it("should also check for invitation if user has no market center", async () => {
      const existingUser = createUser({
        clerkId: "old-clerk-id",
        marketCenterId: null,
      });
      const invitation = createInvitation({ email: "test@example.com" });
      const updatedUser = createUser({
        marketCenterId: "mc-456",
        role: "STAFF",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.update
        .mockResolvedValueOnce(existingUser) // First call updates clerkId
        .mockResolvedValueOnce(updatedUser); // Second call updates from invitation
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
        invitation
      );

      const context = await getUserContext();

      expect(mockUserRepository.update).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.update).toHaveBeenNthCalledWith(1, "user-123", {
        clerkId: "new-clerk-id",
      });
      expect(mockUserRepository.update).toHaveBeenNthCalledWith(2, "user-123", {
        marketCenterId: "mc-456",
        role: "STAFF",
      });
    });
  });

  describe("when user does not exist (new signup)", () => {
    it("should create new user with invitation data when invitation exists", async () => {
      const invitation = createInvitation({
        email: "newuser@test.com",
        role: "STAFF",
        marketCenterId: "mc-456",
      });
      const newUser = createUser({
        id: "new-user-123",
        email: "newuser@test.com",
        role: "STAFF",
        marketCenterId: "mc-456",
        clerkId: "new-clerk-id",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: "newuser@test.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
        invitation
      );
      mockUserRepository.create.mockResolvedValue(newUser);

      const context = await getUserContext();

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: "newuser@test.com",
        clerkId: "new-clerk-id",
        role: "STAFF",
        name: "Newuser",
        marketCenterId: "mc-456",
      });
      expect(context.userId).toBe("new-user-123");
      expect(context.role).toBe("STAFF");
      expect(context.marketCenterId).toBe("mc-456");
    });

    it("should create new user with defaults when no invitation exists", async () => {
      const newUser = createUser({
        id: "new-user-123",
        email: "newuser@test.com",
        role: "AGENT",
        marketCenterId: null,
        clerkId: "new-clerk-id",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: "newuser@test.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const context = await getUserContext();

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: "newuser@test.com",
        clerkId: "new-clerk-id",
        role: "AGENT",
        name: "Newuser",
        marketCenterId: null,
      });
      expect(context.role).toBe("AGENT");
      expect(context.marketCenterId).toBeNull();
    });

    it("should throw error if no email address in auth data", async () => {
      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: null,
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);

      await expect(getUserContext()).rejects.toThrow(
        "No email address found for user"
      );
    });

    it("should parse name correctly from email with dots", async () => {
      const newUser = createUser({
        email: "john.doe@test.com",
        name: "John Doe",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: "john.doe@test.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      await getUserContext();

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "John Doe",
        })
      );
    });

    it("should parse name correctly from email with underscores", async () => {
      const newUser = createUser({
        email: "jane_smith@test.com",
        name: "Jane Smith",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "new-clerk-id",
        emailAddress: "jane_smith@test.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      await getUserContext();

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane Smith",
        })
      );
    });
  });

  describe("race condition scenarios", () => {
    it("should handle case where user was created without market center before invitation was accepted", async () => {
      // This simulates: User signed up, another API call created user without MC,
      // then user tries to access again
      const existingUserWithoutMC = createUser({ marketCenterId: null });
      const invitation = createInvitation({
        email: "test@example.com",
        role: "STAFF_LEADER",
        marketCenterId: "mc-789",
      });
      const updatedUser = createUser({
        marketCenterId: "mc-789",
        role: "STAFF_LEADER",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUserWithoutMC);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
        invitation
      );
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const context = await getUserContext();

      expect(context.marketCenterId).toBe("mc-789");
      expect(context.role).toBe("STAFF_LEADER");
    });

    it("should handle ACCEPTED invitation status (invitation already processed)", async () => {
      const existingUserWithoutMC = createUser({ marketCenterId: null });
      const acceptedInvitation = createInvitation({
        email: "test@example.com",
        status: "ACCEPTED",
        marketCenterId: "mc-accepted",
      });
      const updatedUser = createUser({
        marketCenterId: "mc-accepted",
        role: "STAFF",
      });

      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUserWithoutMC);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
        acceptedInvitation
      );
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const context = await getUserContext();

      // Should still update the user since they don't have a market center
      expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
        marketCenterId: "mc-accepted",
        role: "STAFF",
      });
    });

    it("should not update if invitation has no market center", async () => {
      const existingUserWithoutMC = createUser({ marketCenterId: null });
      const invitationWithoutMC = createInvitation({
        email: "test@example.com",
        marketCenterId: null,
      });

      mockGetAuthData.mockResolvedValue({
        userID: "clerk-123",
        emailAddress: "test@example.com",
      });
      mockUserRepository.findByClerkId.mockResolvedValue(existingUserWithoutMC);
      mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
        invitationWithoutMC
      );

      const context = await getUserContext();

      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(context.marketCenterId).toBeNull();
    });
  });

  describe("different role assignments from invitation", () => {
    const testRoles = ["ADMIN", "STAFF_LEADER", "STAFF", "AGENT"] as const;

    testRoles.forEach((role) => {
      it(`should correctly assign ${role} role from invitation`, async () => {
        const invitation = createInvitation({
          email: "newuser@test.com",
          role: role,
        });
        const newUser = createUser({
          email: "newuser@test.com",
          role: role,
        });

        mockGetAuthData.mockResolvedValue({
          userID: "new-clerk-id",
          emailAddress: "newuser@test.com",
        });
        mockUserRepository.findByClerkId.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockMarketCenterRepository.findActiveInvitationByEmail.mockResolvedValue(
          invitation
        );
        mockUserRepository.create.mockResolvedValue(newUser);

        const context = await getUserContext();

        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ role })
        );
        expect(context.role).toBe(role);
      });
    });
  });
});
