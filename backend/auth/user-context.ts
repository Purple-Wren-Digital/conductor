import { APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { userRepository, marketCenterRepository } from "../ticket/db";
import type { UserRole } from "../user/types";

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  marketCenterId: string | null;
  clerkId: string;
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
    user = await userRepository.findByEmail(authData.emailAddress);

    // If found, update with Clerk user ID
    if (user) {
      await userRepository.update(user.id, { clerkId: authData.userID });
    }
  }

  // If user exists but has no market center, check for pending invitation
  // This fixes race conditions where user was created before invitation was processed
  if (user && !user.marketCenterId && authData.emailAddress) {
    const invitation =
      await marketCenterRepository.findActiveInvitationByEmail(
        authData.emailAddress
      );

    if (invitation?.marketCenterId) {
      user = await userRepository.update(user.id, {
        marketCenterId: invitation.marketCenterId,
        role: invitation.role,
      });
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

    // Check if user has a pending or recently accepted invitation
    // This ensures invited users get their market center even if getUserContext
    // is called before acceptInvitation completes
    const invitation =
      await marketCenterRepository.findActiveInvitationByEmail(email);

    user = await userRepository.create({
      email: email,
      clerkId: authData.userID,
      role: invitation?.role ?? "AGENT",
      name: name,
      marketCenterId: invitation?.marketCenterId ?? null,
    });
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    marketCenterId: user.marketCenterId,
    clerkId: authData.userID,
  };
}
