#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Local development PostgreSQL bootstrap script.
#
# Responsibilities:
# - Start the local PostgreSQL service inside the dev container.
# - Ensure a dedicated dev user and database exist.
# - Grant required privileges.
# - Apply Prisma migrations via the locally installed Prisma CLI.
#
# Safety:
# - Development-only guard (NODE_ENV must be "development").
# - Avoids network installs and interactive prompts (no `npx prisma`).
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd)"
cd "${PROJECT_ROOT}"

NODE_ENV_VALUE="${NODE_ENV:-development}"
if [[ "${NODE_ENV_VALUE}" != "development" ]]; then
  echo "[setup-db] Refusing to run: NODE_ENV='${NODE_ENV_VALUE}' (expected 'development')." >&2
  exit 1
fi

DB_USER="ghostuser"
DB_PASSWORD="ghostpass"
DB_NAME="donotghostme"

if [[ ! -f "package.json" ]]; then
  echo "[setup-db] package.json not found in '${PROJECT_ROOT}'. Aborting." >&2
  exit 1
fi

PRISMA_BIN="${PROJECT_ROOT}/node_modules/.bin/prisma"
if [[ ! -x "${PRISMA_BIN}" ]]; then
  echo "[setup-db] Prisma CLI not found at '${PRISMA_BIN}'." >&2
  echo "[setup-db] Run 'npm ci' in the project root, then retry." >&2
  exit 0
fi

# prisma.config.ts imports "dotenv/config" -> ensure it can be resolved.
if ! node -e "require('dotenv/config')" >/dev/null 2>&1; then
  echo "[setup-db] Cannot resolve 'dotenv/config'. Ensure 'dotenv' is installed (devDependency) and node_modules is complete." >&2
  echo "[setup-db] Suggested fix: npm ci && npm i -D dotenv" >&2
  exit 0
fi

echo "[setup-db] Starting PostgreSQL service..."
if ! sudo service postgresql start; then
  echo "[setup-db] Failed to start PostgreSQL service. Are you running inside the dev container?" >&2
  exit 1
fi

echo "[setup-db] Checking database user '${DB_USER}'..."
USER_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" || echo 0)"
if [[ "${USER_EXISTS}" != "1" ]]; then
  echo "[setup-db] Creating database user '${DB_USER}' with CREATEDB privilege..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEDB;"
else
  echo "[setup-db] User '${DB_USER}' already exists, ensuring CREATEDB privilege..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER ${DB_USER} CREATEDB;"
fi

echo "[setup-db] Checking database '${DB_NAME}'..."
DB_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || echo 0)"
if [[ "${DB_EXISTS}" != "1" ]]; then
  echo "[setup-db] Creating database '${DB_NAME}'..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "[setup-db] Database '${DB_NAME}' already exists."
fi

echo "[setup-db] Granting privileges on '${DB_NAME}' to '${DB_USER}'..."
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null

# Best-effort schema privileges (helps when DB already existed).
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" >/dev/null || true
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};" >/dev/null || true
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};" >/dev/null || true

echo "[setup-db] Applying Prisma migrations via '${PRISMA_BIN} migrate deploy'..."
if "${PRISMA_BIN}" migrate deploy; then
  echo "[setup-db] Prisma migrations applied successfully."
else
  echo "[setup-db] Prisma migrations failed. Check the error output above." >&2
  exit 1
fi

echo "[setup-db] Done."
