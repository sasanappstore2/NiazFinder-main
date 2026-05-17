FROM node:20-bullseye-slim AS builder
WORKDIR /app
# Copy backend package metadata and tsconfig
COPY mini-services/backend/package.json mini-services/backend/package-lock.json* mini-services/backend/tsconfig.json ./
# Copy backend Prisma schema and source files
COPY mini-services/backend/prisma ./prisma
COPY mini-services/backend/src ./src
COPY mini-services/backend/docker-entrypoint.sh ./docker-entrypoint.sh
# Install build tools
RUN apt-get update && apt-get install -y python3 make g++ ca-certificates --no-install-recommends \
	&& rm -rf /var/lib/apt/lists/*
# Install dependencies and Prisma packages
RUN npm install --silent --legacy-peer-deps
RUN npm install --silent --legacy-peer-deps prisma@6.11.1 @prisma/client@6.11.1
# Generate Prisma client using compatible Prisma version
RUN npx prisma generate
# Build
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/package.json ./package.json
RUN chmod +x ./docker-entrypoint.sh
RUN apt-get update && apt-get install -y ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*
EXPOSE 3001
CMD ["node", "dist/main.js"]
