// import { api } from "encore.dev/api";
// import { prisma } from "../ticket/db";

// interface PostRegPayload {
//   user_id: string; // auth0 user ID (sub)
//   email: string;
//   name?: string;
// }

// export const postRegistration = api<PostRegPayload, { ok: true }>(
//   { expose: true, method: "POST", path: "/auth/post-registration" },
//   async (payload, ctx) => {
//     // Bearer token check (send a shared secret from Auth0 Action)
//     const auth = ctx.req.headers["authorization"] || "";
//     if (auth !== `Bearer ${process.env.SYNC_TOKEN}`) {
//       throw new Error("Unauthorized");
//     }

//     await prisma.user.upsert({
//       where: { auth0Id: payload.user_id },
//       update: { email: payload.email, name: payload.name ?? null },
//       create: { auth0Id: payload.user_id, email: payload.email, name: payload.name ?? null },
//     });

//     return { ok: true };
//   }
// );
