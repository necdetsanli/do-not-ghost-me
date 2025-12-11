# Changelog

All notable changes to **Do Not Ghost Me** will be documented in this file.

This project follows **Semantic Versioning** (`MAJOR.MINOR.PATCH`).

---

## [Unreleased]

- Planned / in progress changes will be tracked here after `1.0.0`.

---

## [1.0.2] – 2025-12-11

Rename the ghosting leaderboard route and UI copy to use neutral, non-positive wording.

---

### Changed

- Renamed the `/top-companies` route to `/companies` to avoid implying that highly reported companies are being endorsed.
- Updated navigation and home hero CTA links to point to `/companies` and use neutral labels such as “Companies” instead of “Top companies”.
- Refined inline copy around the companies leaderboard to clarify that companies are ordered by the number of ghosting reports, not by quality or endorsement.
- Updated internal UI text (including report form and related components) to consistently refer to the page as the “Companies” view rather than “Top companies”.
- Bumped the application version metadata (package.json) to align with the `1.0.2` release.

---

## [1.0.1] – 2025-12-11

Minor security, observability and metadata polish on top of the initial release.

---

### Added

- **Vercel Speed Insights integration**
  - Installed the official `@vercel/speed-insights` package.
  - Rendered `<SpeedInsights />` in the root layout to collect real-user performance telemetry in production.

- **Security and SEO metadata files**
  - Added a `security.txt` file under `/.well-known/security.txt` to publish a clear security contact and responsible disclosure policy.
  - Added a `robots.txt` file that:
    - Allows indexing of public pages (home, top companies, about).
    - Disallows crawling of admin and API endpoints for better privacy and reduced attack surface.
  - Added a dedicated `favicon.ico` for browser tabs, bookmarks and link previews.
  - Introduced `THIRD_PARTY_LICENSES.md` and a `licenses/` directory to track third-party icon licensing (Apache-2.0 attribution).

---

### Changed

- **Transport security hardening**
  - Updated `next.config.ts` to enable HTTP Strict Transport Security (HSTS) with a `max-age` of 1 year in production responses, alongside existing security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy).

---

### Security

- Improved transparency for security researchers via `/.well-known/security.txt`, clarifying how to report vulnerabilities and which languages are accepted.
- Reduced the chance of sensitive or internal endpoints being indexed by search engines by explicitly disallowing `/admin` and `/api` paths in `robots.txt`.

---

## [1.0.0] – 2025-12-10

Initial public release of **Do Not Ghost Me**.

This release delivers the first complete, production-oriented version of the platform: anonymous report collection, aggregated stats, and an admin moderation dashboard, built with strong privacy and security guarantees.

---

### Added – Core product

- **Anonymous ghosting report submission**
  - Public report form on `/` with:
    - Company name
    - Interview stage (enum)
    - Job level / seniority (enum)
    - Position category (enum)
    - Free-text position detail
    - Optional “days without reply”
    - Country selection based on a `CountryCode` enum
  - All fields wired to a validated API endpoint (`POST /api/reports`) using a strict Zod schema.
  - Client-side UX:
    - Inline error messages surfaced from server validation.
    - Clear success/error alerts.
    - Honeypot field for bot detection (hidden from real users).

- **Type-ahead country picker**
  - `CountrySelect` component backed by `CountryCode` enums.
  - Type-ahead filtering by country name, with:
    - Keyboard navigation (↑/↓) to move between options.
    - `Enter` to select, `Esc` to close.
    - ARIA attributes for accessibility (combobox/listbox roles).
  - Hidden `<input>` that carries the actual enum value for HTML form submissions.

- **Home page hero & stats**
  - `HomeHero` section:
    - Clear explanation of the project’s purpose.
    - Primary CTA to submit a report.
    - Secondary CTA to view top companies.
    - Copy emphasizing anonymity and privacy-friendly data handling.
  - `HomeStatsPanel`:
    - Fetches aggregate stats from `/api/reports/stats`.
    - Shows:
      - Total number of reports.
      - “Most reported company” with count (when data is available).
    - Robust runtime validation of the API response shape.

