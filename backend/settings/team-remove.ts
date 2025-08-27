import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";

export const removeTeamMember = api(
  { method: "DELETE", path: "/settings/team/members/:id", auth: false },
  async ({ id }: { id: string }): Promise<{ success: boolean }> => {
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
      throw APIError.permissionDenied("Only administrators can remove team members");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Get the user to be removed
    const userToRemove = await prisma.user.findFirst({
      where: {
        id,
        marketCenterId: user.marketCenterId!,
        deletedAt: null
      }
    });

    if (!userToRemove) {
      throw APIError.notFound("User not found or not in your market center");
    }

    // Prevent self-removal
    if (userToRemove.id === user.id) {
      throw APIError.aborted("Cannot remove yourself");
    }

    // Check if this is the last admin
    if (userToRemove.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          marketCenterId: user.marketCenterId!,
          role: 'ADMIN',
          deletedAt: null,
          isActive: true
        }
      });

      if (adminCount <= 1) {
        throw APIError.aborted("Cannot remove the last admin");
      }
    }

    // Soft delete the user
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Reassign their tickets to the current user (admin)
    await prisma.ticket.updateMany({
      where: {
        assigneeId: id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE'] }
      },
      data: {
        assigneeId: user.id
      }
    });

    // Log the removal in audit trail
    await prisma.settingsAuditLog.create({
      data: {
        marketCenterId: user.marketCenterId!,
        userId: user.id,
        action: 'remove',
        section: 'team',
        previousValue: { 
          userId: userToRemove.id, 
          email: userToRemove.email, 
          role: userToRemove.role 
        }
      }
    });

    return { success: true };
  }
);