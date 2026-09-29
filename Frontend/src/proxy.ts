import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed the `middleware` file convention to `proxy`. This file
// (and the `proxy` export below) is what registers the hook.
// CSP lives in next.config.ts as a static production header — a per-request
// nonce cannot be expressed there, and this proxy is UX-routing only.

// Map: which route prefix requires which role
const ROUTE_ROLE_MAP: Record<string, string> = {
  "/client": "client",
  "/broker": "broker",
  "/loan-processing": "loan_processing",
};

/**
 * UX-only check: decodes the JWT payload's `exp` claim (no signature
 * verification — the backend enforces real auth). Returns true when the access
 * token has expired, covering sessions that die while the tab sits idle.
 */
function isAccessTokenExpired(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp)) return false;
    return exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for JWT access token
  const accessToken = request.cookies.get("jwt-access-token")?.value;

  // ==========================================
  // LOGIN ROUTE
  // ==========================================
  if (pathname === "/login") {
    // Expired token → do NOT bounce back into a protected portal. Allow the
    // login page and mark it so the SessionExpiryModal is shown.
    if (accessToken && isAccessTokenExpired(accessToken)) {
      const loginUrl = new URL(request.url);
      if (!loginUrl.searchParams.has("expired")) {
        loginUrl.searchParams.set("expired", "1");
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    // If already logged in, don't allow access to /login
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

  // Token present but expired → session is dead. Route to the login page with
  // the expired notice so the SessionExpiryModal is shown.
  if (isAccessTokenExpired(accessToken)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(loginUrl);
  }

  // WARNING: user-role cookie is client-controlled and NOT authoritative.
  // Proxy is UX-only; real authorization is enforced server-side (DRF IsAuthenticated + role checks).
  // We keep the redirect for UX but do NOT treat the cookie as a security boundary.
  const userRole = request.cookies.get("user-role")?.value;

  if (!userRole) {
    // Logged in but role unknown → let backend gate the request; show login for UX
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requiredRole = ROUTE_ROLE_MAP[matchedRoute];

  // Wrong role → redirect to their own portal (UX hint only)
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

  // Correct role — allow through (backend still enforces RBAC per-request)
  return NextResponse.next();
}

export const config = {
  // Apply auth routing to all document routes (exclude static/assets/api)
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
