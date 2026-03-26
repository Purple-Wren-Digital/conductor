import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const CLERK_FAPI = "https://frontend-api.clerk.dev";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/company",
  "/pricing",
  "/dashboard(.*)",
]);

async function clerkProxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/__clerk", "");
  const search = req.nextUrl.search;
  const url = `${CLERK_FAPI}${path}${search}`;

  const headers = new Headers(req.headers);
  headers.set("Clerk-Proxy-Url", `${req.nextUrl.origin}/__clerk`);
  headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY!);
  headers.set("X-Forwarded-For", req.headers.get("x-forwarded-for") || "127.0.0.1");
  headers.delete("host");

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

const clerkAuth = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const authObject = await auth();

    if (!authObject.userId) {
      await auth.protect();
    }
  }
});

export default function middleware(req: NextRequest, event: any) {
  if (req.nextUrl.pathname.startsWith("/__clerk")) {
    return clerkProxy(req);
  }
  return clerkAuth(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};
