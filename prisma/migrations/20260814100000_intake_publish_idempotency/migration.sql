-- Durable publish idempotency ledger. Additive migration; safe for old clients.
CREATE TABLE "NeedPublishIdempotency" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "serviceRequestId" TEXT,
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NeedPublishIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NeedPublishIdempotency_scopeKey_idempotencyKey_key"
  ON "NeedPublishIdempotency"("scopeKey", "idempotencyKey");
CREATE INDEX "NeedPublishIdempotency_expiresAt_idx"
  ON "NeedPublishIdempotency"("expiresAt");
CREATE INDEX "NeedPublishIdempotency_serviceRequestId_idx"
  ON "NeedPublishIdempotency"("serviceRequestId");
