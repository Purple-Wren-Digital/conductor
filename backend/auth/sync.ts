// // backend/auth/sync.ts
// import { api, Header } from "encore.dev/api";
// import { prisma } from "../ticket/db";
// import crypto from "crypto";

// interface SyncPayload {
//   user_id: string; // Auth0 sub e.g. "auth0|abc123"
//   email: string;
//   name?: string;
//   authorization: Header<"Authorization">;
//   signature: Header<"x-auth0-signature">;
// }
// interface SyncRes {
//   ok: true;
//   userId: string;
// }

// export const syncAuth0User = api<SyncPayload, SyncRes>(
//   { expose: true, method: "POST", path: "/auth/sync" },
//   async ({ user_id, email, name, authorization, signature }) => {
//     const token = authorization?.trim() ?? "";
//     if (token !== `Bearer ${process.env.SYNC_TOKEN}`)
//       throw new Error("Unauthorized");

//     const toSign = `${user_id}|${email}|${name ?? ""}`;
//     const mac = crypto
//       .createHmac("sha256", process.env.SYNC_HMAC_SECRET!)
//       .update(toSign)
//       .digest("hex");
//     if (!signature || signature !== mac) throw new Error("Bad signature");

//     const user = await prisma.user.upsert({
//       where: { auth0Id: user_id },
//       update: { email },
//       create: { auth0Id: user_id, email, name: name ?? email.split("@")[0] },
//       select: { id: true },
//     });
//     console.log("UPSERTED", user.id);

//     return { ok: true, userId: user.id };
//   }
// );

// // Note: This endpoint is intended to be called from an Auth0 Action (post-login or post-registration).
// // The Action should send a request to this endpoint with a shared secret in the Authorization header
// // and an HMAC signature in the x-auth0-signature header. The body should contain user_id, email, and name.