- **Top companies / ghosting leaderboard**
  - `/top-companies` route:
    - Ranks companies by number of **active** ghosting reports.
    - Groups by `(companyId, country)` with pagination and filters.
  - Filters (parsed and sanitized via `parseFilters`):
    - Free-text search by company name.
    - Country filter (using `CountryCode`).
    - Position category filter.
    - Seniority (job level) filter.
    - Interview stage filter.
  - Pagination:
    - Page size: 50 rows per page.
    - Maximum page cap to avoid abuse / huge offsets.
    - `buildPageUrl` helper preserves existing filters while changing pages.
  - Presentation:
    - `TopCompaniesFilterForm` for filters.
    - `TopCompaniesActiveFilters` to show active filter “chips”.
    - `TopCompaniesResultSummary` for human-readable summary / empty state.
    - `TopCompaniesTable` for the main leaderboard.
    - `TopCompaniesPagination` for previous/next navigation.

- **About page**
  - `/about` route composed of multiple sections:
    - **Intro**: what the project is and why ghosting matters.
    - **The problem & how this helps**:
      - Cards describing the emotional and practical impact of ghosting.
      - Explanation of how aggregated stats can help candidates.
    - **Privacy & data**:
      - Strong emphasis on not collecting personal data of reporters.
      - Guidance to avoid naming individuals or sharing sensitive information.
      - Clear statement that interest is in systemic patterns, not doxxing.
    - **How to contribute**:
      - High-level contribution guidance.
      - GitHub CTA button linking to the repository.
    - Back link to return to the home page.

---

### Added – Admin dashboard & moderation

- **Admin authentication**
  - Password-based admin login at `/admin/login`:
    - Server component that generates a CSRF token with `createCsrfToken("admin-login")`.
    - Minimal form: password field only, posted to `/api/admin/login`.
  - Signed session token:
    - `ADMIN_SESSION_COOKIE_NAME` HttpOnly cookie.
    - `verifyAdminSessionToken` used on the server to protect `/admin`.
  - Host allowlist:
    - `ADMIN_ALLOWED_HOST` environment variable.
    - `/admin` checks the incoming `host` header and redirects to `/` if it does not match.

- **Admin reports dashboard**
  - `/admin` server route:
    - Validates host and admin session before rendering.
    - Uses `fetchAdminReports` to load the latest reports.
    - Renders either:
      - `AdminEmptyState` when there are no reports.
      - `AdminReportsTable` when data is available.
  - `AdminReportsTable`:
    - Compact table including:
      - Created timestamp (UTC).
      - Company name.
      - Country.
      - Stage, job level, position category.
      - Position detail.
      - Days without reply.
      - Moderation status (Active / Flagged / Deleted).
    - Visual status cues:
      - Row highlighting for flagged and deleted reports.
      - Status badge with consistent styling.
      - Inline display of `flaggedReason` when present.
    - Actions (implemented via simple HTML forms, no JS required):
      - **Flag** a report.
      - **Restore** a flagged or soft-deleted report.
      - **Soft delete** (remove from public stats, keep for audit).
      - **Hard delete** (permanently remove, only after soft delete).
  - Admin header:
    - `AdminHeader` component with title, description and logout button.

- **Admin logout flow**
  - `/admin/logout` client page:
    - On mount, POSTs to `/api/admin/logout` to clear the admin session cookie.
    - Always redirects back to the public home page.
  - `/api/admin/logout`:
    - API-only route that:
      - Invalidates the admin session cookie.
      - Returns a simple success response for the client.

---

### Added – Domain model & data layer

- **Normalized company model**
  - `Company` model:
    - Stores canonical `name` and a `normalizedName` (for deduplication).
    - Stores the company’s `country` (moved from the report).
  - `Report` model:
    - Associated with `companyId` only (no country duplication).
    - Fields:
      - `stage`, `jobLevel`, `positionCategory`.
      - `positionDetail`.
      - Optional `daysWithoutReply`.
      - Moderation fields:
        - `status` (`ACTIVE`, `FLAGGED`, `DELETED`).
        - `flaggedAt`, `flaggedReason`, `deletedAt`.

- **Aggregation & analytics**
  - `getCompaniesPage(filters)`:
    - Groups reports by `companyId`.
    - Counts reports per company.
    - Applies filters on report fields and `company` relation.
    - Sorts companies by descending report count.
    - Computes `totalPages` and `totalCompanies` for pagination.
  - Home stats:
    - Total number of reports.
    - Most reported company (if any), with count.

