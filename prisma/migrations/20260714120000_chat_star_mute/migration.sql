-- CreateTable
CREATE TABLE IF NOT EXISTS "MessageStar" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageStar_pkey" PRIMARY KEY ("messageId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConversationMute" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMute_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MessageStar_userId_idx" ON "MessageStar"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConversationMute_userId_idx" ON "ConversationMute"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationMute" ADD CONSTRAINT "ConversationMute_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationMute" ADD CONSTRAINT "ConversationMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
