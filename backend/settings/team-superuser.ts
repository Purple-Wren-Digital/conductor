import { api, APIError } from "encore.dev/api";
import { userRepository, settingsAuditRepository } from "./db";
import { getUserContext } from "../auth/user-context";

export const updateSuperuserStatus = api(
  { method: "PUT", path: "/settings/team/members/:id/superuser", auth: true },
  async ({
    id,
    isSuperuser,
  }: {
    id: string;
    isSuperuser: boolean;
  }): Promise<{ success: boolean }> => {
    const userContext = await getUserContext();

    // Only superusers can grant/revoke superuser status
    if (!userContext.isSuperuser) {
      throw APIError.permissionDenied(
        "Only superusers can grant or revoke superuser status"
      );
    }

    const userToUpdate = await userRepository.findById(id);

    if (!userToUpdate || !userToUpdate.isActive) {
      throw APIError.notFound("User not found");
    }

    // Prevent removing your own superuser status
    if (userToUpdate.id === userContext.userId && !isSuperuser) {
      throw APIError.aborted("Cannot revoke your own superuser status");
    }

    const previousValue = userToUpdate.isSuperuser;

    await userRepository.update(id, { isSuperuser });

    // Log the change in audit trail
    if (userToUpdate.marketCenterId) {
      await settingsAuditRepository.create({
        marketCenterId: userToUpdate.marketCenterId,
        userId: userContext.userId,
        action: "superuser_update",
        section: "team",
        previousValue: {
          userId: userToUpdate.id,
          isSuperuser: previousValue,
        },
        newValue: {
          userId: userToUpdate.id,
          isSuperuser,
        },
      });
    }

    return { success: true };
  }
);
