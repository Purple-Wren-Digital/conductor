import { NextRequest, NextResponse } from "next/server";

const CLERK_FAPI = "https://frontend-api.clerk.dev";

async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/__clerk", "");
  const search = req.nextUrl.search;
  const url = `${CLERK_FAPI}${path}${search}`;

  const headers = new Headers(req.headers);
  headers.set("Clerk-Proxy-Url", `${req.nextUrl.origin}/api/__clerk`);
  headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY!);
  headers.set("X-Forwarded-For", req.headers.get("x-forwarded-for") || "127.0.0.1");

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : undefined,
  });

  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete("content-encoding");

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
