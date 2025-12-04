import { api, APIError } from "encore.dev/api";
import { db, userRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canManageTeam } from "../auth/permissions";

export const removeTeamMember = api(
  { method: "DELETE", path: "/settings/team/members/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ success: boolean }> => {
    const userContext = await getUserContext();

    // Find the user and their market center
    const user = await db.queryRow<{
      id: string;
      marketCenterId: string | null;
      role: string;
    }>`
      SELECT id, market_center_id as "marketCenterId", role
      FROM users
      WHERE id = ${userContext.userId}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    if (!user.marketCenterId) {
      throw APIError.notFound("Market center not found");
    }

    // Check if user can manage team
    const canManage = await canManageTeam(
      userContext,
      id,
      user?.marketCenterId ?? undefined
    );
    if (!canManage) {
      throw APIError.permissionDenied(
        "You do not have permission to remove team members"
      );
    }

    // Get the user to be removed
    const userToRemove = await db.queryRow<{
      id: string;
      role: string;
    }>`
      SELECT id, role
      FROM users
      WHERE id = ${id}
        AND market_center_id = ${user.marketCenterId}
        AND deleted_at IS NULL
    `;

    if (!userToRemove) {
      throw APIError.notFound("User not found or not in your market center");
    }

    // Prevent self-removal
    if (userToRemove.id === user.id) {
      throw APIError.aborted("Cannot remove yourself");
    }

    // Staff can only remove non-admin users
    if (userContext.role === "STAFF" && userToRemove.role === "ADMIN") {
      throw APIError.permissionDenied("Staff cannot remove administrators");
    }

    // Check if this is the last admin
    if (userToRemove.role === "ADMIN") {
      const adminCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count
        FROM users
        WHERE market_center_id = ${user.marketCenterId}
          AND role = 'ADMIN'
          AND deleted_at IS NULL
          AND is_active = true
      `;

      if (adminCount && adminCount.count <= 1) {
        throw APIError.aborted("Cannot remove the last admin");
      }
    }

    // Soft delete the user
    await db.exec`
      UPDATE users
      SET deleted_at = NOW(), is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `;

    // Reassign their tickets to the current user (admin)
    await db.exec`
      UPDATE tickets
      SET assignee_id = ${user.id}, updated_at = NOW()
      WHERE assignee_id = ${id}
        AND status IN ('ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE')
    `;

    return { success: true };
  }
);
