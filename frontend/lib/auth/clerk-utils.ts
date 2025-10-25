/**
 * Clerk authentication utilities
 *
 * This file provides helper functions for getting authentication tokens
 * in both client and server components.
 */

import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Server-side: Get the current user's ID from Clerk
 * Use this in Server Components and Server Actions
 */
export async function getClerkUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: No user ID found");
  }
  return userId;
}

/**
 * Server-side: Get the current user from Clerk
 * Use this in Server Components when you need full user details
 */
export async function getClerkUser() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized: No user found");
  }
  return user;
}

/**
 * Get auth token for API requests
 * In development, returns "local"
 * In production, you should pass the Clerk user ID from client components
 */
export function getAuthToken(clerkUserId?: string): string {
  if (process.env.NODE_ENV === "development") {
    return "local";
  }

  if (!clerkUserId) {
    throw new Error("No Clerk user ID provided");
  }

  return clerkUserId;
}
