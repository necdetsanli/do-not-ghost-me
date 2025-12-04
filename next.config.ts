import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable additional React checks in development
  reactStrictMode: true,
  // Do not leak "X-Powered-By: Next.js" in responses for a slightly smaller
  // fingerprint surface in production
  poweredByHeader: false,
};

export default nextConfig;
