# Root Dockerfile for Next.js (multistage)
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
# Install build tools for native modules
RUN apt-get update && apt-get install -y python3 make g++ ca-certificates --no-install-recommends \
	&& rm -rf /var/lib/apt/lists/*
# Install dependencies
RUN npm install --silent --legacy-peer-deps

# Copy source files and generate Prisma client
COPY . .
RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# Runtime image
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
RUN apt-get update && apt-get install -y ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
