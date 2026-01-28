import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import crypto from "crypto";
import { getUserContext } from "../auth/user-context";
import { canManageTeam } from "../auth/permissions";
import { checkCanAddUser } from "../auth/subscription-check";
import {
  db,
  userRepository,
  marketCenterRepository,
  subscriptionRepository,
} from "../ticket/db";
import { sendInvitationEmail } from "./email";
import { defaultNotificationPreferences } from "../utils";
import type { TeamInvitation, InvitationStatus } from "../marketCenters/types";
import type { UserRole } from "../user/types";
import { secret } from "encore.dev/config";

const APP_BASE_URL = secret("FRONTEND_URL");

// ============================================================================
// Types
// ============================================================================

export interface InviteTeamMemberRequest {
  email: string;
  role: UserRole;
  name: string;
}

export interface InviteTeamMemberResponse {
  success: boolean;
  invitationId: string;
  // TODO: Remove token from response once email is confirmed working
  token: string;
  signupUrl: string;
}

export interface GetInvitationResponse {
  invitation: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: InvitationStatus;
    marketCenterName: string;
    marketCenterId: string;
    inviterName: string;
    inviterEmail: string;
    expiresAt: Date;
    isExpired: boolean;
  } | null;
  valid: boolean;
  message?: string;
}

// AcceptInvitationRequest - now empty as we get clerkId from auth
export interface AcceptInvitationRequest {
  // No body required - clerkId and email come from authenticated session
}

export interface AcceptInvitationResponse {
  success: boolean;
  userId?: string;
  marketCenterId?: string;
  role?: UserRole;
}

export interface ResendInvitationResponse {
  success: boolean;
  newExpiresAt: Date;
}

export interface CancelInvitationResponse {
  success: boolean;
}

export interface ListInvitationsRequest {
  inviteStatus?: InvitationStatus;
  marketCenterIds?: string;
  limit?: number;
  offset?: number;
}

export interface ListInvitationsResponse {
  invitations: TeamInvitation[];
}

// ============================================================================
// Create Invitation
// ============================================================================

export const inviteTeamMember = api<
  InviteTeamMemberRequest,
  InviteTeamMemberResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/invitations",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Check if user can manage team
    const canManage = await canManageTeam(userContext);
    if (!canManage || !userContext.marketCenterId) {
      throw APIError.permissionDenied(
        "You do not have permission to invite team members"
      );
    }

    // Check subscription seat limits before inviting
    // This counts pending invitations + existing users against the limit
    // AGENT role invitations are free and don't count against seat limits
    await checkCanAddUser(userContext.marketCenterId, req.role);

    // Get inviter details
    const inviter = await userRepository.findById(userContext.userId);
    if (!inviter) {
      throw APIError.notFound("Inviter user not found");
    }

    // Get market center
    const marketCenter = await marketCenterRepository.findById(
      userContext.marketCenterId
    );
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Check if user already exists in this market center
    const existingUser = await userRepository.findByEmail(req.email);
    if (
      existingUser &&
      existingUser.marketCenterId === userContext.marketCenterId
    ) {
      throw APIError.alreadyExists("A user already exists with this email");
    }

    // Check for existing pending invitation
    const existingInvitation =
      await marketCenterRepository.findInvitationByEmailAndMarketCenterID(
        userContext.marketCenterId,
        req.email
      );

    if (existingInvitation) {
      switch (existingInvitation.status) {
        case "ACCEPTED":
          throw APIError.alreadyExists("A user already exists with this email");
        case "PENDING":
          throw APIError.alreadyExists(
            "A pending invitation already exists for this email"
          );
        case "CANCELLED":
          throw APIError.alreadyExists(
            "A cancelled invitation already exists for this email"
          );
        case "EXPIRED":
          throw APIError.alreadyExists(
            "An expired invitation already exists for this email"
          );
        default:
          throw APIError.internal(
            "An invitation already exists for this email"
          );
      }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const invitation = await marketCenterRepository.createInvitation({
      name: req.name,
      email: req.email,
      role: req.role,
      marketCenterId: userContext.marketCenterId,
      invitedBy: userContext.userId,
      token,
      expiresAt,
    });

    if (!invitation) {
      throw APIError.internal("Failed to create invitation");
    }

    // Send invitation email
    await sendInvitationEmail({
      to: req.email,
      inviteeName: req.name,
      inviteeEmail: req.email,
      inviteeRole: req.role,
      marketCenterName: marketCenter.name,
      inviterName: inviter.name || inviter.email,
      inviterEmail: inviter.email,
      token,
      expiresAt,
    });

    // Log the invitation in history
    await marketCenterRepository.createHistory({
      marketCenterId: userContext.marketCenterId,
      action: "INVITE",
      field: `Sent: ${req.email}`,
      newValue: JSON.stringify({
        status: "PENDING",
        email: req.email,
      }),
      changedById: userContext.userId,
    });

    // TODO: Remove token/signupUrl from response once email is confirmed working
    const signupUrl = `${APP_BASE_URL()}/sign-up?token=${token}`;

    return {
      success: true,
      invitationId: invitation.id,
      token,
      signupUrl,
    };
  }
);

