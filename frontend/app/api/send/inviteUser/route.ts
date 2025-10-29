// import * as React from "react";
// import { NextRequest } from "next/server";
// import { Resend } from "resend";
// import NewUserInvitation from "../../../../packages/transactional/emails/UserInvitation";

// const resend = new Resend(process.env.RESEND_API_KEY);
// const DEV = process.env.NEXT_PUBLIC_VERCEL_ENV;

// export async function POST(req: NextRequest) {
//   const emailData = await req.json();

//   if (!emailData || !emailData?.newUserEmail || !emailData?.inviteLink) {
//     return Response.json({ error: "Missing email data" }, { status: 400 });
//   }
//   try {
//     const { data, error } = await resend.emails.send({
//       from: "Conductor Ticketing <onboarding@resend.dev>",
//       to: ["delivered@resend.dev"], // TODO: emailData?.newUserEmail
//       subject: `${DEV && "DEV "}Conductor Invitation`,
//       react: NewUserInvitation({
//         newUserName: emailData?.newUserName,
//         newUserEmail: emailData?.newUserEmail,
//         newUserRole: emailData?.newUserRole,
//         newUserMarketCenter: emailData?.newUserMarketCenter || null,
//         inviterName: emailData?.inviterName,
//         inviterEmail: emailData?.inviterEmail,
//         inviteLink: emailData?.inviteLink,
//       }) as React.ReactElement,
//     });

//     if (error) {
//       console.error("Error sending email:", error);
//       return Response.json({ error }, { status: 500 });
//     }

//     return Response.json({ data });
//   } catch (error) {
//     console.error("Error sending email:", error);
//     return Response.json({ error }, { status: 500 });
//   }
// }
