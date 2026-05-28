-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN "leadAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "attachmentUrls" TEXT NOT NULL DEFAULT '[]',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("attachmentUrls", "content", "conversationId", "createdAt", "id", "isRead", "readAt", "senderId", "type") SELECT "attachmentUrls", "content", "conversationId", "createdAt", "id", "isRead", "readAt", "senderId", "type" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_isRead_idx" ON "Message"("isRead");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "NeedLeadOutreach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "matchScore" REAL NOT NULL DEFAULT 0,
    "matchReasonFa" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "skipReason" TEXT,
    "conversationId" TEXT,
    "introMessageId" TEXT,
    "cardMessageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NeedLeadOutreach_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NeedLeadOutreach_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NeedLeadOutreach_requestId_businessUserId_key" ON "NeedLeadOutreach"("requestId", "businessUserId");
CREATE INDEX "NeedLeadOutreach_businessUserId_idx" ON "NeedLeadOutreach"("businessUserId");
CREATE INDEX "NeedLeadOutreach_requestId_idx" ON "NeedLeadOutreach"("requestId");
CREATE INDEX "NeedLeadOutreach_status_idx" ON "NeedLeadOutreach"("status");
CREATE INDEX "NeedLeadOutreach_createdAt_idx" ON "NeedLeadOutreach"("createdAt");
