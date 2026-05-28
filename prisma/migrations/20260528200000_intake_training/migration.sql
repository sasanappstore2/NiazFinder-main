-- CreateTable
CREATE TABLE "IntakeTrainingExample" (
    "id" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "needType" TEXT,
    "ruleResult" JSONB,
    "aiResult" JSONB,
    "finalEntities" JSONB NOT NULL,
    "finalNeedDraft" JSONB,
    "intakeTrace" JSONB,
    "serviceRequestId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "correctedEntities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeTrainingExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeValidationRejectEvent" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "field" TEXT,
    "value" TEXT,
    "detail" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeValidationRejectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeCandidateFailureEvent" (
    "id" TEXT NOT NULL,
    "sourceText" TEXT,
    "expectedCategory" TEXT,
    "candidateSlugs" TEXT NOT NULL DEFAULT '[]',
    "aiSelectedCategory" TEXT,
    "publishedCategory" TEXT,
    "coverage" BOOLEAN NOT NULL DEFAULT false,
    "serviceRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeCandidateFailureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeTrainingExample_serviceRequestId_key" ON "IntakeTrainingExample"("serviceRequestId");

-- CreateIndex
CREATE INDEX "IntakeTrainingExample_reviewed_idx" ON "IntakeTrainingExample"("reviewed");

-- CreateIndex
CREATE INDEX "IntakeTrainingExample_publishedAt_idx" ON "IntakeTrainingExample"("publishedAt");

-- CreateIndex
CREATE INDEX "IntakeTrainingExample_needType_idx" ON "IntakeTrainingExample"("needType");

-- CreateIndex
CREATE INDEX "IntakeTrainingExample_reviewed_publishedAt_idx" ON "IntakeTrainingExample"("reviewed", "publishedAt");

-- CreateIndex
CREATE INDEX "IntakeValidationRejectEvent_reason_idx" ON "IntakeValidationRejectEvent"("reason");

-- CreateIndex
CREATE INDEX "IntakeValidationRejectEvent_createdAt_idx" ON "IntakeValidationRejectEvent"("createdAt");

-- CreateIndex
CREATE INDEX "IntakeValidationRejectEvent_reason_createdAt_idx" ON "IntakeValidationRejectEvent"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "IntakeCandidateFailureEvent_createdAt_idx" ON "IntakeCandidateFailureEvent"("createdAt");

-- CreateIndex
CREATE INDEX "IntakeCandidateFailureEvent_coverage_idx" ON "IntakeCandidateFailureEvent"("coverage");

-- CreateIndex
CREATE INDEX "IntakeCandidateFailureEvent_expectedCategory_idx" ON "IntakeCandidateFailureEvent"("expectedCategory");

-- AddForeignKey
ALTER TABLE "IntakeTrainingExample" ADD CONSTRAINT "IntakeTrainingExample_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
