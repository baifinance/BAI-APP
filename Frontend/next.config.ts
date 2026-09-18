import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
          // CSP disabled for dev: Next.js Turbopack injects inline scripts/hashes that 'self' blocks.
          // Re-enable nonce-based CSP in production via middleware (see references/secure-patterns/csp-hsts-headers.md).
          // For now, no Content-Security-Policy header is set to unblock HMR/React hydration.
          // To test with CSP: add "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:8000 https://api.jina.ai https://api.groq.com ws://localhost:3000"
        ],
      },
    ];
  },
};

export default nextConfig;
