// next.config.ts
// Next.js root config: React strict mode, basic hardening, and security headers.

/**
 * @typedef {import("next").NextConfig} NextConfig
 */

/**
 * Build the Content-Security-Policy header value for production responses.
 *
 * This CSP is intentionally strict while remaining compatible with:
 * - Next.js App Router (which still relies on some inline scripts unless you
 *   implement a nonce-based strict-dynamic CSP in middleware),
 * - Radix UI / shadcn primitives (which render a few inline styles for
 *   accessibility helpers such as visually hidden native <select> elements).
 *
 * IMPORTANT:
 * - If you ever introduce third-party scripts (analytics, widgets, etc.),
 *   you MUST extend `script-src` / `connect-src` / `img-src` accordingly.
 * - For a stricter CSP, the next step would be to implement a per-request
 *   nonce + `script-src 'strict-dynamic'` in middleware. That is outside the
 *   scope of this static config file.
 *
 * @returns {string} Serialized CSP directives joined by "; ".
 */
function buildCspHeaderValue() {
  /** @type {string[]} */
  const directives = [
    // Default policy: only this origin.
    "default-src 'self'",

    // Next.js App Router currently relies on some inline scripts. Without a
    // nonce-based strict-dynamic setup in middleware, we must allow
    // 'unsafe-inline' here. Do NOT add 'unsafe-eval' in production.
    "script-src 'self' 'unsafe-inline' https://vercel.live",

    // All styles are served from this origin. UI libraries still inject small
    // inline styles (e.g. visually hidden native elements), so we keep
    // 'unsafe-inline' for now. Remove only after verifying there are absolutely
    // no inline style attributes or inline <style> blocks at runtime.
    "style-src 'self' 'unsafe-inline'",

    // Disallow legacy plugin content.
    "object-src 'none'",

    // Images are served from this origin or from data: URLs (icons, placeholders).
    "img-src 'self' data:",

    // XHR / fetch / WebSocket endpoints. At the moment we only talk to our own origin.
    "connect-src 'self' https://vercel.live",

    // Web fonts from this origin and data: URLs.
    "font-src 'self' data:",

    // Do not allow this app to be embedded in iframes.
    "frame-ancestors 'none'",
    "frame-src 'none'",

    // Forms can only POST/GET back to this origin.
    "form-action 'self'",

    // Prevent attackers from changing the base URL for relative URLs.
    "base-uri 'self'",

    // Additional tightening for less common resource types.
    "media-src 'self'",
    "manifest-src 'self'",

    // Allow workers started from our own origin and Blob URLs (used by some tooling).
    "worker-src 'self' blob:",
  ];

  return directives.join("; ");
}

const isProd = process.env.NODE_ENV === "production";
const isE2ECoverage = process.env.PW_COLLECT_V8_COVERAGE === "1";

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
    // Do not send full path as referrer to other origins.
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    // Lock down powerful browser APIs we do not use.
    // Relax these only if you actually need e.g. geolocation.
    {
      key: "Permissions-Policy",
      value: "geolocation=(), microphone=(), camera=(), interest-cohort=()",
    },
    // Prevent cross-origin popups from accessing window.opener.
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    // Prevent resources from being loaded cross-origin (Spectre mitigation).
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    // Request browser to isolate this origin in its own process.
    {
      key: "Origin-Agent-Cluster",
      value: "?1",
    },
    // Disable DNS prefetching for privacy.
    {
      key: "X-DNS-Prefetch-Control",
      value: "off",
    },
  ];

  if (isProd) {
    // Only enable HSTS and CSP in production. Setting this on HTTP / localhost
    // is not desirable.
    headers.push(
      {
        key: "Strict-Transport-Security",
        // 1 years, include subdomains, and opt-in for browser preload lists.
        value: "max-age=31536000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: buildCspHeaderValue(),
      },
    );
  }

  return headers;
})();

/**
 * Root Next.js configuration.
 *
 * @type {NextConfig & { allowedDevOrigins?: string[] }}
 */
const nextConfig = {
  // Enable additional React checks in development.
  reactStrictMode: true,

  // Do not leak "X-Powered-By: Next.js" in responses for a slightly smaller
  // fingerprint surface in production.
  poweredByHeader: false,

  // Enable production browser sourcemaps only when running E2E coverage.
  // Rationale: sourcemaps in production can expose source code.
  productionBrowserSourceMaps: isE2ECoverage === true,

  // Allow Playwright (127.0.0.1) to talk to the dev server without warnings.
  // This is only honored by the development server.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

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
