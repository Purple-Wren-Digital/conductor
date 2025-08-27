// import { api } from "encore.dev/api";
// import { prisma } from "../ticket/db";
// import { signUpWithAuth0 } from "../auth/auth";
// import type { User, UserRole } from "../ticket/types";

// export interface CreateUserRequest {
//   email: string;
//   auth0Id: string;
//   name: string;
//   password: string;
//   role?: UserRole;
// }

// export interface CreateUserResponse {
//   user: User;
// }

// export const create = api<CreateUserRequest, CreateUserResponse>(
//   { expose: true, method: "POST", path: "/users" },
//   async (req: CreateUserRequest) => {
//     if (process.env.NODE_ENV !== "development") {
//       const isSignUpSuccessful = await signUpWithAuth0(
//         req.email,
//         req.password,
//         req.name
//       );
//       if (!isSignUpSuccessful) {
//         throw new Error("Auth0 user signup failed");
//       }
//     }

//     const user = await prisma.user.create({
//       data: {
//         email: req.email,
//         auth0Id: req.auth0Id,
//         name: req.name,
//         role: req.role || "AGENT",
//       },
//     });

//     if (!user) {
//       throw new Error("Failed to create user in database");
//     }

//     // Ensure name is never null
//     const safeUser = { ...user, name: user.name ?? "" };

//     return { user: safeUser };
//   }
// );
