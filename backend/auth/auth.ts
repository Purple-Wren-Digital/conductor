import { Gateway, Header, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { createClerkClient } from "@clerk/backend";

interface AuthParams {
  authorization: Header<"Authorization">;
}

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

const myAuthHandler = authHandler(
  async (params: AuthParams): Promise<AuthData> => {
    const token = params.authorization.replace("Bearer ", "");
    if (!token) {
      throw APIError.unauthenticated("no token provided");
    }

    // Check if CLERK_SECRET_KEY is configured
    if (!process.env.CLERK_SECRET_KEY) {
      console.error("❌ CLERK_SECRET_KEY is not configured");
      throw APIError.unauthenticated("Authentication service not configured");
    }

    // Create Clerk client at runtime (when secrets are available)
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });

    // Development mode: bypass Clerk auth
    if (process.env.NODE_ENV === "development" && token === "local") {
      return {
        userID: "local-dev-user",
        imageUrl: null,
        emailAddress: "local@localhost.com",
      };
    }

    console.log("🔑 Fetching Clerk user:", token);

    // Fetch user data from Clerk API
    try {
      const user = await clerkClient.users.getUser(token);
      const primaryEmail = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);

      console.log("✅ Successfully validated Clerk user:", user.id);

      return {
        userID: user.id,
        imageUrl: user.imageUrl,
        emailAddress: primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || "",
      };
    } catch (error: any) {
      console.error("❌ Failed to fetch Clerk user:", error?.message || error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw APIError.unauthenticated(`Invalid Clerk user ID: ${error?.message || 'Unknown error'}`);
    }
  }
);

export const mygw = new Gateway({ authHandler: myAuthHandler });
