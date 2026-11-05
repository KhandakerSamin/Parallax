import type { NextConfig } from "next";

/** Where the FastAPI backend listens. Server-side only; the browser never sees it. */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The browser calls /api/v1/* on this origin and Next.js forwards it to the backend.
  // The session cookie therefore belongs to the frontend's domain, where proxy.ts can see it.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  turbopack: {
    // Tailwind CSS v4 runs as a Turbopack loader on every stylesheet.
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
