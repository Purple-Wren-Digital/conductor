import { Gateway, Header, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { createClerkClient, verifyToken } from "@clerk/backend";

const CLERK_SECRET_KEY = secret("CLERK_SECRET_KEY");

// Create Clerk client once at module level (reused for all requests)
const clerkClient = createClerkClient({
  secretKey: CLERK_SECRET_KEY(),
});

interface AuthParams {
  authorization: Header<"Authorization">;
}

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

// Simple in-memory cache for user data
// Key: userId, Value: { data: AuthData, expiry: timestamp }
const userCache = new Map<string, { data: AuthData; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const myAuthHandler = authHandler(
  async (params: AuthParams): Promise<AuthData> => {
    const token = params.authorization.replace("Bearer ", "");
    if (!token) {
      throw APIError.unauthenticated("no token provided");
    }

    // Verify JWT locally (no external API call)
    try {
      const payload = await verifyToken(token, {
        secretKey: CLERK_SECRET_KEY(),
      });

      const userId = payload.sub;
      if (!userId) {
        throw APIError.unauthenticated("Invalid token: no user ID");
      }

      // Check cache first
      const cached = userCache.get(userId);
      if (cached && cached.expiry > Date.now()) {
        console.log("✅ Using cached Clerk user:", userId);
        return cached.data;
      }

      // Cache miss or expired - fetch from Clerk API
      console.log("🔑 Fetching fresh Clerk user data:", userId);

      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId
      );

      const authData: AuthData = {
        userID: user.id,
        imageUrl: user.imageUrl,
        emailAddress:
          primaryEmail?.emailAddress ||
          user.emailAddresses[0]?.emailAddress ||
          "",
      };

      // Cache the result
      userCache.set(userId, {
        data: authData,
        expiry: Date.now() + CACHE_TTL,
      });

      console.log("✅ Successfully validated and cached Clerk user:", user.id);
      return authData;

    } catch (error: any) {
      console.error("❌ Failed to verify Clerk token:", error?.message || error);
      throw APIError.unauthenticated(
        `Invalid Clerk token: ${error?.message || "Unknown error"}`
      );
    }
  }
);

export const mygw = new Gateway({ authHandler: myAuthHandler });
