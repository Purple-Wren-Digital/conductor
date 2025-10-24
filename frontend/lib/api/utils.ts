// Dynamically set API base URL based on environment
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://preview-conductor-ee92.encr.app"
    : "http://localhost:4000");
