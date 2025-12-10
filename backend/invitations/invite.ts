import { api, APIError } from "encore.dev/api";
import crypto from "crypto";
import { getUserContext } from "../auth/user-context";
import { canManageTeam } from "../auth/permissions";
import { checkCanAddUser } from "../auth/subscription-check";
import {
  db,
  userRepository,
  marketCenterRepository,
} from "../ticket/db";
import { sendInvitationEmail } from "./email";
import type { TeamInvitation, InvitationStatus } from "../marketCenters/types";
import type { UserRole } from "../user/types";

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

export interface AcceptInvitationRequest {
  clerkId: string;
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

export interface ListInvitationsResponse {
  invitations: TeamInvitation[];
}

// ============================================================================
// Create Invitation
// ============================================================================

export const inviteTeamMember = api<InviteTeamMemberRequest, InviteTeamMemberResponse>(
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
    if (!canManage) {
      throw APIError.permissionDenied(
        "You do not have permission to invite team members"
      );
    }

    // User must have a market center
    if (!userContext.marketCenterId) {
      throw APIError.failedPrecondition("You must belong to a market center to invite team members");
    }

    // Check subscription seat limits before inviting
    // This counts pending invitations + existing users against the limit
    await checkCanAddUser(userContext.marketCenterId);

    // Get inviter details
    const inviter = await userRepository.findById(userContext.userId);
    if (!inviter) {
      throw APIError.notFound("Inviter user not found");
    }

    // Get market center
    const marketCenter = await marketCenterRepository.findById(userContext.marketCenterId);
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Check if user already exists in this market center
    const existingUser = await userRepository.findByEmail(req.email);
    if (existingUser && existingUser.marketCenterId === userContext.marketCenterId) {
      throw APIError.alreadyExists("User is already a team member in this market center");
    }

    // Check for existing pending invitation
    const existingInvitation = await marketCenterRepository.findInvitationByEmail(
      userContext.marketCenterId,
      req.email
    );

    if (existingInvitation && existingInvitation.status === "PENDING") {
      throw APIError.alreadyExists("A pending invitation already exists for this email");
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const invitation = await marketCenterRepository.createInvitation({
      email: req.email,
      role: req.role,
      marketCenterId: userContext.marketCenterId,
      invitedBy: userContext.userId,
      token,
      expiresAt,
    });

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
      field: "team_invitations",
      newValue: JSON.stringify({ email: req.email, role: req.role }),
      changedById: userContext.userId,
    });

    // TODO: Remove token/signupUrl from response once email is confirmed working
    const signupUrl = `${process.env.APP_BASE_URL || "https://app.conductorticket.com"}/sign-up?token=${token}`;

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
    const invitation = await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      return {
        invitation: null,
        valid: false,
        message: "Invitation not found",
      };
    }

    if (invitation.status !== "PENDING") {
      return {
        invitation: null,
        valid: false,
        message: `Invitation has already been ${invitation.status.toLowerCase()}`,
      };
    }

    const isExpired = new Date() > new Date(invitation.expiresAt);
    if (isExpired) {
      // Mark as expired in database
      await marketCenterRepository.updateInvitationStatus(invitation.id, "EXPIRED");
      return {
        invitation: null,
        valid: false,
        message: "Invitation has expired",
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

export const acceptInvitation = api<{ token: string } & AcceptInvitationRequest, AcceptInvitationResponse>(
  {
    expose: true,
    method: "POST",
    path: "/invitations/:token/accept",
    auth: false, // Called during signup flow before full auth is established
  },
  async ({ token, clerkId }) => {
    const invitation = await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      throw APIError.notFound("Invitation not found");
    }

    if (invitation.status !== "PENDING") {
      throw APIError.failedPrecondition(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    const isExpired = new Date() > new Date(invitation.expiresAt);
    if (isExpired) {
      await marketCenterRepository.updateInvitationStatus(invitation.id, "EXPIRED");
      throw APIError.failedPrecondition("Invitation has expired");
    }

    if (!invitation.marketCenterId) {
      throw APIError.internal("Invitation is missing market center");
    }

    // Check if user already exists
    let user = await userRepository.findByEmail(invitation.email);

    if (user) {
      // User exists - update their market center and role
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
        name: invitation.email.split("@")[0], // Will be updated from Clerk profile
      });
    }

    // Mark invitation as accepted
    await marketCenterRepository.updateInvitationStatus(invitation.id, "ACCEPTED");

    // Log the acceptance in history
    await marketCenterRepository.createHistory({
      marketCenterId: invitation.marketCenterId,
      action: "ACCEPT_INVITE",
      field: "team_invitations",
      newValue: JSON.stringify({ email: invitation.email, userId: user.id }),
      changedById: user.id,
    });

    return {
      success: true,
      userId: user.id,
      marketCenterId: invitation.marketCenterId,
      role: invitation.role,
    };
  }
);

// ============================================================================
// Resend Invitation
// ============================================================================

export const resendInvitation = api<{ token: string }, ResendInvitationResponse>(
  {
    expose: true,
    method: "POST",
    path: "/invitations/:token/resend",
    auth: true,
  },
  async ({ token }) => {
    const userContext = await getUserContext();

    const invitation = await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      throw APIError.notFound("Invitation not found");
    }

    // Verify user has permission
    if (invitation.marketCenterId !== userContext.marketCenterId) {
      throw APIError.permissionDenied("You do not have permission to resend this invitation");
    }

    if (invitation.status !== "PENDING" && invitation.status !== "EXPIRED") {
      throw APIError.failedPrecondition(`Cannot resend invitation with status: ${invitation.status}`);
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

    return {
      success: true,
      newExpiresAt,
    };
  }
);

// ============================================================================
// Cancel Invitation
// ============================================================================

export const cancelInvitation = api<{ token: string }, CancelInvitationResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/invitations/:token",
    auth: true,
  },
  async ({ token }) => {
    const userContext = await getUserContext();

    const invitation = await marketCenterRepository.findInvitationByToken(token);

    if (!invitation) {
      throw APIError.notFound("Invitation not found");
    }

    // Verify user has permission
    if (invitation.marketCenterId !== userContext.marketCenterId) {
      throw APIError.permissionDenied("You do not have permission to cancel this invitation");
    }

    if (invitation.status !== "PENDING") {
      throw APIError.failedPrecondition(`Cannot cancel invitation with status: ${invitation.status}`);
    }

    await marketCenterRepository.updateInvitationStatus(invitation.id, "CANCELLED");

    // Log the cancellation
    await marketCenterRepository.createHistory({
      marketCenterId: invitation.marketCenterId!,
      action: "CANCEL_INVITE",
      field: "team_invitations",
      newValue: JSON.stringify({ email: invitation.email }),
      changedById: userContext.userId,
    });

    return { success: true };
  }
);

// ============================================================================
// List Invitations for Market Center
// ============================================================================

export const listInvitations = api<void, ListInvitationsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/invitations",
    auth: true,
  },
  async () => {
    const userContext = await getUserContext();

    if (!userContext.marketCenterId) {
      return { invitations: [] };
    }

    const invitations = await marketCenterRepository.findInvitationsByMarketCenterId(
      userContext.marketCenterId
    );

    return { invitations };
  }
);
