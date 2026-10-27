import type { NextConfig } from "next";

// Static CSP — enforced in production only. Dev is deliberately CSP-free because
// Turbopack/HMR inject inline scripts and styles that a strict policy blocks.
// A static header cannot carry a per-request nonce, so `script-src`/`style-src`
// must allow 'unsafe-inline' here. Route gating lives in src/proxy.ts.
// Origin of the Django API (from NEXT_PUBLIC_API_BASE_URL) so connect-src
// allows exactly that backend instead of a localhost default.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "").origin;
  } catch {
    return "";
  }
})();

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  ["connect-src 'self'", API_ORIGIN, "https://api.jina.ai", "https://api.groq.com"]
    .filter(Boolean)
    .join(" "),
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy", value: PROD_CSP }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
