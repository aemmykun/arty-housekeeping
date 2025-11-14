#!/usr/bin/env bash
set -euo pipefail

# Run SQL migration against a Postgres DB using psql if DATABASE_URL is provided.
# If you are using Supabase, you can copy the SQL from migrations/001_create_canonical_reservations.sql into the Supabase SQL editor.

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
MIGRATION_FILE="$PROJECT_DIR/migrations/001_create_canonical_reservations.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running migration via psql using DATABASE_URL"
  psql "$DATABASE_URL" -f "$MIGRATION_FILE"
  echo "Migration applied"
  exit 0
fi

if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -n "${SUPABASE_URL:-}" ]; then
  echo "No DATABASE_URL found. Please run migration using the Supabase SQL editor at ${SUPABASE_URL}/project/editor/sql or paste the SQL manually."
  echo "For automation, you can use the Supabase CLI (https://supabase.com/docs/guides/cli) with the service role key to run migrations."
  exit 1
fi

echo "Set DATABASE_URL (Postgres connection string) or SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL to proceed."
exit 1
