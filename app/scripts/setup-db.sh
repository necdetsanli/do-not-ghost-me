#!/usr/bin/env bash
set -euo pipefail

# Basic settings for local development database
DB_USER="ghostuser"
DB_PASSWORD="ghostpass"
DB_NAME="donotghostme"

echo "[setup-db] Starting PostgreSQL service..."
sudo service postgresql start

# Check if user exists; create if it does not exist
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" || echo 0)

if [ "$USER_EXISTS" != "1" ]; then
  echo "[setup-db] Creating database user '${DB_USER}'..."
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEDB;"
else
  echo "[setup-db] User '${DB_USER}' already exists, ensuring CREATEDB privilege..."
  sudo -u postgres psql -c "ALTER USER ${DB_USER} CREATEDB;"
fi

# Check if database exists; create if it does not exist
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || echo 0)

if [ "$DB_EXISTS" != "1" ]; then
  echo "[setup-db] Creating database '${DB_NAME}'..."
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "[setup-db] Database '${DB_NAME}' already exists."
fi

echo "[setup-db] Granting privileges on '${DB_NAME}' to '${DB_USER}'..."
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "[setup-db] Done."
