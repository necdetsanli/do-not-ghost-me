// next.config.mjs
// Next.js root config: React strict mode, basic hardening, and security headers.

import {} from /** @type {NextConfig} */ "next";

/**
 * Build a conservative Content-Security-Policy for production.
 *
 * Notable choices:
 * - No external scripts/styles/fonts by default.
 * - Inline styles are allowed because the UI uses a lot of `style={{ ... }}`.
 * - No iframing: `frame-ancestors 'none'`.
 * - Forms can only post back to this origin: `form-action 'self'`.
 */
function buildCspHeaderValue() {
  const directives = [
    "default-src 'self'",
    // We do not allow inline/eval scripts here. If you ever introduce 3rd party
    // scripts or inline scripts, this will need to be revisited.
    "script-src 'self'",
    // Allow inline styles because the UI uses inline `style` props.
    "style-src 'self' 'unsafe-inline'",
    // Allow images from this origin and data: URLs (e.g. icons, placeholders).
    "img-src 'self' data:",
    // API / fetch / websockets endpoints. For now we only talk to our own origin.
    "connect-src 'self'",
    // Fonts from self and data: URLs.
    "font-src 'self' data:",
    // Disallow embedding this site in <iframe> or similar.
    "frame-ancestors 'none'",
    // Forms can only submit back to this origin.
    "form-action 'self'",
    // Prevent attackers from changing base URL for relative URLs.
    "base-uri 'self'",
  ];

  return directives.join("; ");
}

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = (() => {
  /** @type {{ key: string; value: string }[]} */
  const headers = [
    // Basic MIME-type sniffing protection.
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    // Clickjacking protection (also duplicated via CSP frame-ancestors).
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    // Don’t send full path as referrer to other origins.
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    // Lock down powerful browser APIs we don’t use.
    // You can relax these later if you actually need e.g. geolocation.
    {
      key: "Permissions-Policy",
      value: "geolocation=(), microphone=(), camera=(), interest-cohort=()",
    },
  ];

  if (isProd) {
    // Only enable HSTS and CSP in production. Using this on HTTP / localhost is not desirable.
    headers.push(
      {
        key: "Strict-Transport-Security",
        // 2 years, include subdomains, and opt-in for preload lists.
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: buildCspHeaderValue(),
      },
    );
  }

  return headers;
})();

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Enable additional React checks in development
  reactStrictMode: true,

  // Do not leak "X-Powered-By: Next.js" in responses for a slightly smaller
  // fingerprint surface in production
  poweredByHeader: false,

  // Allow Playwright (127.0.0.1) to talk to the dev server without warnings
  allowedDevOrigins: ["http://127.0.0.1:3000"],

  /**
   * Global HTTP headers for all routes.
   *
   * We attach our security headers to every path of the app. Next.js merges
   * these with its own internal headers.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
