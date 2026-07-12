-- PVW runtime — MetricSnapshot time-series store (closes PVW gap G6) and append-only Alert store
-- (PVW §2.2/§5). Applied via `prisma db push` in dev (migration history has pre-existing drift at
-- 20250618120000_smart_matching_vip); this file records the DDL for deployability and review.

-- CreateTable
CREATE TABLE "CcqsMetricSnapshot" (
    "id" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "windowSpecVersion" TEXT NOT NULL,
    "replayRunId" TEXT,
    "bucketStart" TIMESTAMP(3),
    "bucketEnd" TIMESTAMP(3),
    "metrics" TEXT NOT NULL,
    "engineLabel" TEXT,
    "cognitiveEngineVersion" TEXT,
    "rulesRegistryVersion" TEXT,
    "comparatorEngineVersion" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcqsMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcqsAlertEvent" (
    "id" TEXT NOT NULL,
    "alertPolicyId" TEXT NOT NULL,
    "alertPolicyVersion" TEXT NOT NULL,
    "alertKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "sourceSnapshotIds" TEXT NOT NULL,
    "resolvesAlertEventId" TEXT,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcqsAlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CcqsMetricSnapshot_pillar_bucketStart_idx" ON "CcqsMetricSnapshot"("pillar", "bucketStart");
CREATE INDEX "CcqsMetricSnapshot_replayRunId_idx" ON "CcqsMetricSnapshot"("replayRunId");
CREATE INDEX "CcqsAlertEvent_alertKey_firedAt_idx" ON "CcqsAlertEvent"("alertKey", "firedAt");
CREATE INDEX "CcqsAlertEvent_severity_idx" ON "CcqsAlertEvent"("severity");
