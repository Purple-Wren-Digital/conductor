import { NextResponse } from "next/server";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }
  // Fetches newly created users (with user_metadata field)
  // Sorted by most recently created first
  // Limited to 20 results
  // https://auth0.com/docs/manage-users/user-search
  const params = new URLSearchParams({
    q: "_exists_:user_metadata.invited",
    search_engine: "v3",
    per_page: "20",
    sort: "user_metadata.created:-1",
  });

  try {
    const response = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users${params ? `?${params.toString()}` : ""}`,
      {
        method: "GET", // Permission read:users
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        response?.statusText ? response.statusText : "Failed to fetch users"
      );
    }

    const data = await response.json();
    console.log("GET /api/admin/auth0Users data:", data);

    return NextResponse.json({ users: data }, { status: 200 });
  } catch (error) {
    console.error("Unable to process fetch users request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }
  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users`, {
      method: "POST", // Permission create:users
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        connection: "Username-Password-Authentication",
        name: body.name,
        email: body.email,
        email_verified: false,
        username: body.name.split(" ").join(""),
        password: `${body.name.split(" ").join("")}-${Math.random().toString(36).slice(-8)}`, // Temporary password
        user_metadata: {
          role: body.role || "AGENT",
          createdBy: body.createdBy,
          created: new Date(),
          invited: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        response?.statusText ? response.statusText : "Failed to create user"
      );
    }

    const data = await response.json();
    console.log("handleSubmitCreateUserForm() data:", data);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Unable to process create user request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}