// ============================================================================
// Get Invitation by Token (Public - for signup flow)
// ============================================================================

export const getInvitation = api<{ token: string }, GetInvitationResponse>(
  {
    expose: true,
    method: "GET",
    path: "/invitations/:token",
    auth: false, // Public endpoint for signup flow
  },
  async ({ token }) => {
    const invitation =
      await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      return {
        invitation: null,
        valid: false,
        message: "Invitation not found",
      };
    }

    const isExpired = new Date() > new Date(invitation.expiresAt);
    if (isExpired) {
      // Mark as expired in database
      await marketCenterRepository.updateInvitationStatus(
        invitation.id,
        "EXPIRED"
      );
      return {
        invitation: null,
        valid: false,
        message: "Invitation has expired",
      };
    }
    if (invitation.status !== "PENDING") {
      return {
        invitation: null,
        valid: false,
        message: `Invitation has been ${invitation.status.toLowerCase()}`,
      };
    }

    // Get market center and inviter details
    const marketCenter = invitation.marketCenterId
      ? await marketCenterRepository.findById(invitation.marketCenterId)
      : null;

    const inviter = invitation.invitedBy
      ? await userRepository.findById(invitation.invitedBy)
      : null;

    return {
      invitation: {
        id: invitation.id,
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        marketCenterName: marketCenter?.name || "Unknown",
        marketCenterId: invitation.marketCenterId || "",
        inviterName: inviter?.name || inviter?.email || "Unknown",
        inviterEmail: inviter?.email || "",
        expiresAt: invitation.expiresAt,
        isExpired: false,
      },
      valid: true,
    };
  }
);

// ============================================================================
// Accept Invitation (Called after user signs up via Clerk)
// ============================================================================

export const acceptInvitation = api<
  { token: string },
  AcceptInvitationResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/invitations/:token/accept",
    auth: true, // Now requires authentication
  },
  async ({ token }) => {
    // Get authenticated user's info from Clerk
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("User not authenticated");
    }

    const userContext = await getUserContext();

    const clerkId = authData.userID;
    const clerkEmail = authData.emailAddress;

    if (!clerkEmail) {
      throw APIError.failedPrecondition(
        "No email address found for authenticated user"
      );
    }

    const invitation =
      await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      throw APIError.notFound("Invitation not found");
    }

    // Verify email matches invitation (case-insensitive)
    if (invitation.email.toLowerCase() !== clerkEmail.toLowerCase()) {
      throw APIError.permissionDenied(
        "This invitation was sent to a different email address. Please sign up with the email that received the invitation."
      );
    }

    if (invitation.status === "ACCEPTED") {
      throw APIError.alreadyExists("Invitation has been accepted");
    }

    if (
      new Date() > new Date(invitation.expiresAt) ||
      invitation.status === "EXPIRED"
    ) {
      await marketCenterRepository.updateInvitationStatus(
        invitation.id,
        "EXPIRED"
      );
      throw APIError.failedPrecondition("Invitation has expired");
    }
    if (invitation.status === "CANCELLED") {
      throw APIError.failedPrecondition(
        `Invitation is "${invitation.status.toLowerCase()}" and cannot be accepted`
      );
    }

    if (!invitation.marketCenterId) {
      throw APIError.internal("Invitation is missing market center");
    }

    // Check if user already exists (may have been created by getUserContext race condition)
    // Try by clerkId first, then by email
    let user = await userRepository.findByClerkId(clerkId);

    if (!user) {
      user = await userRepository.findByEmail(invitation.email);
    }

    if (user) {
      // User exists - update their market center, role, and ensure clerkId is set
      await userRepository.update(user.id, {
        marketCenterId: invitation.marketCenterId,
        role: invitation.role,
        clerkId: clerkId,
      });
    } else {
      // Create new user with invitation details
      user = await userRepository.create({
        email: invitation.email,
        clerkId: clerkId,
        role: invitation.role,
        marketCenterId: invitation.marketCenterId,
        name: invitation.name || invitation.email.split("@")[0],
      });
    }

    // Ensure user has notification preferences
    const userWithSettings = await userRepository.findByIdWithSettings(user.id);
    if (
      !userWithSettings?.userSettings ||
      !userWithSettings?.userSettings?.id
    ) {
      // Create user settings with notification preferences
      const newSettings = await userRepository.createUserSettings(user.id);
      await userRepository.createNotificationPreferences(
        newSettings.id,
        defaultNotificationPreferences
      );
    } else if (
      !userWithSettings.userSettings.notificationPreferences ||
      userWithSettings.userSettings.notificationPreferences.length === 0
    ) {
      // User settings exist but no notification preferences
      await userRepository.createNotificationPreferences(
        userWithSettings.userSettings.id,
        defaultNotificationPreferences
      );
    }

    // Mark invitation as accepted
    await marketCenterRepository.updateInvitationStatus(
      invitation.id,
      "ACCEPTED"
    );

    // Log the acceptance in history
    await marketCenterRepository.createHistory({
      marketCenterId: invitation.marketCenterId,
      action: "INVITE",
      field: `Accepted: ${invitation.email}`,
      newValue: JSON.stringify({
        status: "ACCEPTED",
        email: invitation.email,
      }),
      previousValue: JSON.stringify({
        status: invitation.status,
        email: invitation.email,
      }),
      changedById: userContext.userId,
    });

    await userRepository.createHistory({
      userId: user.id,
      marketCenterId: invitation.marketCenterId,
      action: "CREATE",
      field: "user",
      newValue: "Activated via Invitation",
      changedById: userContext.userId,
    });

    return {
      success: true,
      name: invitation.name,
      userId: user.id,
      marketCenterId: invitation.marketCenterId,
      role: invitation.role,
    };
  }
);

