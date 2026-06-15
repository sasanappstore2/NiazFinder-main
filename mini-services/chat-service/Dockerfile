FROM oven/bun:1-debian
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

# Monorepo build (context = repo root)
COPY prisma ./prisma
COPY mini-services/chat-service/package.json mini-services/chat-service/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY mini-services/chat-service ./
RUN bunx prisma generate --schema=./prisma/schema.prisma

COPY mini-services/chat-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3004
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
  CMD wget -qO- http://127.0.0.1:3004/health | grep -q '"ok":true' || exit 1

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
CMD ["bun", "run", "index.ts"]
