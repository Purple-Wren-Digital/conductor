// import * as React from "react";
// import { NextRequest } from "next/server";

// // https://auth0.com/docs/api/management/v2/users/post-users

// export async function POST(req: NextRequest) {
//   const { email, name, password, username } = await req.json();

//   try {
//     const response = fetch(`${process.env.AUTH0_DOMAIN}/v2/users`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         email: email,
//         user_metadata: {},
//         blocked: false,
//         email_verified: false,
//         phone_verified: false,
//         app_metadata: {},
//         given_name: "",
//         family_name: "",
//         name: name,
//         connection: "",
//         password: password,
//         verify_email: false,
//         username: username,
//       }),
//     });

//     console.log("RESPONSE - Create Auth0 User as Admin", response);
//     // const data = await response.json;

//     return response;
//   } catch (error) {
//     console.error("Error creating user in auth0:", error);
//     return Response.json({ error }, { status: 500 });
//   }
// }
