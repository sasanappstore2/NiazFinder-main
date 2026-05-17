#!/bin/sh
set -e

# Wait for Postgres
echo "Waiting for Postgres at $POSTGRES_HOST:$POSTGRES_PORT..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 1
done

echo "Postgres is up. Running migrations..."
npm run typeorm:run

echo "Running seed (if present)..."
node dist/seed.js || true

exec "$@"