---

### Added – Security & privacy

- **IP handling and rate limiting**
  - Dedicated rate limit logic for report submissions:
    - Ensures that:
      - A single IP cannot flood the system with reports.
      - A single IP cannot spam the same company and position combination.
    - Uses a domain-specific `ReportRateLimitError` with:
      - Machine-readable reason.
      - HTTP status code.
      - User-facing message.
  - IP requirements:
    - Requests without a usable IP (missing / empty / `"unknown"`) are rejected with a friendly rate-limit-style message.
    - IP string is normalized before being used in rate limit checks.
  - Privacy-friendly design:
    - The application relies on **salted hashes of IP addresses** for rate limiting instead of storing raw IPs in persistent data.
    - Raw IP values are not stored in the main data model.

- **Validation & honeypot handling**
  - `reportSchema` (Zod) for strict validation of report payloads.
  - `isHoneypotOnlyValidationError`:
    - Detects when validation fails _only_ because the honeypot field is filled.
    - Treats those submissions as bot traffic and silently returns HTTP 200 without writing any data.
  - Structured validation error responses:
    - HTTP 400 with `error` message and Zod `flatten()` output for field-level errors.

- **CSRF & admin hardening**
  - CSRF tokens for admin login:
    - Every login form includes a signed token that is validated on the server.
  - Admin-only routes:
    - Host allowlist for `/admin`.
    - Session token verification for each admin request.

- **Robust logging**
  - Centralized logging helpers:
    - `logInfo`, `logWarn`, `logError` used across API routes.
  - `formatUnknownError`:
    - Safely converts unknown error values into a string for logging.
    - Defensive against weird thrown values and serialization issues.

---

### Added – UI system & components

- **Design system**
  - Built on top of:
    - Next.js App Router.
    - React server + client components.
    - Tailwind CSS.
    - Radix UI primitives.
    - `lucide-react` icons.
  - Core reusable components:
    - `Button`:
      - Variants: `primary`, `secondary`, `outline`, `ghost`.
      - Sizes: `sm`, `md`, `lg`.
      - Accessible focus states and disabled styling.
    - `Card`:
      - Padded, rounded containers with consistent border and background.
    - `Input`:
      - Label, description, error helper text.
      - `isRequired` handling and ARIA wiring.
    - `Select`:
      - Wrapper around Radix `Select` primitives.
      - Label/description/error, required logic, and optional hidden input for forms.
    - `Label`:
      - Adds optional required asterisk while deferring to the base `ui/label`.
    - `StatsCard`:
      - Simple stat block used on the home page for total reports, etc.
    - `Alert`:
      - App-level wrapper for success/error inline alerts with optional close button.
    - `Navigation`:
      - Top navigation bar:
        - Links: Home, Top companies, About.
        - “Submit report” button.
        - Active route highlighting.
    - `NavigationMenu`:
      - Wrapper around Radix navigation menu components with consistent styling.
    - `ThemeToggle`:
      - Light / Dark / System toggle using `next-themes`.
      - Three-button segmented control with ARIA attributes.
    - `GithubCta`:
      - Reusable button linking to the public repository.
    - `ImageWithFallback`:
      - `next/image` wrapper that swaps to an inline SVG placeholder on load failure.

- **Theming**
  - `ThemeProvider` using `next-themes`:
    - `light`, `dark`, `system` modes.
    - `attribute="class"` for Tailwind `.dark` integration.
    - `disableTransitionOnChange` to avoid jarring theme toggles.
  - Theme toggle fully client-side and loaded via `dynamic` import to avoid hydration issues.

---

### Added – Tooling, DX & documentation

- **Development container & scripts**
  - Devcontainer-based setup for consistent local environments.
  - `scripts/dev/setup-db.sh`:
    - Starts PostgreSQL inside the dev container.
    - Ensures local dev user/database exist.
    - Applies Prisma migrations (`prisma migrate deploy`).
    - Refuses to run unless `NODE_ENV=development`.
  - `scripts/dev/seed-dummy-reports.js`:
    - Development-only seed script that:
      - Clears companies and reports (destructive).
      - Inserts hundreds of companies with a wide distribution of reports.
      - Stresses `/top-companies` aggregation and ranking logic.
    - Refuses to run unless `NODE_ENV=development`.

