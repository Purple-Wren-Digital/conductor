import { NextRequest, NextResponse } from "next/server";

const URL = process.env.CLERK_BACKEND_API_URL;
const TOKEN = process.env.CLERK_SECRET_KEY;

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${URL}/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Origin: "Access-Control-Allow-Origin",
        Authorization: `Bearer ${TOKEN}`,
      },
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
    console.error("Failed to fetch clerk users", error);
  }
}

// TODO: EXAMPLE PARAMS
// ?email_address=
// &phone_number=
// &external_id=
// &user_id=
// &query=
// &email_address_query=
// &phone_number_query=
// &username_query=
// &name_query=
// &banned=true
// &limit=10
// &offset=0
// &order_by=-created_at
