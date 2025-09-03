// import { api, APIError } from "encore.dev/api";
// import { prisma } from "../ticket/db";
// import { getAuthData } from "~encore/auth";
// import type { UserRole } from "../ticket/types";

// interface MeResponse {
//   user: {
//     id: string;
//     email: string | null;
//     name: string | null;
//     auth0Id: string;
//     role?: UserRole;
//   };
// }

// export const me = api<void, MeResponse>(
//   { expose: true, method: "GET", path: "/me", auth: true },
//   async () => {
//     // Encore should populate this from your auth handler
//     const auth = getAuthData() as {
//       sub: string;
//       email: string;
//       name?: string;
//     } | null;

//     if (!auth?.sub) throw APIError.failedPrecondition;

//     // Sync user with database
//     // Note: In a production app, you might want to do this in a background job
//     // or via an Auth0 Action (post-login) to avoid slowing down the request.

//     // Create if first time, otherwise update (email/name if present)
//     const user = await prisma.user.upsert({
//       where: { auth0Id: auth.sub },
//       update: {
//         email: auth.email ?? undefined,
//         name: auth.name ?? undefined,
//       },
//       create: {
//         auth0Id: auth.sub,
//         email: auth.email,
//         name: auth.name ?? "",
//         role: "AGENT",
//       },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         auth0Id: true,
//         role: true,
//       },
//     });

//     if (!user) throw new Error("Failed to fetch or create user");

//     // Ensure name is never null

//     return { user: user };
//   }
// );
