import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
import { TeamInviteRequest } from "./types";
import auth0Management from "./auth0-client";
import crypto from 'crypto';

export const inviteTeamMember = api(
  { method: "POST", path: "/settings/team/invite", auth: false },
  async ({ email, role }: TeamInviteRequest): Promise<{ success: boolean; invitationId: string }> => {
    const mockUserId = "user_1";
    const prisma = getPrisma();

    // Find the user and their market center
    const user = await prisma.user.findUnique({
      where: { id: mockUserId },
      include: { marketCenter: true }
    });

    if (!user) {
      throw APIError.notFound("User not found");
    }

    if (user.role !== 'ADMIN') {
      throw APIError.permissionDenied("Only administrators can invite team members");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Check if user already exists or has pending invitation
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.marketCenterId === user.marketCenterId) {
      throw APIError.aborted("User is already a team member");
    }

    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: {
        marketCenterId_email: {
          marketCenterId: user.marketCenterId!,
          email
        }
      }
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      throw APIError.aborted("Invitation already exists for this email");
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const invitation = await prisma.teamInvitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        marketCenterId: user.marketCenterId!,
        invitedBy: user.id
      }
    });

    // TODO: Implement email invitation system
    // This would typically use an email service like SendGrid or Resend
    // to send an invitation email with the token
    console.log(`Invitation created for ${email} with token: ${token}`);

    // Log the invitation in audit trail
    await prisma.settingsAuditLog.create({
      data: {
        marketCenterId: user.marketCenterId!,
        userId: user.id,
        action: 'invite',
        section: 'team',
        newValue: { email, role, invitationId: invitation.id }
      }
    });

    return {
      success: true,
      invitationId: invitation.id
    };
  }
);