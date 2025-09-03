import * as React from "react";
import { NextRequest } from "next/server";
import { Resend } from "resend";
import { CreatedTicketTemplate } from "../../../packages/transactional/emails/CreatedTicketTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { emailData } = await req.json();

  if (!emailData) Response.json({ status: 400 });
  try {
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: `**DEVELOPMENT** Conductor: Created Ticket #${emailData?.ticketNumber}`,
      react: CreatedTicketTemplate({
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
    console.error("RESEND_API_KEY:", process.env.RESEND_API_KEY);
    return Response.json({ error }, { status: 500 });
  }
}
