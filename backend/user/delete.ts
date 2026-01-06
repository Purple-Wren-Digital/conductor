import { api, APIError } from "encore.dev/api";
import { userRepository, db, toJson } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canDeactivateUsers } from "../auth/permissions";

export interface DeleteUserRequest {
  id: string;
}
export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

export const deleteUser = api<DeleteUserRequest, DeleteUserResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/users/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const isAdmin = await canDeactivateUsers(userContext);
    if (!isAdmin) {
      throw APIError.permissionDenied("Only admins delete/deactivate users");
    }

    const user = await userRepository.findById(req.id);
    if (!user || !user.isActive) {
      throw APIError.notFound("User not found");
    }

    // Check if already deleted
    const deletedCheck = await db.queryRow<{ deleted_at: Date | null }>`
      SELECT deleted_at FROM users WHERE id = ${req.id}
    `;

    if (deletedCheck?.deleted_at) {
      return { success: true, message: "User already deactivated" };
    }

    // Perform deactivation and create history in a transaction
    await using tx = await db.begin();

    try {
      // Deactivate user
      await tx.exec`
        UPDATE users
        SET is_active = false, deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${req.id}
      `;

      // Create user history record
      await tx.exec`
        INSERT INTO user_history (
          id, user_id, action, field, previous_value, new_value, changed_by_id, changed_at, snapshot
        ) VALUES (
          gen_random_uuid()::text,
          ${user.id},
          ${"DELETE"},
          ${"user"},
          ${"Activated"},
          ${"Deactivated"},
          ${userContext.userId},
          NOW(),
          ${toJson(user)}::jsonb
        )
      `;
    } catch (error) {
      throw APIError.aborted("User was not deactivated");
    }

    return { success: true, message: "User deactivated" };
  }
);
