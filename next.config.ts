import type { NextConfig } from "next";

// Next.js dev HMR (React Fast Refresh) uses eval() and connects back via a
// WebSocket. Only allow those outside prod.
const IS_DEV = process.env.NODE_ENV !== "production";
const SCRIPT_SRC = IS_DEV
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
const CONNECT_SRC = IS_DEV
  ? "connect-src 'self' ws: wss:"
  : "connect-src 'self'";

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "style-src 'self' 'unsafe-inline'",
  SCRIPT_SRC,
  CONNECT_SRC,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

// PHI-bearing SSR HTML routes: stop CDNs and shared proxies from caching
// rendered HTML that varies by auth cookie. API responses already set these
// per-response.
const PHI_NO_STORE = [
  { key: "Cache-Control", value: "no-store, private" },
  { key: "Vary", value: "Cookie" },
];

const nextConfig: NextConfig = {
  // Netlify's pnpm install doesn't always expose eslint-config-next's flat-config
  // submodules correctly. We still run `pnpm lint` locally — skip during build.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      { source: "/", headers: PHI_NO_STORE },
      { source: "/patients/:path*", headers: PHI_NO_STORE },
      { source: "/settings/:path*", headers: PHI_NO_STORE },
    ];
  },
};

export default nextConfig;
