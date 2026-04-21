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

// Evict expired entries every 10 minutes to prevent unbounded growth
const cacheCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache) {
    if (value.expiry <= now) {
      userCache.delete(key);
    }
  }
}, 10 * 60 * 1000);
cacheCleanup.unref();

export const myAuthHandler = authHandler(
  async (params: AuthParams): Promise<AuthData> => {
    // Enhanced logging to debug JWT issues
    // console.log("🔍 Auth Handler - Raw Authorization header:", params.authorization);

    const token = params.authorization.replace("Bearer ", "");
    if (!token) {
      throw APIError.unauthenticated("no token provided");
    }

    // Check if token looks like a JWT (has 3 parts separated by dots)
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      throw APIError.unauthenticated("invalid token format");
    }

    // Verify JWT locally (no external API call)
    try {
      console.log("[auth] verifyToken start");
      const payload = await verifyToken(token, {
        secretKey: CLERK_SECRET_KEY(),
      });
      console.log("[auth] verifyToken done");

      const userId = payload.sub;
      if (!userId) {
        throw APIError.unauthenticated("Invalid token: no user ID");
      }

      // Check cache first
      const cached = userCache.get(userId);
      if (cached && cached.expiry > Date.now()) {
        console.log("[auth] cache hit");
        return cached.data;
      }

      // Cache miss or expired - fetch from Clerk API
      console.log("[auth] cache miss, calling Clerk API");
      const clerkTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Clerk API timeout")), 5000)
      );
      const user = await Promise.race([
        clerkClient.users.getUser(userId),
        clerkTimeout,
      ]);
      console.log("[auth] Clerk API done");
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

      return authData;
    } catch (error: any) {
      throw APIError.unauthenticated(
        `Invalid Clerk token: ${error?.message || "Unknown error"}`
      );
    }
  }
);

export const mygw = new Gateway({ authHandler: myAuthHandler });
