-- Intake training flywheel: session link + correction query fields
ALTER TABLE "IntakeTrainingExample" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "IntakeTrainingExample" ADD COLUMN IF NOT EXISTS "hasUserCorrections" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IntakeTrainingExample" ADD COLUMN IF NOT EXISTS "correctionFields" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "IntakeTrainingExample_sessionId_idx" ON "IntakeTrainingExample"("sessionId");
CREATE INDEX IF NOT EXISTS "IntakeTrainingExample_hasUserCorrections_idx" ON "IntakeTrainingExample"("hasUserCorrections");
