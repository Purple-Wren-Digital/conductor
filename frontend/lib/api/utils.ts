// Dynamically set API base URL based on environment
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Fetch with a timeout. Aborts if the request takes longer than `ms`.
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}
