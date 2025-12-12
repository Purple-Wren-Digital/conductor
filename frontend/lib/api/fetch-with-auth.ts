/**
 * Utility function to make authenticated fetch requests.
 * Automatically handles getting the Clerk JWT token.
 */

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

/**
 * Hook that provides an authenticated fetch function.
 * Use this instead of direct fetch calls to automatically include the JWT token.
 *
 * @example
 * const fetchWithAuth = useFetchWithAuth();
 * const data = await fetchWithAuth('/api/users/me');
 */
export function useFetchWithAuth() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      // Wait for Clerk to load
      if (!isLoaded) {
        throw new Error("Authentication is still loading");
      }

      // Check if user is signed in
      if (!isSignedIn) {
        throw new Error("User is not signed in");
      }

      const token = await getToken();
      if (!token) {
        // This might happen if the session expired
        throw new Error("Failed to get authentication token");
      }

      // Construct the full URL if it's a relative path
      const fullUrl = url.startsWith("http")
        ? url
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${url}`;

      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
      return fetch(fullUrl, {
        ...options,
        headers,
      });
    },
    [getToken, isLoaded, isSignedIn]
  );
}
