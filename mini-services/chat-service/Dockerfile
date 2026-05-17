FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Install build tools for native modules
RUN apt-get update && apt-get install -y python3 make g++ ca-certificates --no-install-recommends \
	&& rm -rf /var/lib/apt/lists/*
# Install dependencies
RUN npm install --silent --legacy-peer-deps
COPY . .
RUN npm run build || true

FROM node:20-bullseye-slim
WORKDIR /app
COPY --from=builder /app .
RUN npm install --production --silent --legacy-peer-deps || true
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
RUN apt-get update && apt-get install -y ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*
EXPOSE 3004
CMD ["node", "index.js"]
