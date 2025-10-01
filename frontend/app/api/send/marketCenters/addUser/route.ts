import * as React from "react";
import { NextRequest } from "next/server";
import { Resend } from "resend";
import MarketCenterUserUpdate from "../../../../../packages/transactional/emails/MarketCenterUserUpdate";

const resend = new Resend(process.env.RESEND_API_KEY);
const DEV = process.env.NEXT_PUBLIC_VERCEL_ENV;

export async function POST(req: NextRequest) {
  const emailData = await req.json();

  console.log("Email Data", emailData);

  if (!emailData) {
    return Response.json({ error: "Missing email data" }, { status: 400 });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Conductor Ticketing <onboarding@resend.dev>",
      to: ["delivered@resend.dev"], // TODO: inviter and emailData?.userEmail
      subject: `${DEV && "DEV "}Conductor: ${emailData?.userUpdate} to Market Center`,
      react: MarketCenterUserUpdate({
        userUpdate: emailData?.userUpdate,
        marketCenter: emailData?.marketCenter,
        userName: emailData?.newUserName,
        editorName: emailData?.inviterName,
        editorEmail: emailData?.inviterEmail,
      }) as React.ReactElement,
    });
    if (error) {
      console.error("Error sending email:", error);
      return Response.json({ error }, { status: 500 });
    }
    return Response.json({ data });
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
}
