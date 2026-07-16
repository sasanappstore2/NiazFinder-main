-- CreateEnum
CREATE TYPE "NeedAccessStatus" AS ENUM ('PRIVATE', 'PUBLIC', 'PENDING_VERIFICATION', 'RESOLVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NeedChatSessionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "NeedAccessPhase" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "RagIndexSourceType" AS ENUM ('BUSINESS', 'NEED', 'SITE_KNOWLEDGE');

-- CreateEnum
CREATE TYPE "RagIndexOperation" AS ENUM ('UPSERT', 'DELETE');

-- CreateEnum
CREATE TYPE "RagIndexJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "CollaborationPropertyKind" AS ENUM ('APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CollaborationAreaBand" AS ENUM ('UNDER_80', 'BAND_80_120', 'BAND_120_180', 'OVER_180');

-- CreateEnum
CREATE TYPE "CollaborationBudgetBand" AS ENUM ('SALE_UNDER_3B', 'SALE_3_5B', 'SALE_5_8B', 'SALE_8_12B', 'SALE_OVER_12B', 'RENT_UNDER_10M', 'RENT_10_20M', 'RENT_20_40M', 'RENT_OVER_40M');

-- CreateEnum
CREATE TYPE "CollaborationPostIntent" AS ENUM ('CLIENT_REFERRAL', 'SEEK_PARTNER', 'CO_SHOWING');

-- CreateEnum
CREATE TYPE "CollaborationPostScope" AS ENUM ('REGIONAL', 'CROSS_REGIONAL');

-- CreateEnum
CREATE TYPE "CollaborationSubjectKind" AS ENUM ('CLIENT', 'PROPERTY', 'JOINT_VISIT');

-- DropIndex
DROP INDEX "ServiceRequest_map_browse_idx";

-- DropIndex
DROP INDEX "ServiceRequest_search_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "intake_category_routes_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "intake_rule_documents_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "locations_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "regional_filings_dataCompleteness_idx";

-- DropIndex
DROP INDEX "regional_filings_enrichedAt_idx";

-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingContentHash" TEXT,
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "searchEmbedding" vector(384),
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "MessageReaction" DROP CONSTRAINT "MessageReaction_pkey";

-- AlterTable
ALTER TABLE "NeedLeadOutreach" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "accessPhase" "NeedAccessPhase" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "feeDeductedAt" TIMESTAMP(3),
ADD COLUMN     "leadFeeAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundTransactionId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "walletTransactionId" TEXT,
ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "businessProfileId" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "embeddingContentHash" TEXT,
ADD COLUMN     "needAccessStatus" "NeedAccessStatus" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "pendingVerificationBusinessProfileId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBusinessProfileId" TEXT,
ADD COLUMN     "vipExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "VoiceCall" ALTER COLUMN "status" SET DEFAULT 'INITIATED';

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

-- CreateTable
CREATE TABLE "AgentUserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredCity" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastNeedHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentUserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_knowledge_chunks" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "section" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "route" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_index_jobs" (
    "id" TEXT NOT NULL,
    "sourceType" "RagIndexSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "operation" "RagIndexOperation" NOT NULL DEFAULT 'UPSERT',
    "status" "RagIndexJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_index_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConversationSummary" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedChatSession" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" "NeedChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptIdempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeedChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedResolutionDispute" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "claimantBusinessProfileId" TEXT NOT NULL,
    "selectedBusinessProfileId" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedResolutionDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalCollaborationPost" (
    "id" TEXT NOT NULL,
    "authorProfileId" TEXT NOT NULL,
    "intent" "CollaborationPostIntent" NOT NULL,
    "headline" TEXT NOT NULL,
    "note" TEXT,
    "scope" "CollaborationPostScope" NOT NULL DEFAULT 'REGIONAL',
    "city" TEXT,
    "neighborhood" TEXT,
    "neighborhoodId" TEXT,
    "targetCity" TEXT,
    "targetNeighborhood" TEXT,
    "subjectKind" "CollaborationSubjectKind",
    "dealType" TEXT,
    "propertyKind" "CollaborationPropertyKind",
    "areaBand" "CollaborationAreaBand",
    "budgetBand" "CollaborationBudgetBand",
    "targetAreasJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RegionalCollaborationPost_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "CcqsMetricSnapshot_pillar_bucketStart_idx" ON "CcqsMetricSnapshot"("pillar", "bucketStart");

-- CreateIndex
CREATE INDEX "CcqsMetricSnapshot_replayRunId_idx" ON "CcqsMetricSnapshot"("replayRunId");

-- CreateIndex
CREATE INDEX "CcqsAlertEvent_alertKey_firedAt_idx" ON "CcqsAlertEvent"("alertKey", "firedAt");

-- CreateIndex
CREATE INDEX "CcqsAlertEvent_severity_idx" ON "CcqsAlertEvent"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "AgentUserMemory_userId_key" ON "AgentUserMemory"("userId");

-- CreateIndex
CREATE INDEX "AgentUserMemory_preferredCity_idx" ON "AgentUserMemory"("preferredCity");

-- CreateIndex
CREATE INDEX "site_knowledge_chunks_sourceKey_idx" ON "site_knowledge_chunks"("sourceKey");

-- CreateIndex
CREATE INDEX "site_knowledge_chunks_isPublic_idx" ON "site_knowledge_chunks"("isPublic");

-- CreateIndex
CREATE INDEX "site_knowledge_chunks_route_idx" ON "site_knowledge_chunks"("route");

-- CreateIndex
CREATE UNIQUE INDEX "site_knowledge_chunks_sourceKey_contentHash_chunkIndex_key" ON "site_knowledge_chunks"("sourceKey", "contentHash", "chunkIndex");

-- CreateIndex
CREATE INDEX "rag_index_jobs_status_availableAt_idx" ON "rag_index_jobs"("status", "availableAt");

-- CreateIndex
CREATE INDEX "rag_index_jobs_sourceType_sourceId_idx" ON "rag_index_jobs"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "rag_index_jobs_lockedAt_idx" ON "rag_index_jobs"("lockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConversationSummary_conversationId_key" ON "AgentConversationSummary"("conversationId");

-- CreateIndex
CREATE INDEX "AgentConversationSummary_userId_idx" ON "AgentConversationSummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NeedChatSession_acceptIdempotencyKey_key" ON "NeedChatSession"("acceptIdempotencyKey");

-- CreateIndex
CREATE INDEX "NeedChatSession_requestId_idx" ON "NeedChatSession"("requestId");

-- CreateIndex
CREATE INDEX "NeedChatSession_businessUserId_idx" ON "NeedChatSession"("businessUserId");

-- CreateIndex
CREATE INDEX "NeedChatSession_customerUserId_idx" ON "NeedChatSession"("customerUserId");

-- CreateIndex
CREATE INDEX "NeedChatSession_conversationId_idx" ON "NeedChatSession"("conversationId");

-- CreateIndex
CREATE INDEX "NeedChatSession_status_idx" ON "NeedChatSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NeedChatSession_requestId_businessProfileId_key" ON "NeedChatSession"("requestId", "businessProfileId");

-- CreateIndex
CREATE INDEX "NeedResolutionDispute_requestId_idx" ON "NeedResolutionDispute"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "RegionalCollaborationPost_status_createdAt_idx" ON "RegionalCollaborationPost"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RegionalCollaborationPost_city_idx" ON "RegionalCollaborationPost"("city");

-- CreateIndex
CREATE INDEX "RegionalCollaborationPost_targetCity_idx" ON "RegionalCollaborationPost"("targetCity");

-- CreateIndex
CREATE INDEX "RegionalCollaborationPost_authorProfileId_idx" ON "RegionalCollaborationPost"("authorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "NeedLeadOutreach_idempotencyKey_key" ON "NeedLeadOutreach"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NeedLeadOutreach_businessProfileId_idx" ON "NeedLeadOutreach"("businessProfileId");

-- CreateIndex
CREATE INDEX "NeedLeadOutreach_accessPhase_idx" ON "NeedLeadOutreach"("accessPhase");

-- CreateIndex
CREATE INDEX "ServiceRequest_needAccessStatus_idx" ON "ServiceRequest"("needAccessStatus");

-- CreateIndex
CREATE INDEX "ServiceRequest_vipExpiresAt_idx" ON "ServiceRequest"("vipExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "CcqsReplayRun" ADD CONSTRAINT "CcqsReplayRun_engineVersionId_fkey" FOREIGN KEY ("engineVersionId") REFERENCES "CcqsEngineVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcqsComparisonRecord" ADD CONSTRAINT "CcqsComparisonRecord_replayRunId_fkey" FOREIGN KEY ("replayRunId") REFERENCES "CcqsReplayRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcqsGateVerdict" ADD CONSTRAINT "CcqsGateVerdict_replayRunId_fkey" FOREIGN KEY ("replayRunId") REFERENCES "CcqsReplayRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcqsGateVerdict" ADD CONSTRAINT "CcqsGateVerdict_gatePolicyId_fkey" FOREIGN KEY ("gatePolicyId") REFERENCES "CcqsGatePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUserMemory" ADD CONSTRAINT "AgentUserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversationSummary" ADD CONSTRAINT "AgentConversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedChatSession" ADD CONSTRAINT "NeedChatSession_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedChatSession" ADD CONSTRAINT "NeedChatSession_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedResolutionDispute" ADD CONSTRAINT "NeedResolutionDispute_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalCollaborationPost" ADD CONSTRAINT "RegionalCollaborationPost_authorProfileId_fkey" FOREIGN KEY ("authorProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

