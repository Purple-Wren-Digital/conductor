import { APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { prisma } from "../ticket/db";
import type { UserRole } from "../ticket/types";

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  marketCenterId: string | null;
  auth0Id: string;
}

export async function getUserContext(): Promise<UserContext> {
  const authData = await getAuthData();
  if (!authData) {
    throw APIError.unauthenticated("User not authenticated");
  }

  if (process.env.NODE_ENV === "development" && authData.userID === "local-dev-user") {
    return {
      userId: "local-dev-user",
      email: "local@localhost.com",
      role: "ADMIN",
      marketCenterId: null,
      auth0Id: "local-dev-user",
    };
  }

  let user = await prisma.user.findUnique({
    where: { auth0Id: authData.userID },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: authData.emailAddress },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { auth0Id: authData.userID },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: authData.emailAddress,
        auth0Id: authData.userID,
        role: "AGENT",
        name: authData.emailAddress.split("@")[0],
      },
    });
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    marketCenterId: user.marketCenterId,
    auth0Id: authData.userID,
  };
}