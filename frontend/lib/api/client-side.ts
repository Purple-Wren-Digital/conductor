import { clientSideEnv } from "@/lib/env/client-side";
import { useUser } from "@clerk/nextjs";
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
      // In development, always use "local" token
      if (process.env.NODE_ENV === "development") {
        return {
          authorization: `Bearer local`,
        };
      }

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Use Clerk user ID as the auth token
      return {
        authorization: `Bearer ${user.id}`,
      };
    },
  });
}
