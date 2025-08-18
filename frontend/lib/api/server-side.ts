import { serverSideEnv } from "@/lib/env/server-side";
import { auth0 } from "@/lib/auth0";
import Client, { Environment, Local, PreviewEnv } from "./encore-client";

// Get the correct encore environment
let environment = Local;
if (serverSideEnv.VERCEL_ENV === "production") {
  environment = Environment("staging");
} else if (serverSideEnv.VERCEL_ENV === "preview") {
  if (!serverSideEnv.VERCEL_GIT_PULL_REQUEST_ID) {
    throw new Error(" is not set");
  }
  environment = PreviewEnv(serverSideEnv.VERCEL_GIT_PULL_REQUEST_ID);
}

/**
 * Get an authenticated encore API client.
 *
 * Meant to be used to use on the server side.
 */
export async function getApiClient() {
  return new Client(environment, {
    auth: async () => {
      // In development, always use "local" token
      if (process.env.NODE_ENV === "development") {
        return {
          authorization: `Bearer local`,
        };
      }

      const session = await auth0.getSession();
      if (!session?.tokenSet?.accessToken) {
        throw new Error("User not authenticated or access token not available");
      }

      return {
        authorization: `Bearer ${session.tokenSet.accessToken}`,
      };
    },
  });
}
