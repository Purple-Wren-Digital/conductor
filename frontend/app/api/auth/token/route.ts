import { auth0 } from "@/lib/auth0";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Return user sub as temporary token until v4 getAccessToken is fixed
    return NextResponse.json({ accessToken: session.user.sub });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: "Unable to get session" },
      { status: 500 }
    );
  }
}