- **NPM scripts**
  - Core app lifecycle:
    - `dev` – `next dev`
    - `build` – `next build`
    - `start` – `next start`
  - Linting & formatting:
    - `lint` – `eslint .`
    - `lint:fix` – `eslint . --fix`
    - `format` – `prettier --write .`
    - `format:check` – `prettier --check .`
  - Type checking:
    - `check` – `tsc --noEmit`
  - Testing:
    - `test` – unit + integration tests via **Vitest**.
    - `test:watch` – Vitest in watch mode.
    - `test:coverage` – coverage via Vitest.
    - `test:ci` – CI-friendly Vitest run (e.g. `--runInBand`).
    - `test:e2e` – E2E tests via **Playwright**.
  - CI-style verification:
    - `verify` – local “everything” pipeline:
      - `lint` + `check` + `test` + `test:e2e`
    - `verify:ci` – CI variant:
      - `lint` + `check` + `test:ci` + `test:e2e`
  - Prisma & data:
    - `postinstall` – `prisma generate`
    - `prisma:generate` – `prisma generate`
    - `prisma:migrate` – `prisma migrate dev`
    - `prisma:deploy` – `prisma migrate deploy`
    - `seed:dummy` – run the development seed script.

- **API documentation**
  - TypeDoc + `typedoc-plugin-markdown` integration:
    - Generates Markdown API docs under `docs/api`.
    - Entry points cover `src/lib/**` and `src/app/**/_lib/**`.
    - `excludeInternal`, `excludePrivate`, `excludeProtected` to keep docs focused.
  - All exported functions in `src/lib/**` and `src/app/**/_lib/**` now include JSDoc comments describing:
    - Purpose and responsibilities.
    - Parameters and return types.
    - Error conditions where relevant.

- **Repository documentation & metadata**
  - `README.md`:
    - Explains the problem, the solution and how to run the project locally.
    - Describes key features and technologies.
  - `LICENSE`:
    - Project released under **GNU AGPLv3**.
  - `PRIVACY.md`:
    - Documents the privacy model, what data is (and is not) collected.
    - Emphasizes IP hashing, lack of user accounts, and aggregation focus.
  - `CONTRIBUTING.md`:
    - Guidelines for opening issues and PRs.
    - Expectations around tests, linting and documentation.
    - Notes about local setup, devcontainer usage and available scripts.

- **GitHub workflows & templates**
  - Issue templates (YAML-based) for:
    - Bug reports.
    - Feature requests.
    - Documentation improvements.
    - Data-quality topics.
    - DX / local setup issues.
    - Refactor / internal quality work.
    - Security & privacy concerns.
  - Pull request template enforcing:
    - Linked issue requirement.
    - Clear summary and scope.
    - Testing checklist (lint, typecheck, Vitest, Playwright, etc.).
    - Explicit call-outs for security / privacy and DB changes.
  - Config & validation:
    - Repository configuration to encourage:
      - PRs targeting a staging branch.
      - Issues being opened before PRs.
    - Additional CI workflow (`validate-pr.yml`) to enforce PR rules (linked issue, allowed base branch, etc.).

---

### Changed

- Stabilized the data model so that:
  - Country information lives on the `Company` model, not on each `Report`.
  - Admin tables and public stats both rely on the same normalized company data.
- Normalized company names:
  - Introduced a `normalizedName` field to prevent duplicate company records differing only by spacing/casing.
- Refined error handling and logging across API routes to ensure:
  - Friendly messages for end users.
  - Structured, privacy-conscious logs for operators.

---

### Security

- Hardened all report-related endpoints with:
  - Strict schema validation.
  - Rate limiting based on hashed IP information.
  - Defensive handling of missing / invalid IPs.
- Restricted admin surface area:
  - Host allowlist + signed session cookies + CSRF protection on login.
- Integrated a honeypot mechanism to quietly drop obvious bot submissions without creating noise in error logs or stats.

---

If you notice a discrepancy between this changelog and the current behaviour of the app, please open an issue in the repository so it can be corrected in a future release.
