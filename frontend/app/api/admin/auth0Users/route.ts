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
  // https://auth0.com/docs/manage-users/user-search
  const params = new URLSearchParams({
    search_engine: "v3",
    // per_page: "20", // TODO: how to filter this..
    sort: "created_at:-1",
  });

  try {
    const response = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users${params ? `?${params.toString()}` : ""}`,
      {
        method: "GET", // Auth0 Permission read:users
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

    return NextResponse.json({ users: data }, { status: 200 });
  } catch (error) {
    console.error("Unable to process fetch users request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}

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
  if (!body || !body?.name || !body?.email || !body?.createdBy) {
    return NextResponse.json(
      { error: "Missing data in request body" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users`, {
      method: "POST", // Auth0 Permission create:users
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
        password: `${body.name.split(" ").join("")}-${Math.random().toString(36).slice(-8)}`, // Temporary password, will be reset when invited to join
        user_metadata: {
          role: body.role || "AGENT",
          createdBy: body.createdBy,
          created: new Date(),
          invited: false,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          statusText:
            data && data?.message ? data.message : "Failed to create user",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Unable to process create user request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const body = await req.json();
  if (!body || !body?.user_id) {
    return NextResponse.json(
      { error: "Missing data in request body" },
      { status: 400 }
    );
  }

  let updates = {};

  if (body?.invited && body?.invitedOn) {
    updates = {
      invited: body.invited,
      invitedOn: body.invitedOn,
    };
  } else if (body?.accepted && body?.acceptedOn) {
    updates = {
      accepted: body.accepted,
      acceptedOn: body.acceptedOn,
    };
  } else {
    return NextResponse.json(
      { error: "Missing data in request body" },
      { status: 400 }
    );
  }

  try {
    const updateResponse = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${body.user_id}`,
      {
        method: "PATCH", // Auth0 Permission update:users
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_metadata: updates }),
      }
    );
    if (!updateResponse.ok) {
      throw new Error(
        updateResponse?.statusText
          ? updateResponse.statusText
          : "Failed to update user metadata"
      );
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unable to process update user metadata request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}
