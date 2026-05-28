-- CreateTable
CREATE TABLE "IntakeMigrationEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeMigrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeMigrationEvent_type_idx" ON "IntakeMigrationEvent"("type");

-- CreateIndex
CREATE INDEX "IntakeMigrationEvent_createdAt_idx" ON "IntakeMigrationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "IntakeMigrationEvent_type_createdAt_idx" ON "IntakeMigrationEvent"("type", "createdAt");
