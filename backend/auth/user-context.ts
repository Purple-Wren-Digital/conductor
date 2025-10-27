import { APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { prisma } from "../ticket/db";
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

  // if (
  //   process.env.NODE_ENV === "development" &&
  //   authData.userID === "local-dev-user"
  // ) {
  //   // // LOCAL DEV USER
  //   // return   {
  //   //     userId: "e5f4c18b-7a88-49ac-8aef-fe7dd6054206",
  //   //     email: "local@localhost.com",
  //   //     role: "ADMIN",
  //   //     marketCenterId: null,
  //   //     clerkId: "local-dev-user",
  //   //   };
  //   // // ADMIN USER
  //   // return {
  //   //   userId: "u3",
  //   //   email: "clara.admin@kw.com",
  //   //   role: "ADMIN",
  //   //   marketCenterId: null,
  //   //   clerkId: "auth0|68c070eba093c0727999c608",
  //   // };
  //   // // AGENT USER
  //   // return {
  //   //   userId: "u1",
  //   //   email: "alice.agent@kw.com",
  //   //   role: "AGENT",
  //   //   marketCenterId: null,
  //   //   clerkId: "auth0|68c07090070c5a2759e2c928",
  //   // };
  //   // // STAFF USER
  //   return {
  //     userId: "u2",
  //     email: "bob.staff@kw.com",
  //     role: "STAFF",
  //     marketCenterId: null,
  //     clerkId: "auth0|68c070b2070c5a2759e2c934",
  //   };

  // }

  // Try to find user by Clerk ID
  let user = await prisma.user.findUnique({
    where: { clerkId: authData.userID },
  });

  // If not found and we have an email, try to find by email
  if (!user && authData.emailAddress) {
    user = await prisma.user.findUnique({
      where: { email: authData.emailAddress },
    });

    // If found, update with Clerk user ID
    if (user) {
      //  && !user.clerkId
      await prisma.user.update({
        where: { id: user.id },
        data: { clerkId: authData.userID },
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

    user = await prisma.user.create({
      data: {
        email: email,
        clerkId: authData.userID,
        role: "AGENT", // New users default to AGENT role
        name: name,
      },
    });

    console.log(`✅ Created new user: ${name} (${email}) with role AGENT`);
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    marketCenterId: user.marketCenterId,
    clerkId: authData.userID,
  };
}
