import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "clinomatic_session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/webhooks",
  "/api/trpc",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow all other API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for session cookie — lightweight check, no DB call in edge
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
