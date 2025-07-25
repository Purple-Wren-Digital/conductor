import { clientSideEnv } from "@/lib/env/client-side";
import { useUser } from "@auth0/nextjs-auth0";
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
  const { user } = useUser();

  return new Client(environment, {
    auth: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get Auth0 access token from our API route
      const tokenResponse = await fetch("/api/auth/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get access token");
      }
      
      const { accessToken } = await tokenResponse.json();
      return {
        authorization: `Bearer ${accessToken}`,
      };
    },
  });
}
