# Do Not Ghost Me

<p align="center">
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/favicon-dark.png" />
  <img alt="necdetsanli profile card" src="public/favicon-light.png" />
</picture>
</p>

<p align="center">
  <img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/necdetsanli/do-not-ghost-me">
  <a href="https://www.donotghostme.com">
  <img alt="GitHub deployments" src="https://img.shields.io/github/deployments/necdetsanli/do-not-ghost-me/production"></a>
  <a href="LICENSE">
    <img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg"></a> 
  <a href="https://github.com/necdetsanli/do-not-ghost-me/pulls">
    <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
  <a href="https://github.com/necdetsanli/do-not-ghost-me/issues">
    <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/necdetsanli/do-not-ghost-me"></a>
  <a href="https://github.com/necdetsanli/do-not-ghost-me/stargazers">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/necdetsanli/do-not-ghost-me?style=social"></a>
  <a href="https://github.com/necdetsanli/do-not-ghost-me/forks?include=active%2Carchived%2Cinactive%2Cnetwork&page=1&period=2y&sort_by=stargazer_counts">
    <img alt="GitHub forks" src="https://img.shields.io/github/forks/necdetsanli/do-not-ghost-me"></a>
</p>

A privacy-aware way to track and surface ghosting in hiring processes.

This project collects structured reports about ghosting during hiring processes (e.g. after an interview or take-home task) and aggregates them into statistics by company, country, stage, seniority, and position category. The goal is to make ghosting visible as a _pattern_ rather than a collection of isolated stories.

> **Note:** This project is community-driven and not affiliated with any company or employer.

---

## Why this exists

Job applications, take-home assignments and interviews all cost time and emotional energy. When a company silently disappears, it does not just waste that effort — it also creates uncertainty, self-doubt and stress. Because ghosting is so common, many candidates have come to see it as “just how things are”.

**Do Not Ghost Me** tries to push back against that by:

- Giving candidates an easy way to document _where_ and _how_ they were ghosted.
- Aggregating reports into statistics that highlight patterns of behaviour.
- Helping people set realistic expectations before investing effort into a hiring process.
- Encouraging more respectful hiring practices by making silent drop-offs visible.

---

## What the platform does

From a user’s perspective:

- You anonymously submit a **ghosting report** with:
  - Company name and country
  - Position category and level
  - Stage where communication stopped
  - Optional “days without reply”
- The platform:
  - Normalizes company names and deduplicates records
  - Stores the report in a PostgreSQL database
  - Uses **only salted hashes of IP addresses** for rate-limiting (never raw IPs)
  - Exposes only **aggregated statistics** publicly

From the UI perspective:

- `/` — **Home**:
  - Short explanation of the project
  - A “Submit a report” form
  - A small stats panel with total reports and “most reported this week”
- `/companies` — **Ranking view**:
  - Companies ranked by number of ghosting reports
  - Filters for country, category, seniority and stage
- `/about` — **Project context**:
  - More detail on the problem, goals and privacy approach
- `/admin` — **Moderation dashboard** (protected):
  - List of latest reports with status
  - Actions to flag, soft-delete or hard-delete reports
- `/api/health` — **Public healthcheck**:
  - Returns `{ ok: true }` style JSON for “process up”
  - Does **not** check the database
  - Rate-limited per IP
- `/api/public/company-intel` — **Public API (read-only)**:
  - Used by the browser extension
  - Rate-limited per IP
  - Supports **k-anonymity**: optionally returns `{ "status": "insufficient_data" }` for companies with fewer than `K` ACTIVE reports (configurable via env).

---

## Tech stack & architecture

The app is intentionally minimal but production-oriented:

- **Framework:** Next.js App Router (server components + route handlers)
- **Language:** TypeScript (strict), with shared JSDoc for utilities
- **Database:** PostgreSQL via Prisma ORM
- **Styling:** Tailwind CSS, custom design tokens and light/dark themes
- **UI primitives:** Radix UI based components, wrapped in project-specific `<Input>`, `<Select>`, `<Card>`, etc.
- **Theming:** `next-themes` with light / dark / system mode and a custom `<ThemeToggle />`
- **Testing:**
  - **Vitest** for unit and integration tests
  - **Playwright** for end-to-end (E2E) tests
- **Containerized dev environment:** `.devcontainer` for reproducible local development in VS Code
- **Docker Compose (optional):** `compose.yaml` for a reproducible local app + Postgres stack without VS Code Dev Containers

Security and robustness:

- **Admin area**
  - Password-based login with CSRF protection
  - Signed, HttpOnly cookie stored as a short-lived admin session token
  - Host allow-list (`ADMIN_ALLOWED_HOST`) to avoid accidental exposure
