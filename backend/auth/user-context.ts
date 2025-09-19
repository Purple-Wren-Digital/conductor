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
  //   //     auth0Id: "local-dev-user",
  //   //   };
  //   // // ADMIN USER
  //   // return {
  //   //   userId: "u3",
  //   //   email: "clara.admin@kw.com",
  //   //   role: "ADMIN",
  //   //   marketCenterId: null,
  //   //   auth0Id: "auth0|68c070eba093c0727999c608",
  //   // };
  //   // // AGENT USER
  //   // return {
  //   //   userId: "u1",
  //   //   email: "alice.agent@kw.com",
  //   //   role: "AGENT",
  //   //   marketCenterId: null,
  //   //   auth0Id: "auth0|68c07090070c5a2759e2c928",
  //   // };
  //   // // STAFF USER
  //   return {
  //     userId: "u2",
  //     email: "bob.staff@kw.com",
  //     role: "STAFF",
  //     marketCenterId: null,
  //     auth0Id: "auth0|68c070b2070c5a2759e2c934",
  //   };

  // }

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
