import { NextResponse } from "next/server";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
// GET + SEARCH USERS
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  console.log("SEARCH PARAMS", searchParams);

  const perPage = searchParams.get("itemsPerPage") || "10";
  const currentPage = searchParams.get("currentPage") || "0";

  const sortByRequest = searchParams.get("sortDir");
  const sortByParams =
    sortByRequest == "updated_at" ? "updated_at" : "created_at";

  const orderDirectionRequest = searchParams.get("sortDir");
  const orderDirectionParams = orderDirectionRequest === "asc" ? 1 : -1;

  const invitationStatusRequest = searchParams.get("invitationStatus");
  let userMetaDataParams = "";
  if (invitationStatusRequest === "Accepted") {
    userMetaDataParams = "user_metadata.accepted:true";
  }
  if (invitationStatusRequest === "Unaccepted") {
    userMetaDataParams =
      "user_metadata.invited:true&user_metadata.accepted:false";
  }
  if (invitationStatusRequest === "Unsent") {
    userMetaDataParams =
      "user_metadata.invited:false&user_metadata.accepted:false";
  }

  // https://auth0.com/docs/manage-users/user-search
  const params = new URLSearchParams({
    search_engine: "v3",
    page: currentPage,
    per_page: perPage, // TODO: Pagination
    include_totals: "true",
    sort: `${sortByParams}:${orderDirectionParams}`,
    q: userMetaDataParams,
  });

  console.log("PARAMS", params);

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

    console.log("RESPONSE", response);

    if (!response.ok) {
      throw new Error(
        response?.statusText ? response.statusText : "Failed to fetch users"
      );
    }

    const data = await response.json();

    console.log("DATA", data);

    return NextResponse.json(
      {
        length: data.length,
        limit: data.limit,
        start: data.start,
        total: data.total,
        users: data.users,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unable to process fetch users request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}
// CREATE USER
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
          marketCenterId: body?.marketCenterId || null,
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
// UPDATE USER
export async function PATCH(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!authHeader || !authHeader.startsWith("Bearer ") || !token) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const requestBody = await req.json();
  if (!requestBody || !requestBody?.user_id) {
    return NextResponse.json(
      { error: "Missing data in request body" },
      { status: 400 }
    );
  }

  let updates: any = {};

  if (requestBody?.name) {
    updates.name = requestBody.name;
  } else if (requestBody?.email) {
    updates = { email: requestBody?.email };
  } else if (requestBody?.invited && requestBody?.invitedOn) {
    updates.user_metadata = {
      invited: requestBody.invited,
      invitedOn: requestBody.invitedOn,
    };
  } else if (requestBody?.accepted && requestBody?.acceptedOn) {
    updates.user_metadata = {
      accepted: requestBody.accepted,
      acceptedOn: requestBody.acceptedOn,
    };
  } else {
    return NextResponse.json(
      { error: "Nothing to update from request body" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${requestBody.user_id}`,
      {
        method: "PATCH", // Auth0 Permissions = update:users, update:users_app_metadata, update:current_user_metadata
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          connection: "Username-Password-Authentication",
          updates,
        }),
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unable to process update user metadata request:", error);
    return NextResponse.json({ statusText: error }, { status: 500 });
  }
}
