import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Map: which route prefix requires which role
const ROUTE_ROLE_MAP: Record<string, string> = {
  "/client": "client",
  "/broker": "broker",
  "/loan-processing": "loan_processing",
};

export async function middleware(request: NextRequest) {
  // CSP nonce for this request — used by Server Components via x-nonce header
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const { pathname } = request.nextUrl;

  // Check for JWT access token
  const accessToken = request.cookies.get("jwt-access-token")?.value;

  // Helper: attach CSP + nonce to any response
  // Dev needs 'unsafe-eval' for React/Turbopack and permissive styles for HMR (styleTagTransform injects without nonce)
  const isDev = process.env.NODE_ENV === "development";
  const withCSP = (response: NextResponse) => {
    const scriptSrc = isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`;
    const styleSrc = isDev
      ? `style-src 'self' 'unsafe-inline' https:`
      : `style-src 'self' 'nonce-${nonce}' https:`;
    const csp = [
      "default-src 'self'",
      scriptSrc,
      styleSrc,
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' http://localhost:8000 https://api.jina.ai https://api.groq.com ws://localhost:3000 wss://localhost:3000",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);
    return response;
  };

  // ==========================================
  // LOGIN ROUTE
  // ==========================================
  // If already logged in, don't allow access to /login
  if (pathname === "/login") {
    if (accessToken) {
      const userRole = request.cookies.get("user-role")?.value;

      if (userRole === "client") {
        return withCSP(NextResponse.redirect(new URL("/client", request.url)));
      }

      if (userRole === "broker") {
        return withCSP(NextResponse.redirect(new URL("/broker", request.url)));
      }

      if (userRole === "loan_processing") {
        return withCSP(NextResponse.redirect(new URL("/loan-processing", request.url)));
      }

      // JWT exists but role is unknown
      return withCSP(NextResponse.next({ request: { headers: requestHeaders } }));
    }

    // Not logged in → allow login page
    return withCSP(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // ==========================================
  // PROTECTED ROUTES
  // ==========================================

  // Find the matched protected route
  const matchedRoute = Object.keys(ROUTE_ROLE_MAP).find((route) =>
    pathname.startsWith(route),
  );

  // Not a protected route — let it through (still attach CSP)
  if (!matchedRoute) return withCSP(NextResponse.next({ request: { headers: requestHeaders } }));

  // Check for JWT access token — if missing, not logged in
  if (!accessToken) {
    return withCSP(NextResponse.redirect(new URL("/login", request.url)));
  }

  // WARNING: user-role cookie is client-controlled and NOT authoritative.
  // Middleware is UX-only; real authorization is enforced server-side (DRF IsAuthenticated + role checks).
  // We keep the redirect for UX but do NOT treat the cookie as a security boundary.
  const userRole = request.cookies.get("user-role")?.value;

  if (!userRole) {
    // Logged in but role unknown → let backend gate the request; show login for UX
    return withCSP(NextResponse.redirect(new URL("/login", request.url)));
  }

  const requiredRole = ROUTE_ROLE_MAP[matchedRoute];

  // Wrong role → redirect to their own portal (UX hint only)
  if (userRole !== requiredRole) {
    if (userRole === "client") {
      return withCSP(NextResponse.redirect(new URL("/client", request.url)));
    }

    if (userRole === "broker") {
      return withCSP(NextResponse.redirect(new URL("/broker", request.url)));
    }

    if (userRole === "loan_processing") {
      return withCSP(NextResponse.redirect(new URL("/loan-processing", request.url)));
    }

    return withCSP(NextResponse.redirect(new URL("/login", request.url)));
  }

  // Correct role — allow through (backend still enforces RBAC per-request)
  return withCSP(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  // Apply CSP+auth to all document routes (exclude static/assets/api)
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
