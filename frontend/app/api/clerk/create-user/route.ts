import { NextRequest, NextResponse } from "next/server";

const URL = process.env.CLERK_BACKEND_API_URL;
const TOKEN = process.env.CLERK_SECRET_KEY;

export async function POST(req: NextRequest) {
  const requestData = await req.json();

  if (
    !requestData ||
    !requestData?.email ||
    !requestData?.firstName ||
    !requestData?.lastName
  ) {
    return Response.json({ error: "Missing user data" }, { status: 400 });
  }
  const body = {
    email_address: requestData.email,
    first_name: requestData.firstName,
    last_name: requestData.lastName,
    password: `${Math.floor(Math.random() * 999) + 100}-${requestData.firstName}${requestData.lastName}-${Math.floor(Math.random() * 999) + 100}`, // at least 8 characters // null,
    public_metadata: {
      role: requestData?.role ?? "AGENT",
      marketCenterId: requestData?.marketCenterId ?? null,
      invited: false,
      invitedOn: null,
      accepted: false,
      acceptedOn: null,
    },
  };
  try {
    const response = await fetch(`${URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "Access-Control-Allow-Origin",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(body),
    });
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
    console.error("Failed to create Clerk user", error);
  }
}
