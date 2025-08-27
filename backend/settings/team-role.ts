import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
import { UpdateMemberRoleRequest } from "./types";

export const updateMemberRole = api(
  { method: "PUT", path: "/settings/team/members/:id/role", auth: false },
  async ({ id, role }: { id: string } & UpdateMemberRoleRequest): Promise<{ success: boolean }> => {
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
      throw APIError.permissionDenied("Only administrators can update member roles");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Get the user to update
    const userToUpdate = await prisma.user.findFirst({
      where: {
        id,
        marketCenterId: user.marketCenterId!,
        deletedAt: null,
        isActive: true
      }
    });

    if (!userToUpdate) {
      throw APIError.notFound("User not found or not in your market center");
    }

    // Prevent self-role change for certain scenarios
    if (userToUpdate.id === user.id && userToUpdate.role === 'ADMIN' && role !== 'ADMIN') {
      // Check if this is the last admin
      const adminCount = await prisma.user.count({
        where: {
          marketCenterId: user.marketCenterId!,
          role: 'ADMIN',
          deletedAt: null,
          isActive: true
        }
      });

      if (adminCount <= 1) {
        throw APIError.aborted("Cannot downgrade the last admin");
      }
    }

    const previousRole = userToUpdate.role;

    // Update the user's role
    await prisma.user.update({
      where: { id },
      data: { role }
    });

    // If downgrading from ADMIN/STAFF to AGENT, reassign their assigned tickets
    if ((previousRole === 'ADMIN' || previousRole === 'STAFF') && role === 'AGENT') {
      await prisma.ticket.updateMany({
        where: {
          assigneeId: id,
          status: { in: ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE'] }
        },
        data: {
          assigneeId: user.id
        }
      });
    }

    // Log the role change in audit trail
    await prisma.settingsAuditLog.create({
      data: {
        marketCenterId: user.marketCenterId!,
        userId: user.id,
        action: 'role_update',
        section: 'team',
        previousValue: { 
          userId: userToUpdate.id, 
          previousRole 
        },
        newValue: { 
          userId: userToUpdate.id, 
          newRole: role 
        }
      }
    });

    return { success: true };
  }
);