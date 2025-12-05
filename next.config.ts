import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable additional React checks in development
  reactStrictMode: true,
  // Do not leak "X-Powered-By: Next.js" in responses for a slightly smaller
  // fingerprint surface in production
  poweredByHeader: false,

  // Allow Playwright (127.0.0.1) to talk to the dev server without warnings
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
