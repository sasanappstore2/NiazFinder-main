#!/bin/sh
set -e

echo "Waiting for Postgres at $POSTGRES_HOST:$POSTGRES_PORT..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 1
done

echo "Generating Prisma client..."
npx prisma generate

echo "Running seed (if present)..."
node prisma/seed.ts || node prisma/seed.js || true

exec "$@"
