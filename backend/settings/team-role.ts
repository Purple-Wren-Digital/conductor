import { api, APIError } from "encore.dev/api";
import { userRepository, ticketRepository, settingsAuditRepository } from "./db";
import { UpdateMemberRequest } from "./types";
import { getUserContext } from "../auth/user-context";
import { canChangeUserRoles, isSuperuserProtected } from "../auth/permissions";

export const updateMemberRole = api(
  { method: "PUT", path: "/settings/team/members/:id/role", auth: true },
  async ({ id, role }: { id: string } & UpdateMemberRequest): Promise<{ success: boolean }> => {
    const userContext = await getUserContext();

    // Check if user can change roles
    const canChangeRoles = await canChangeUserRoles(userContext);
    if (!canChangeRoles) {
      throw APIError.permissionDenied("Only administrators can update member roles");
    }

    // Find the user with their market center
    const user = await userRepository.findByIdWithMarketCenter(userContext.userId);

    if (!user) {
      throw APIError.notFound("User not found");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Get the user to update - check they are in the same market center
    const userToUpdate = await userRepository.findById(id);

    if (!userToUpdate || !userToUpdate.isActive) {
      throw APIError.notFound("User not found");
    }

    // Protect superusers from being modified by non-superusers
    if (isSuperuserProtected(userToUpdate, userContext)) {
      throw APIError.permissionDenied("Cannot modify a superuser account");
    }

    // Non-superusers can only modify users in their own market center
    if (!userContext.isSuperuser && userToUpdate.marketCenterId !== user.marketCenterId) {
      throw APIError.notFound("User not found or not in your market center");
    }

    // Prevent self-role change for certain scenarios
    if (userToUpdate.id === user.id && userToUpdate.role === 'ADMIN' && role !== 'ADMIN') {
      // Check if this is the last admin
      const adminCount = await userRepository.count({
        marketCenterId: user.marketCenterId!,
        isActive: true,
      });

      // Need to count admins specifically
      const admins = await userRepository.findByMarketCenterIdAndRole(user.marketCenterId!, 'ADMIN');

      if (admins.length <= 1) {
        throw APIError.aborted("Cannot downgrade the last admin");
      }
    }

    const previousRole = userToUpdate.role;

    // Update the user's role
    await userRepository.update(id, { role });

    // If downgrading from ADMIN/STAFF to AGENT, reassign their assigned tickets
    if ((previousRole === 'ADMIN' || previousRole === 'STAFF') && role === 'AGENT') {
      await ticketRepository.updateManyByAssignee(id, {
        assigneeId: user.id
      }, {
        statusIn: ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE']
      });
    }

    // Log the role change in audit trail
    await settingsAuditRepository.create({
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
    });

    return { success: true };
  }
);
