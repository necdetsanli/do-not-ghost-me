# Contributing to Do Not Ghost Me

Thanks for your interest in contributing to **Do Not Ghost Me** 💜  
This project aims to surface ghosting patterns in hiring while protecting candidate privacy. Contributions that improve data quality, UX, security, or developer experience are very welcome.

This document explains **how to work on the project**, **what we expect in PRs**, and how to **run the app locally**.

---

## 1. Ground rules

- Be respectful. This project exists to make hiring more humane, not to fuel harassment.
- Do **not** add or request features that violate privacy guarantees described in `PRIVACY.md`.
- By contributing, you agree that your contributions are licensed under the **GNU AGPLv3** (see `LICENSE`).

---

## 2. Issues first, then PRs

We follow an **“issue first”** workflow:

1. **Open an issue** describing:
   - Bug report, feature request, docs improvement, refactor, privacy/security concern, etc.
   - Use the relevant GitHub Issue Template (bug, feature, docs, data-quality, DX setup, refactor, privacy/security).
2. Discuss scope / direction if needed.
3. Once there is agreement, open a **pull request that references the issue**.

> ⚠️ **PRs must be linked to an issue** using one of:
>
> - `Closes #123`
> - `Fixes #123`
> - `Resolves #123`
> - `Related to #123`

The repository is configured so that:

- PRs **must be associated with an issue**.
- PRs should **target the `staging` branch**, not `main`.

---

## 3. Types of contributions

Some examples of what you can work on:

- 🐛 **Bug fixes** (frontend, API, rate limiting, admin panel, etc.)
- ✨ **Features / improvements** (new filters, better stats, UX enhancements)
- 📊 **Data quality** (improved normalization, better aggregations)
- 📚 **Docs** (README, PRIVACY, setup instructions, developer notes)
- 🛡️ **Security / privacy** (hardening IP handling, logging, validation)
- 🧰 **Developer experience** (devcontainer tweaks, scripts, test reliability)
- 🧹 **Refactors** (without changing behaviour, clarifying code, improving tests)

Please pick the most appropriate issue template when opening an issue.

---

## 4. Local development

The recommended way to work on this project is via the **VS Code dev container**.

### 4.1. Requirements

- Docker / compatible container runtime
- VS Code with the **Dev Containers** extension (or GitHub Codespaces)
- GitHub account (for forking and PRs)

### 4.2. Getting started (devcontainer)

1. **Fork** the repository on GitHub.
2. Clone your fork:

   ```bash
   git clone https://github.com/<your-username>/do-not-ghost-me.git
   cd do-not-ghost-me
   ```

3. Open the folder in VS Code.
4. When prompted, select **“Reopen in Container”** (or use the Command Palette:
   _Dev Containers: Reopen in Container_).

The devcontainer will install Node.js, dependencies, and necessary tools for you.

---

## 5. Database setup & dummy data

Inside the devcontainer shell (project root):

### 5.1. Environment variables

1. Copy the example environment file (if present) or create `.env`:

   ```bash
   cp .env.example .env
   ```

2. Ensure `DATABASE_URL` is set to the local PostgreSQL instance created by `scripts/dev/setup-db.sh`.
   The default values used by the script are:
   - User: `ghostuser`
   - Password: `ghostpass`
   - Database: `donotghostme`

### 5.2. Bootstrap the local database

Use the helper script:

- `scripts/dev/setup-db.sh`

This script will:

- Start PostgreSQL inside the devcontainer.
- Create the dev DB user and database (if needed).
- Grant necessary privileges.
- Run `prisma migrate deploy` to apply migrations.

From the project root:

```bash
bash scripts/dev/setup-db.sh
```

> ⚠️ This script is **development-only** and refuses to run unless `NODE_ENV=development`.

### 5.3. Seeding dummy reports (optional but recommended)

To stress-test `/top-companies` and have realistic data, you can seed dummy reports:

- `scripts/dev/seed-dummy-reports.js`

Run:

```bash
npm run seed:dummy
```

This will:

- Wipe existing `Report` and `Company` data in the **development** database.
- Insert many companies and reports with varied distributions.

Never point `DATABASE_URL` at a production database when running this script.

---

## 6. Running the app locally

Once the devcontainer and database are set up:

### 6.1. Install dependencies

Normally done by the devcontainer on first build, but you can run:

```bash
npm install
```

This will also run `prisma generate` via `postinstall`.

### 6.2. Development server

Run the Next.js dev server:

```bash
npm run dev
```

Then open:

- `http://localhost:3000` → public site
- `http://localhost:3000/top-companies` → aggregated stats
- `http://localhost:3000/about` → project info

Admin routes:

