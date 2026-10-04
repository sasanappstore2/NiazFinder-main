# Stale sqlite mirror — NOT the source of truth.
# chat-service uses the monorepo root prisma/schema.prisma
# (Docker: bunx prisma generate --schema=./prisma/schema.prisma).
# This file is kept only so accidental local imports fail loudly.
#
# Do not run `prisma generate` against this path.
throw new Error(
  'mini-services/chat-service/prisma is deprecated. Use repo-root prisma/schema.prisma.'
);
