import { APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import {
  marketCenterRepository,
  userRepository,
  userMarketCenterRepository,
} from "../ticket/db";
import { defaultNotificationPreferences } from "../utils";
import type { UserRole } from "../user/types";

// Helper function to ensure user has notification preferences
async function ensureNotificationPreferences(userId: string): Promise<void> {
  const userWithSettings = await userRepository.findByIdWithSettings(userId);
  if (!userWithSettings?.userSettings || !userWithSettings?.userSettings?.id) {
    const newSettings = await userRepository.createUserSettings(userId);
    await userRepository.createNotificationPreferences(
      newSettings.id,
      defaultNotificationPreferences
    );
  } else if (
    !userWithSettings.userSettings.notificationPreferences ||
    userWithSettings.userSettings.notificationPreferences.length === 0
  ) {
    await userRepository.createNotificationPreferences(
      userWithSettings.userSettings.id,
      defaultNotificationPreferences
    );
  }
}

export interface UserContext {
  name: string;
  userId: string;
  email: string;
  role: UserRole;
  marketCenterId: string | null;
  clerkId: string;
  isSuperuser: boolean;
}

export async function getUserContext(): Promise<UserContext> {
  const authData = await getAuthData();
  // console.log("AUTH DATA - getUserContext()", authData);
  if (!authData) {
    throw APIError.unauthenticated("User not authenticated");
  }

  // Try to find user by Clerk ID
  let user = await userRepository.findByClerkId(authData.userID);

  // If not found and we have an email, try to find by email
  if (!user && authData.emailAddress) {
    const existingUser = await userRepository.findByEmail(
      authData.emailAddress
    );

    // If found, update with Clerk user ID
    if (existingUser && existingUser.isActive === true) {
      await userRepository.update(existingUser.id, {
        clerkId: authData.userID,
      });
      user = existingUser;
    } else {
      const userInvitation = await marketCenterRepository.findInvitationByEmail(
        authData.emailAddress
      );

      const isInvalid =
        userInvitation?.expiresAt &&
        new Date() > new Date(userInvitation?.expiresAt) &&
        (userInvitation?.status === "EXPIRED" ||
          userInvitation?.status === "CANCELLED");

      if (userInvitation && !isInvalid) {
        user = await userRepository.create({
          name: userInvitation?.name ? userInvitation.name : "Name Not Set",
          email: authData.emailAddress,
          clerkId: authData.userID,
          role: userInvitation.role ?? "AGENT",
          marketCenterId: userInvitation.marketCenterId,
        });
        // Create notification preferences for new user
        await ensureNotificationPreferences(user.id);
        // Add junction row for the invited market center
        if (user.marketCenterId) {
          await userMarketCenterRepository.addUserToMarketCenter(
            user.id,
            user.marketCenterId
          );
        }
        await userRepository.createHistory({
          userId: user.id,
          marketCenterId: user.marketCenterId,
          action: "CREATE",
          field: "user",
          newValue: "Activated via Invitation",
          changedById: user.id,
        });
        if (userInvitation.id) {
          await marketCenterRepository.updateInvitationStatus(
            userInvitation.id,
            "ACCEPTED"
          );
        }
        if (user.marketCenterId) {
          await marketCenterRepository.createHistory({
            marketCenterId: user.marketCenterId,
            action: "INVITE",
            field: `Accepted: ${userInvitation.email}`,
            newValue: JSON.stringify({
              status: "ACCEPTED",
              email: userInvitation.email,
            }),
            previousValue: JSON.stringify({
              status: userInvitation.status,
              email: userInvitation.email,
            }),
            changedById: user.id,
          });
        }
      }
    }
  }

  // If still not found, create new user
  if (!user) {
    const email = authData.emailAddress;
    if (!email) {
      throw APIError.unauthenticated("No email address found for user");
    }

    // Extract name from email (e.g., "john.doe@example.com" -> "John Doe")
    const nameParts = email.split("@")[0].split(/[._-]/);
    const name = nameParts
      .map((part: any) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    user = await userRepository.create({
      email: email,
      clerkId: authData.userID,
      role: "AGENT", // New users default to AGENT role
      name: name ?? "Name Not Set",
    });
    // Create notification preferences for new user
    await ensureNotificationPreferences(user.id);

    await userRepository.createHistory({
      userId: user.id,
      marketCenterId: user.marketCenterId,
      action: "CREATE",
      field: "user",
      newValue: "Activated",
      changedById: user.id,
    });
  }

  return {
    name: user.name || "Name Not Set",
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    marketCenterId: user.marketCenterId,
    clerkId: authData.userID,
    isSuperuser: user.isSuperuser ?? false,
  };
}
