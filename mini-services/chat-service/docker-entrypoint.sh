#!/bin/sh
set -e

# Postgres/redis readiness is enforced by compose depends_on healthchecks.
echo "[chat-service] starting..."
exec "$@"
