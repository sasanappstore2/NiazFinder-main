-- Pin messages in conversations (align with chat-service schema)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "pinnedBy" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Message_isPinned_idx" ON "Message"("isPinned");