- **Rate limiting**
  - Report submission limits are implemented in `src/lib/rateLimit.ts` (DB-backed, strict under concurrency).
  - Public read-only endpoints use an in-memory per-IP limiter in `src/lib/publicRateLimit.ts`.
  - IPs are **never stored in raw form** — only salted hashes.
- **Public endpoints**
  - `/api/health` is intentionally **public** for uptime checks.
  - It returns **process up** only (no DB checks).
  - It is protected with a per-IP **in-memory** rate limit (`src/lib/publicRateLimit.ts`).
- **Validation**
  - Zod-based schema for report payloads
  - Honeypot field to silently drop basic bot submissions
- **Logging**
  - Centralized `logInfo`, `logWarn`, `logError` helpers
  - Structured logs that avoid leaking sensitive data
- **K-anonymity for extension data**
  - The public company intel endpoint can enforce a minimum sample size (`K`) before returning aggregated results.
  - This is controlled via `COMPANY_INTEL_ENFORCE_K_ANONYMITY` and `COMPANY_INTEL_K_ANONYMITY`.

---

## Running the project locally

You can run the project in three ways:

- **Option A (recommended):** VS Code Dev Container (reproducible dev environment, local Postgres runs inside the container)
- **Option B:** Docker Compose (app + Postgres in containers, no VS Code required)
- **Option C:** Run directly on your host (advanced)

### Prerequisites

For Option A (Dev Container):

- Docker (Desktop, Podman + Docker shim, or equivalent)
- Visual Studio Code
- Dev Containers extension (`ms-vscode-remote.remote-containers`)

For Option B (Docker Compose):

- Docker with `docker compose` support

For Option C (Host):

- Node.js 24.x
- npm >= 11.7.0
- PostgreSQL

### Option A – VS Code Dev Container (recommended)

#### 1. Clone the repository

```bash
git clone https://github.com/necdetsanli/do-not-ghost-me.git
cd do-not-ghost-me
```

#### 2. Open in the dev container

1. Open the folder in VS Code.
2. When prompted, choose **“Reopen in Container”**.
3. Alternatively, use the command palette:
   `Dev Containers: Reopen in Container`.

#### 3. Dependencies

The dev container installs dependencies automatically on first create.
If you ever need to reinstall manually:

```bash
npm ci
npm run prisma:generate
```

> If you see an `npm ci` error about `package.json` and `package-lock.json` being out of sync,
> run `npm install` once to regenerate the lockfile, commit it, then use `npm ci` again.

#### 4. Configure environment variables

Copy the example file and edit as needed:

```bash
cp .env.example .env
```

At minimum you should set:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_CSRF_SECRET`
- `ADMIN_ALLOWED_HOST`
- `RATE_LIMIT_IP_SALT`

Optional (public API / browser extension):

- `COMPANY_INTEL_ENFORCE_K_ANONYMITY` (true/false)
- `COMPANY_INTEL_K_ANONYMITY` (number, default: 5)

> Never point `DATABASE_URL` at a production database while developing locally.

#### 5. Set up the local PostgreSQL database

Inside the dev container, the helper script:

- Starts the local PostgreSQL service
- Creates a dev user and database (if missing)
- Grants privileges
- Applies Prisma migrations (`prisma migrate deploy`)

Run it from the project root:

```bash
scripts/dev/setup-db.sh
```

#### 6. (Optional) Seed dummy data

To stress-test `/companies` and see realistic distributions of reports:

```bash
npm run seed:dummy
```

#### 7. Start the dev server

```bash
npm run dev
```

Then visit:

- `http://localhost:3000/` – Home & report form
- `http://localhost:3000/companies` – Company ranking and filters
- `http://localhost:3000/about` – Project overview
- `http://localhost:3000/admin/login` – Admin login (local)
- `http://localhost:3000/api/health` – Public healthcheck (process up)

#### 8. Admin dashboard (local)

To access the admin moderation dashboard:

1. Ensure `ADMIN_ALLOWED_HOST` in `.env` matches your local host (e.g. `localhost:3000`).
2. Ensure `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `ADMIN_CSRF_SECRET` are set.
3. Start the dev server (`npm run dev`).
4. Visit:
   - `http://localhost:3000/admin/login` – sign in with `ADMIN_PASSWORD`.
   - `http://localhost:3000/admin` – once logged in, you’ll see the report table.

The admin session is stored as a **signed, HttpOnly cookie**. To log out, use the dedicated logout flow:

- Visit `/admin/logout` (or click the logout button in the admin header).
- This triggers `/api/admin/logout`, which clears the cookie and redirects you back to `/`.

