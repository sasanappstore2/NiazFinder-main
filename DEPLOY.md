# Deployment and local run instructions

Prerequisites
- Docker Engine and Docker Compose v2 installed on the host.

Local build & run
```bash
docker-compose build
docker-compose up -d
docker-compose logs -f
```

Apply database migrations (if needed)
```bash
docker-compose exec backend npm run typeorm:run
docker-compose exec chat npx prisma migrate deploy
```

Stopping and cleanup
```bash
docker-compose down
```

Notes
- Edit `.env` (copy from `.env.example`) before first run.
- Caddy expects a valid `Caddyfile` with your domain; for local testing you can route `localhost`.
