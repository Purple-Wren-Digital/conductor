/**
 * Utility function to make authenticated fetch requests.
 * Automatically handles getting the Clerk JWT token.
 */

import { useAuth } from "@clerk/nextjs";

/**
 * Hook that provides an authenticated fetch function.
 * Use this instead of direct fetch calls to automatically include the JWT token.
 *
 * @example
 * const fetchWithAuth = useFetchWithAuth();
 * const data = await fetchWithAuth('/api/users/me');
 */
export function useFetchWithAuth() {
  const { getToken } = useAuth();

  return async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };
}
