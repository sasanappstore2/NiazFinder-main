-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "CcqsEngineVersion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cognitiveEngineVersion" TEXT NOT NULL,
    "semanticContractVersion" TEXT NOT NULL,
    "comparatorEngineVersion" TEXT NOT NULL,
    "rulesRegistryVersion" TEXT NOT NULL,
    "ontologyVersions" TEXT NOT NULL,
    "gitCommit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcqsEngineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcqsReplayRun" (
    "id" TEXT NOT NULL,
    "engineVersionId" TEXT NOT NULL,
    "datasetRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CcqsReplayRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcqsComparisonRecord" (
    "id" TEXT NOT NULL,
    "replayRunId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "comparisonReport" TEXT NOT NULL,
    "finalEvaluation" TEXT NOT NULL,
    "ruleTrace" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcqsComparisonRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcqsGatePolicy" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "thresholds" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcqsGatePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcqsGateVerdict" (
    "id" TEXT NOT NULL,
    "replayRunId" TEXT NOT NULL,
    "gatePolicyId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcqsGateVerdict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CcqsEngineVersion_createdAt_idx" ON "CcqsEngineVersion"("createdAt");

-- CreateIndex
CREATE INDEX "CcqsReplayRun_datasetRef_idx" ON "CcqsReplayRun"("datasetRef");

-- CreateIndex
CREATE INDEX "CcqsReplayRun_status_idx" ON "CcqsReplayRun"("status");

-- CreateIndex
CREATE INDEX "CcqsComparisonRecord_replayRunId_idx" ON "CcqsComparisonRecord"("replayRunId");

-- CreateIndex
CREATE INDEX "CcqsComparisonRecord_caseId_idx" ON "CcqsComparisonRecord"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "CcqsGatePolicy_policyId_policyVersion_key" ON "CcqsGatePolicy"("policyId", "policyVersion");

-- CreateIndex
CREATE INDEX "CcqsGateVerdict_replayRunId_idx" ON "CcqsGateVerdict"("replayRunId");

-- AddForeignKey
ALTER TABLE "CcqsReplayRun" ADD CONSTRAINT "CcqsReplayRun_engineVersionId_fkey" FOREIGN KEY ("engineVersionId") REFERENCES "CcqsEngineVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcqsComparisonRecord" ADD CONSTRAINT "CcqsComparisonRecord_replayRunId_fkey" FOREIGN KEY ("replayRunId") REFERENCES "CcqsReplayRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcqsGateVerdict" ADD CONSTRAINT "CcqsGateVerdict_replayRunId_fkey" FOREIGN KEY ("replayRunId") REFERENCES "CcqsReplayRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcqsGateVerdict" ADD CONSTRAINT "CcqsGateVerdict_gatePolicyId_fkey" FOREIGN KEY ("gatePolicyId") REFERENCES "CcqsGatePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

