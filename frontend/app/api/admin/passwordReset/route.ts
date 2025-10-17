import { NextResponse } from "next/server";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const URL = process.env.APP_BASE_URL; // TODO: process.env.VERCEL_ENV === "production" ? "" :

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const body = await req.json();

  if (!body || !body?.auth0Id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/tickets/password-change`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          result_url: URL, // where to go after password reset
          user_id: body.auth0Id,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(
        response?.statusText
          ? response.statusText
          : "Failed to generate password reset link"
      );
    }
    const { ticket: passwordResetLink } = await response.json();

    return NextResponse.json({ ticket: passwordResetLink }, { status: 200 });
  } catch (error) {
    console.error("Unable to process invite user request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}
