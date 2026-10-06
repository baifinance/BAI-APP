import type { NextConfig } from "next";

// Static CSP — enforced in production only. Dev is deliberately CSP-free because
// Turbopack/HMR inject inline scripts and styles that a strict policy blocks.
// A static header cannot carry a per-request nonce, so `script-src`/`style-src`
// must allow 'unsafe-inline' here. Route gating lives in src/proxy.ts.
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' http://localhost:8000 https://api.jina.ai https://api.groq.com ws://localhost:3000 wss://localhost:3000",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
