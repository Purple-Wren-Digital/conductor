import { auth0 } from "@/lib/auth0";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Local development mode - check for dev token override
    if (
      process.env.NODE_ENV === "development" &&
      process.env.LOCAL_DEV_AUTH_BYPASS === "true"
    ) {
      const { searchParams } = new URL(request.url);
      const devUser = searchParams.get("user");
      const devEmail = searchParams.get("email");

      // Generate custom dev token
      if (devUser || devEmail) {
        const token = `dev:${devUser || "dev-user-123"}:${devEmail || "dev@localhost.com"}`;
        console.log("🔧 Generated local dev token:", token);
        return NextResponse.json({ accessToken: token });
      }

      // Default dev token
      console.log("🔧 Using default local dev token");
      return NextResponse.json({
        accessToken: "dev:dev-user-123:dev@localhost.com",
      });
    }

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
