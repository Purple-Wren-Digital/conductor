import { clientSideEnv } from "@/lib/env/client-side";
import { useAuth } from "@clerk/nextjs";
import Client, { Environment, Local, PreviewEnv } from "./encore-client";

// Get the correct encore environment
let environment = Local;
if (clientSideEnv.NEXT_PUBLIC_VERCEL_ENV === "production") {
  environment = Environment("staging");
} else if (clientSideEnv.NEXT_PUBLIC_VERCEL_ENV === "preview") {
  if (!clientSideEnv.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID) {
    throw new Error("NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID is not set");
  }
  environment = PreviewEnv(
    clientSideEnv.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID
  );
}

/**
 * Get an authenticated encore API client.
 *
 * Meant to be used to use on the client side.
 */
export function useApiClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return new Client(environment, {
    auth: async () => {
      if (!isLoaded) {
        throw new Error("Clerk not loaded yet");
      }

      if (!isSignedIn) {
        throw new Error("User not authenticated");
      }

      // Get the Clerk session token (JWT)
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token from Clerk");
      }

      return {
        authorization: `Bearer ${token}`,
      };
    },
  });
}

/**
 * Get an Encore client with a specific auth token.
 * Used for streaming connections and non-hook contexts.
 */
export function getEncoreClient(token: string) {
  return new Client(environment, {
    auth: () => ({
      authorization: `Bearer ${token}`,
    }),
  });
}
