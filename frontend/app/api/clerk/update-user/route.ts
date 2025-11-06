// Clerk Backend API Docs: https://clerk.com/docs/reference/backend-api/tag/users/patch/users/%7Buser_id%7D

import { NextRequest, NextResponse } from "next/server";

const URL = process.env.CLERK_BACKEND_API_URL;
const TOKEN = process.env.CLERK_SECRET_KEY;

export async function PATCH(req: NextRequest) {
  const requestData: {
    clerkId: string;
    first_name?: string;
    last_name?: string;
    primary_email_address_id?: string;
    invited?: boolean;
    invitedOn?: Date | string;
    accepted?: boolean;
    acceptedOn?: Date | string;
    role?: string;
    marketCenterId?: string;
  } = await req.json();
  if (!requestData || !requestData?.clerkId) {
    throw new Error("Missing payload and/or user id");
  }

  let body: any = {};

  if (requestData?.first_name) {
    body.first_name = requestData.first_name;
  } else if (requestData?.last_name) {
    body.last_name = requestData.last_name;
  } else if (requestData?.primary_email_address_id) {
    body.primary_email_address_id = requestData.primary_email_address_id;
  } else if (requestData?.invited && requestData?.invitedOn) {
    body.public_metadata.invited = requestData.invited;
    body.public_metadata.invitedOn = requestData.invitedOn;
  } else if (requestData?.accepted && requestData?.acceptedOn) {
    body.public_metadata.accepted = requestData.accepted;
    body.public_metadata.accepted = requestData.acceptedOn;
  } else if (requestData?.role) {
    body.public_metadata.marketCenterId = requestData.role;
  } else if (requestData?.marketCenterId) {
    body.public_metadata.marketCenterId = requestData.marketCenterId;
  } else {
    throw new Error("Nothing to update");
  }

  try {
    const response = await fetch(`${URL}/users/${requestData.clerkId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Origin: "Access-Control-Allow-Origin",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    console.log("********** CLERK UPDATE USER NAME RESPONSE **********");
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || "Clerk request failed" },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to update Clerk user", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
