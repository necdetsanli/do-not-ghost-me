**do-not-ghost-me**

***

# Do Not Ghost Me

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
- `/top-companies` — **Ranking view**:
  - Companies ranked by number of ghosting reports
  - Filters for country, category, seniority and stage
- `/about` — **Project context**:
  - More detail on the problem, goals and privacy approach
- `/admin` — **Moderation dashboard** (protected):
  - List of latest reports with status
  - Actions to flag, soft-delete or hard-delete reports

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

Security and robustness:

- **Admin area**
  - Password-based login with CSRF protection
  - Signed, HttpOnly cookie stored as a short-lived admin session token
  - Host allow-list (`ADMIN_ALLOWED_HOST`) to avoid accidental exposure
- **Rate limiting**
  - Per-IP and per-company limits, implemented in `src/lib/rateLimit.ts`
  - IPs are **never stored in raw form** — only salted hashes
- **Validation**
  - Zod-based schema for report payloads
  - Honeypot field to silently drop basic bot submissions
- **Logging**
  - Centralized `logInfo`, `logWarn`, `logError` helpers
  - Structured logs that avoid leaking sensitive data

---

## Running the project locally

The repository includes a **VS Code Dev Container** configuration and helper scripts for setting up PostgreSQL and seeding dummy data. The recommended flow is to use the dev container so that your local environment stays clean and consistent.

You’ll need:

- **Docker** (Desktop, Podman + Docker shim, or equivalent)
- **Visual Studio Code**
- The **Dev Containers** extension (`ms-vscode-remote.remote-containers`)

> You can also run the project directly on your host machine without the dev container (see below), but that is primarily for advanced users.

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

VS Code will build the container image defined by `.devcontainer/` and start a development environment with Node, PostgreSQL tooling, and other dependencies pre-installed.

#### 3. Install dependencies

Inside the dev container terminal:

```bash
npm install
```

This will install all JavaScript / TypeScript dependencies, including Next.js, Prisma, Vitest and Playwright.

#### 4. Configure environment variables

Copy the example file and edit as needed:

```bash
cp .env.example .env
```

At minimum you should set:

- `DATABASE_URL` – pointing to your local PostgreSQL instance (the dev container is set up to work with the bootstrap script below).
- `ADMIN_PASSWORD` – the password you want to use for `/admin/login`.
- `ADMIN_SESSION_SECRET` – a random secret for signing admin session tokens.
- `ADMIN_ALLOWED_HOST` – usually `localhost:3000` for local development.

#### 5. Set up the local PostgreSQL database

Inside the dev container, you can either:

- Use the **helper shell script** under `dev/scripts/` (e.g. `setup-db.sh`) to:
  - Start the local PostgreSQL service
  - Create a dev user and database
  - Grant privileges
  - Run Prisma migrations

or:

- Run the steps manually:

```bash
# Generate Prisma client (also runs automatically on postinstall)
npm run prisma:generate

# Apply migrations for development
npm run prisma:migrate
```

> The helper scripts under `dev/scripts/` are meant for **development only**.  
> Never point `DATABASE_URL` at a production database when running them.

#### 6. (Optional) Seed dummy data

To stress-test `/top-companies` and see realistic distributions of reports, you can populate the database with lots of dummy companies and reports.

The repo includes a development-only seeder script (under `dev/scripts/`, e.g. `seed-dummy-reports.js`). The recommended way to run it is via the npm script:

```bash
npm run seed:dummy
```

This script:

- Refuses to run if `NODE_ENV` is not `development`.
- Clears existing `Report` and `Company` data.
- Inserts many companies with varied report counts to exercise aggregation and ranking logic.

#### 7. Start the dev server

Finally, run the Next.js dev server:

```bash
npm run dev
```

Then visit:

- `http://localhost:3000/` – Home & report form
- `http://localhost:3000/top-companies` – Aggregated ranking
- `http://localhost:3000/about` – Project overview

#### 8. Admin dashboard (local)

To access the admin moderation dashboard:

1. Ensure `ADMIN_ALLOWED_HOST` in `.env` matches your local host (e.g. `localhost:3000`).
2. Ensure `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are set.
3. Start the dev server (`npm run dev`).
4. Visit:
   - `http://localhost:3000/admin/login` – sign in with `ADMIN_PASSWORD`.
   - `http://localhost:3000/admin` – once logged in, you’ll see the report table.

The admin session is stored as a **signed, HttpOnly cookie**. To log out, use the dedicated logout flow:

- Visit `/admin/logout` (or click the logout button in the admin header).
- This triggers `/api/admin/logout`, which clears the cookie and redirects you back to `/`.

---

### Option B – Run directly on your host

If you prefer not to use the dev container:

1. **Install prerequisites**
   - Node.js (LTS)
   - PostgreSQL
   - npm or pnpm (README assumes `npm`)

2. **Clone the repo and install dependencies**

   ```bash
   git clone https://github.com/necdetsanli/do-not-ghost-me.git
   cd do-not-ghost-me

   npm install
   ```

3. **Create `.env`**

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `ADMIN_ALLOWED_HOST` as in the dev container instructions.

4. **Set up PostgreSQL**
   - Create a user and database that match your `DATABASE_URL`.
   - Alternatively, run the same kind of logic as the dev container’s helper script does (create user, create DB, grant privileges, apply migrations).

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

- [`CONTRIBUTING.md`](_media/CONTRIBUTING.md)

---

## Changelog

Notable changes, new features and breaking changes are tracked in:

- [`CHANGELOG.md`](CHANGELOG.md)

This is the best place to see what has changed between releases.

---

## License

Do Not Ghost Me is free software licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

- For the full legal text, see the [`LICENSE`](_media/LICENSE) file.

---

## Privacy

Privacy and data handling are documented separately and in more depth in:

- [`PRIVACY.md`](_media/PRIVACY.md)

The short version:

- Reports are stored without creating identifiable user accounts or profiles.
- The system is interested in **aggregated company behaviour**, not tracking individual candidates.
- IP addresses are never stored as raw values, only as salted hashes used for rate limiting and abuse detection.

Please refer to `PRIVACY.md` for the authoritative, up-to-date details.
