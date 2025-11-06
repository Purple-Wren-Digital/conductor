import { serverSideEnv } from "@/lib/env/server-side";
import { auth } from "@clerk/nextjs/server";
import Client, { Environment, Local, PreviewEnv } from "./encore-client";

// Get the correct encore environment
let environment = Local;
if (serverSideEnv.VERCEL_ENV === "production") {
  environment = Environment("staging");
} else if (serverSideEnv.VERCEL_ENV === "preview") {
  // For PR previews, use the PR-specific environment
  if (serverSideEnv.VERCEL_GIT_PULL_REQUEST_ID) {
    environment = PreviewEnv(serverSideEnv.VERCEL_GIT_PULL_REQUEST_ID);
  } else {
    // For branch previews (no PR), use staging or local
    // You can adjust this based on your needs
    environment = Environment("staging");
  }
}

/**
 * Get an authenticated encore API client.
 *
 * Meant to be used to use on the server side.
 */
export async function getApiClient() {
  return new Client(environment, {
    auth: async () => {
      const { getToken } = await auth();

      // Get the Clerk session token (JWT)
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      return {
        authorization: `Bearer ${token}`,
      };
    },
  });
}
