#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Local development PostgreSQL bootstrap script.
#
# Responsibilities:
# - Start the local PostgreSQL service inside the dev container.
# - Ensure a dedicated dev user and database exist.
# - Grant the required privileges to that user.
# - Apply Prisma migrations via `npx prisma migrate deploy`.
#
# IMPORTANT:
# - This script is intended for **local development only**.
# - It refuses to run when NODE_ENV is not "development".
# - Never point DATABASE_URL for this project to a production database
#   while running this script.
# -----------------------------------------------------------------------------

# Default to "development" if NODE_ENV is not set.
NODE_ENV_VALUE="${NODE_ENV:-development}"

if [[ "${NODE_ENV_VALUE}" != "development" ]]; then
  echo "[setup-db] Refusing to run: NODE_ENV='${NODE_ENV_VALUE}' (expected 'development')." >&2
  exit 1
fi

# Basic settings for local development database.
# These values MUST match the credentials used in your .env / DATABASE_URL.
DB_USER="ghostuser"
DB_PASSWORD="ghostpass"
DB_NAME="donotghostme"

# Best-effort check that we are in the project root
if [[ ! -f "package.json" ]]; then
  echo "[setup-db] package.json not found in current directory. Please run this script from the project root." >&2
  exit 1
fi

echo "[setup-db] Starting PostgreSQL service..."
if ! sudo service postgresql start; then
  echo "[setup-db] Failed to start PostgreSQL service. Are you running inside the dev container?" >&2
  exit 1
fi

echo "[setup-db] Checking database user '${DB_USER}'..."
# Check if user exists; create if it does not exist.
USER_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" || echo 0)"

if [[ "${USER_EXISTS}" != "1" ]]; then
  echo "[setup-db] Creating database user '${DB_USER}' with CREATEDB privilege..."
  # NOTE: This uses static credentials for local development only.
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEDB;"
else
  echo "[setup-db] User '${DB_USER}' already exists, ensuring CREATEDB privilege..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER ${DB_USER} CREATEDB;"
fi

echo "[setup-db] Checking database '${DB_NAME}'..."
# Check if database exists; create if it does not exist.
DB_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || echo 0)"

if [[ "${DB_EXISTS}" != "1" ]]; then
  echo "[setup-db] Creating database '${DB_NAME}'..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "[setup-db] Database '${DB_NAME}' already exists."
fi

echo "[setup-db] Granting privileges on '${DB_NAME}' to '${DB_USER}'..."
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "[setup-db] Applying Prisma migrations via 'npx prisma migrate deploy'..."
if command -v npx >/dev/null 2>&1; then
  # We assume this script is executed from the project root (workspaceFolder).
  if npx prisma migrate deploy; then
    echo "[setup-db] Prisma migrations applied successfully."
  else
    echo "[setup-db] Prisma migrations failed. Check the error output above." >&2
    exit 1
  fi
else
  echo "[setup-db] 'npx' not found on PATH, skipping Prisma migrations." >&2
fi

echo "[setup-db] Done."
