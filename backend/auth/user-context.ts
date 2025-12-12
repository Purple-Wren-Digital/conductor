import { APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { marketCenterRepository, userRepository } from "../ticket/db";
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
    const existingUser = await userRepository.findByEmail(
      authData.emailAddress
    );

    // If found, update with Clerk user ID
    if (existingUser) {
      await userRepository.update(existingUser.id, {
        clerkId: authData.userID,
      });
      user = existingUser;
    } else {
      const userInvitation = await marketCenterRepository.findInvitationByEmail(
        authData.emailAddress
      );
      const nameParts = authData.emailAddress.split("@")[0].split(/[._-]/);
      const name = nameParts
        .map((part: any) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      if (userInvitation) {
        user = await userRepository.create({
          email: authData.emailAddress,
          clerkId: authData.userID,
          role: userInvitation.role ?? "AGENT",
          marketCenterId: userInvitation.marketCenterId,
          name: name,
        });
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
      name: name,
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
