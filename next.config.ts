import type { NextConfig } from "next";

/**
 * The browser talks only to this Next.js server: /api and /media are forwarded to the Spring Boot backend.
 * Same origin means the admin session cookie and the CSRF cookie work without CORS.
 * API_URL is read when the app is built (default: the local backend); the Docker image is built with
 * API_URL=http://backend:8080, the backend's address inside docker-compose.prod.yml.
 */
const backend = process.env.API_URL ?? "http://localhost:8080";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // The Docker image runs the minimal standalone server; local builds (also on Windows) stay as they are.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