- `http://localhost:3000/admin/login`
- `http://localhost:3000/admin`

Admin access depends on:

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_ALLOWED_HOST`

Check `README.md` for details on configuring these.

---

## 7. Testing & quality gates

Before opening a PR, please:

### 7.1. Lint + typecheck

```bash
npm run lint
npm run check
```

### 7.2. Unit & integration tests (Vitest)

```bash
npm run test           # all tests
npm run test:watch     # during development
npm run test:coverage  # to check coverage
```

### 7.3. E2E tests (Playwright)

```bash
npm run test:e2e
```

### 7.4. Full verification

For “serious” changes:

```bash
npm run verify
# or for CI-like runs
npm run verify:ci
```

Where:

- `test` / `test:ci` use **Vitest**.
- `test:e2e` uses **Playwright**.

> The `PULL_REQUEST_TEMPLATE` also asks you to check which of these you actually ran.

---

## 8. Coding style & guidelines

### 8.1. Language & stack

- **TypeScript** (no loose `any` unless unavoidable and justified).
- **Next.js App Router**, **React Server Components** where appropriate.
- **Prisma + PostgreSQL** for persistence.
- **Tailwind + custom UI components** for frontend.
- **Vitest** for unit/integration tests.
- **Playwright** for E2E tests.

### 8.2. General rules

- Keep PRs **small and focused**.
- Follow **SOLID/DRY/KISS** principles.
- Prefer **pure functions** and clear boundaries in `src/lib/**`.
- Avoid global mutable state.
- Keep **security & privacy** in mind:
  - No logging of raw IPs or personal data beyond what’s allowed in `PRIVACY.md`.
  - Use the existing helpers (`formatUnknownError`, logging utilities, rate limit helpers, etc.) instead of hand-rolled logging/serialization.

### 8.3. JSDoc for exported functions

For **all exported functions** in:

- `src/lib/**`
- `src/app/**/_lib/**`

Please **add JSDoc** including:

- `@param` for each parameter.
- `@returns` for the return value.
- Additional tags (`@throws`, etc.) when relevant.

Example:

```ts
/**
 * Enforces rate limits for a given IP and company/position combination.
 *
 * @param params - Context for the rate limit check.
 * @returns A promise that resolves if the action is allowed.
 * @throws ReportRateLimitError If the limits are exceeded.
 */
export async function enforceReportLimitForIpCompanyPosition(params: EnforceRateLimitParams): Promise<void> {
  // ...
}
```

For **components**, JSDoc is especially useful for:

- Complex props
- Custom hooks
- Behaviour that is non-obvious

### 8.4. Boolean checks

- Use **strict checks** (`=== true`, `=== false`) where it improves clarity.
- Avoid relying on loose truthiness for flags.

### 8.5. Naming & structure

- Keep files and directories consistent with existing conventions.
- Co-locate small route-specific utilities under `src/app/**/_lib/**` rather than bloating `src/lib/**` unnecessarily.
- Prefer clear names for types and interfaces (e.g. `TopCompanyRow`, `ResolvedFilters`, `AdminReportRow`).

---

## 9. Security & privacy

This project is intentionally opinionated about privacy:

- IPs are hashed with a salt for rate limiting instead of storing raw IPs.
- Logs should be structured and **never** contain secrets, passwords, or personally identifiable candidate data.
- Any change that affects:
  - Rate limiting
  - IP handling or logging
  - Error logging and stack traces
  - Data retention and deletion
  - Anything documented in `PRIVACY.md`

  …should be called out explicitly in your PR and verified against `PRIVACY.md`.

If in doubt, open a **“Privacy / Security concern”** issue and discuss first.

---

## 10. Pull requests

When you’re ready to open a PR:

1. Ensure you have a corresponding **issue**.
2. Push your branch and open a PR **against `staging`**.
3. Fill out the PR template:
   - Summary of changes
   - Linked issue(s)
   - Testing you actually ran
   - Any schema / migration / data backfill implications
   - Security / privacy impact
   - DX / setup impact

4. Keep the PR focused. If you find unrelated improvements, open a **separate issue** (and optionally a separate PR).

Reviews will focus on:

- Correctness and safety (especially around rate limiting, auth, privacy).
- Tests and coverage where appropriate.
- Consistency with the existing code style and conventions.
- Clarity and maintainability.

---

## 11. Questions & feedback

If you’re unsure about:

- The best place to add a new feature
- How to structure data / queries
- How to align with privacy rules
- How to debug something locally

…feel free to **open a small “DX / Question” issue** or join an existing discussion. It’s better to ask early than to spend time on a direction that won’t be merged.

Thanks again for helping to make hiring a bit less ghostly 👻