// ============================================================================
// Resend Invitation
// ============================================================================

export const resendInvitation = api<
  { token: string },
  ResendInvitationResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/invitations/:token/resend",
    auth: true,
  },
  async ({ token }) => {
    const userContext = await getUserContext();

    const invitation =
      await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      throw APIError.notFound("Invitation not found");
    }

    // Verify user has permission
    if (invitation.marketCenterId !== userContext.marketCenterId) {
      throw APIError.permissionDenied(
        "You do not have permission to resend this invitation"
      );
    }

    if (invitation.status === "ACCEPTED" || invitation.status === "CANCELLED") {
      throw APIError.failedPrecondition(
        `Cannot resend invitation with status: ${invitation.status}`
      );
    }

    // Generate new token and expiration
    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update invitation with new token
    await db.exec`
      UPDATE team_invitations
      SET token = ${newToken}, expires_at = ${newExpiresAt}, status = 'PENDING', updated_at = NOW()
      WHERE id = ${invitation.id}
    `;

    // Get market center and inviter for email
    const marketCenter = invitation.marketCenterId
      ? await marketCenterRepository.findById(invitation.marketCenterId)
      : null;

    const inviter = await userRepository.findById(userContext.userId);

    // Resend invitation email
    await sendInvitationEmail({
      to: invitation.email,
      inviteeName: invitation.email.split("@")[0],
      inviteeEmail: invitation.email,
      inviteeRole: invitation.role,
      marketCenterName: marketCenter?.name || "Unknown",
      inviterName: inviter?.name || inviter?.email || "Unknown",
      inviterEmail: inviter?.email || "",
      token: newToken,
      expiresAt: newExpiresAt,
    });

    await marketCenterRepository.createHistory({
      marketCenterId: userContext.marketCenterId,
      action: "INVITE",
      field: `Resent: ${invitation.email}`,
      newValue: JSON.stringify({
        status: "PENDING",
        email: invitation.email,
      }),
      previousValue: JSON.stringify({
        status: invitation.status,
        email: invitation.email,
      }),
      changedById: userContext.userId,
    });

    return {
      success: true,
      newExpiresAt,
    };
  }
);

// ============================================================================
// Cancel Invitation
// ============================================================================

export const cancelInvitation = api<
  { token: string },
  CancelInvitationResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/invitations/:token",
    auth: true,
  },
  async ({ token }) => {
    const userContext = await getUserContext();

    const invitation =
      await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      throw APIError.notFound("Invitation not found");
    }

    // Verify user has permission
    if (invitation.marketCenterId !== userContext.marketCenterId) {
      throw APIError.permissionDenied(
        "You do not have permission to cancel this invitation"
      );
    }

    if (invitation.status !== "PENDING") {
      throw APIError.failedPrecondition(
        `Cannot cancel invitation with status: ${invitation.status}`
      );
    }

    await marketCenterRepository.updateInvitationStatus(
      invitation.id,
      "CANCELLED"
    );

    // Log the cancellation
    await marketCenterRepository.createHistory({
      marketCenterId: invitation.marketCenterId!,
      action: "INVITE",
      field: `Cancelled: ${invitation.email}`,
      newValue: JSON.stringify({
        status: "CANCELLED",
        email: invitation.email,
      }),
      previousValue: JSON.stringify({
        status: invitation.status,
        email: invitation.email,
      }),
      changedById: userContext.userId,
    });

    return { success: true };
  }
);

// ============================================================================
// List Invitations for Market Center(s)
// ============================================================================

export const listInvitations = api<
  ListInvitationsRequest,
  ListInvitationsResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/invitations/list",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const limit = req?.limit ?? 25;
    const offset = req?.offset ?? 0;

    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );

    if (!accessibleMarketCenterIds || !accessibleMarketCenterIds.length) {
      return { invitations: [] };
    }

    let marketCenterIds: string[] | null = null;

    if (req.marketCenterIds) {
      marketCenterIds = req.marketCenterIds
        .split(",")
        .filter((id) => accessibleMarketCenterIds.includes(id));
      if (marketCenterIds.length === 0) {
        return { invitations: [] };
      }
    } else {
      marketCenterIds = accessibleMarketCenterIds;
    }

    const invitations =
      await marketCenterRepository.findInvitationsByMultipleMarketCenterIds({
        marketCenterIds,
        inviteStatus:
          req?.inviteStatus !== undefined ? req.inviteStatus : undefined,
        limit,
        offset,
      });

    return { invitations };
  }
);
