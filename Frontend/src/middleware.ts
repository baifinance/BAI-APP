import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Map: which route prefix requires which role
const ROUTE_ROLE_MAP: Record<string, string> = {
  "/client": "client",
  "/broker": "broker",
  "/loan-processing": "loan_processing",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for JWT access token
  const accessToken = request.cookies.get("jwt-access-token")?.value;

  // ==========================================
  // LOGIN ROUTE
  // ==========================================
  // If already logged in, don't allow access to /login
  if (pathname === "/login") {
    if (accessToken) {
      const userRole = request.cookies.get("user-role")?.value;

      if (userRole === "client") {
        return NextResponse.redirect(new URL("/client", request.url));
      }

      if (userRole === "broker") {
        return NextResponse.redirect(new URL("/broker", request.url));
      }

      if (userRole === "loan_processing") {
        return NextResponse.redirect(new URL("/loan-processing", request.url));
      }

      // JWT exists but role is unknown
      return NextResponse.next();
    }

    // Not logged in → allow login page
    return NextResponse.next();
  }

  // ==========================================
  // PROTECTED ROUTES
  // ==========================================

  // Find the matched protected route
  const matchedRoute = Object.keys(ROUTE_ROLE_MAP).find((route) =>
    pathname.startsWith(route),
  );

  // Not a protected route — let it through
  if (!matchedRoute) return NextResponse.next();

  // Check for JWT access token — if missing, not logged in
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check the user's role cookie
  const userRole = request.cookies.get("user-role")?.value;

  if (!userRole) {
    // Logged in but role unknown → redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requiredRole = ROUTE_ROLE_MAP[matchedRoute];

  // Wrong role → redirect to their own portal
  if (userRole !== requiredRole) {
    if (userRole === "client") {
      return NextResponse.redirect(new URL("/client", request.url));
    }

    if (userRole === "broker") {
      return NextResponse.redirect(new URL("/broker", request.url));
    }

    if (userRole === "loan_processing") {
      return NextResponse.redirect(new URL("/loan-processing", request.url));
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Correct role — allow through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/client/:path*",
    "/broker/:path*",
    "/loan-processing/:path*",
  ],
};
