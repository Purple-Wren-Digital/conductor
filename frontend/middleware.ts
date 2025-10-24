import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const publicRoutes = ["/", "/pricing", "/company"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always run Auth0 middleware first
  const authRes = await auth0.middleware(request);

  // Don't protect auth routes (let Auth0 handle them)
  if (pathname.startsWith("/auth")) {
    return authRes;
  }

  // Don't protect public routes
  if (publicRoutes.includes(pathname)) {
    return authRes;
  }

  // For protected routes, check if user is authenticated
  const session = await auth0.getSession(request);

  if (!session) {
    // Redirect to login
    return NextResponse.redirect(
      new URL("/auth/login", request.nextUrl.origin)
    );
  }

  // Return the auth middleware response to preserve session updates
  return authRes;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
	],
};
