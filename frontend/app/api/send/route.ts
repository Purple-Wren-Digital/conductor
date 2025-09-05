import * as React from "react";
import { NextRequest } from "next/server";
import { Resend } from "resend";
import CreatedTicketNotification from "../../../packages/transactional/emails/CreatedTicketNotification";

const resend = new Resend(process.env.RESEND_API_KEY);
const DEV = process.env.NEXT_PUBLIC_VERCEL_ENV;

export async function POST(req: NextRequest) {
  const emailData = await req.json();

  if (!emailData) {
    return Response.json({ error: "Missing email data" }, { status: 400 });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Conductor Ticketing <onboarding@resend.dev>",
      to: ["delivered@resend.dev"], // TODO: creator, assignee emails
      subject: `${DEV && "DEV "}Conductor: Created Ticket #${emailData?.ticketNumber}`,
      react: CreatedTicketNotification({
        ticketNumber: emailData?.ticketNumber,
        ticketTitle: emailData?.ticketTitle,
        creatorName: emailData?.creatorName,
        creatorId: emailData?.creatorId,
        createdOn: emailData?.createdOn,
        dueDate: emailData?.dueDate ? emailData.dueDate : undefined,
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
