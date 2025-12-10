import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const URL = process.env.CLERK_BACKEND_API_URL;
const TOKEN = process.env.CLERK_SECRET_KEY;

// Generate a cryptographically secure random password
function generateSecurePassword(length: number = 24): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const randomBytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

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
    password: generateSecurePassword(),
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