---

### Option B – Docker Compose (app + Postgres)

This repo includes a `compose.yaml` that starts:

- a local Postgres database
- the Next.js dev server
- Prisma client generation and migrations on startup

#### 1. Start the stack

```bash
docker compose up --build
```

#### 2. Verify it is running

In another terminal:

```bash
curl -I http://localhost:3000/
docker compose exec db psql -U ghostuser -d donotghostme -c "select count(*) from \"_prisma_migrations\";"
```

#### 3. Stop (and optionally reset)

```bash
docker compose down
# to wipe volumes (drops local DB data)
docker compose down -v
```

> If you want to customize env values, edit the `compose.yaml` environment block or use an override file like `compose.override.yaml`. Do not commit real secrets.

---

### Option C – Run directly on your host (advanced)

If you prefer not to use the dev container or Docker Compose:

1. **Install prerequisites**
   - Node.js 24.x
   - npm >= 11.6.4
   - PostgreSQL

2. **Clone the repo and install dependencies**

```bash
git clone https://github.com/necdetsanli/do-not-ghost-me.git
cd do-not-ghost-me
npm ci
```

3. **Create `.env`**

```bash
cp .env.example .env
```

Set `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_CSRF_SECRET`, and `ADMIN_ALLOWED_HOST` as in the dev container instructions.

4. **Set up PostgreSQL**
   - Create a user and database that match your `DATABASE_URL`.

Then, from the project root:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. **(Optional) Seed dummy data**

```bash
npm run seed:dummy
```

6. **Start the dev server**

```bash
npm run dev
```

The app will be available at `http://localhost:3000/`.

---

## NPM scripts

For convenience, the project exposes a set of scripts in `package.json`:

Common workflows:

- **Local development**

  ```bash
  npm run dev
  ```

- **One-shot quality gate (local)**

  ```bash
  npm run verify
  # => lint + typecheck + unit/integration tests + e2e tests
  ```

- **CI pipelines**

  ```bash
  npm run verify:ci
  # => non-watch tests and Playwright runs suitable for CI
  ```

- **Database migrations**

  ```bash
  npm run prisma:generate
  npm run prisma:migrate
  ```

- **Formatting & linting**

  ```bash
  npm run format
  npm run lint
  ```

---

## Testing

The test setup is intentionally close to what you’d expect in a production-grade Next.js app.

### Unit & integration tests (Vitest)

The project uses **Vitest** as the primary test runner for unit and integration tests.

- Run the full suite:

  ```bash
  npm run test
  ```

- Watch mode during development:

  ```bash
  npm run test:watch
  ```

- Coverage report:

  ```bash
  npm run test:coverage
  ```

- CI-optimized run (single process):

  ```bash
  npm run test:ci
  ```

Vitest is used to test:

- Validation and parsing logic in `src/lib/**`.
- Rate limiting logic and helpers around Prisma queries.
- Pure utility functions (enums, formatting, URL builders).
- API route handlers in isolation (using mocks/in-memory DB where appropriate).

### End-to-end tests (Playwright)

For full stack verification, **Playwright** is used:

- Run all E2E tests:

  ```bash
  npm run test:e2e
  ```

E2E coverage is focused on:

- Submitting a report from the home page and seeing success/error states.
- Top companies listing behaviour with filters and pagination.
- Admin login/logout flow and basic moderation actions.

> In many cases, you’ll want to run `npm run dev` in one terminal and `npm run test:e2e` in another, or rely on `npm run verify` / `npm run verify:ci` as a single gate.

---

## Contributing

Contributions, feedback and ideas are very welcome.

- If you discover a bug or have an idea for improvement, please open an **issue**.
- For pull requests:
  - Try to keep changes reasonably focused.
  - Run `npm run verify` locally before opening the PR.
  - Include tests where it makes sense (Vitest or Playwright).

For detailed guidelines (branch naming, commit style, code conventions), see:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)

---

## Changelog

Notable changes, new features and breaking changes are tracked in:

- [`CHANGELOG.md`](CHANGELOG.md)

This is the best place to see what has changed between releases.

---

## License

Do Not Ghost Me is free software licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

- For the full legal text, see the [`LICENSE`](LICENSE) file.

---

## Privacy

Privacy and data handling are documented separately and in more depth in:

- [`PRIVACY.md`](PRIVACY.md)

The short version:

- Reports are stored without creating identifiable user accounts or profiles.
- The system is interested in **aggregated company behaviour**, not tracking individual candidates.
- IP addresses are never stored as raw values, only as salted hashes used for rate limiting and abuse detection.

Please refer to `PRIVACY.md` for the authoritative, up-to-date details.
