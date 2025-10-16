import { NextResponse } from "next/server";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

export async function POST(req: Request) {
  const body = await req.json();

  if (!body || !body?.role || (body && body?.role && body?.role === "AGENT")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
  try {
    const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        grant_type: "client_credentials",
      }),
    });

    // console.log("MANAGEMENT TOKEN RESPONSE", tokenRes);
    if (!tokenRes.ok) {
      throw new Error("Failed to generate management access token");
    }
    const { access_token } = await tokenRes.json();

    return NextResponse.json(
      { managementToken: access_token },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}
