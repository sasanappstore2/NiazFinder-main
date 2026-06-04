-- Business contact team: members, contact points, invites, conversation context

CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE "BusinessMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'REMOVED');
CREATE TYPE "BusinessInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'STAFF',
    "status" "BusinessMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedByUserId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessContactPoint" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "assignedUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessContactPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessMemberInvite" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL,
    "status" "BusinessInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMemberInvite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Conversation" ADD COLUMN "businessProfileId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "contactPointId" TEXT;

CREATE UNIQUE INDEX "BusinessMember_profileId_userId_key" ON "BusinessMember"("profileId", "userId");
CREATE INDEX "BusinessMember_profileId_status_idx" ON "BusinessMember"("profileId", "status");
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

CREATE UNIQUE INDEX "BusinessContactPoint_profileId_slug_key" ON "BusinessContactPoint"("profileId", "slug");
CREATE INDEX "BusinessContactPoint_profileId_isPublished_sortOrder_idx" ON "BusinessContactPoint"("profileId", "isPublished", "sortOrder");
CREATE INDEX "BusinessContactPoint_assignedUserId_idx" ON "BusinessContactPoint"("assignedUserId");

CREATE UNIQUE INDEX "BusinessMemberInvite_token_key" ON "BusinessMemberInvite"("token");
CREATE INDEX "BusinessMemberInvite_profileId_status_idx" ON "BusinessMemberInvite"("profileId", "status");
CREATE INDEX "BusinessMemberInvite_phone_status_idx" ON "BusinessMemberInvite"("phone", "status");

CREATE INDEX "Conversation_businessProfileId_idx" ON "Conversation"("businessProfileId");
CREATE INDEX "Conversation_contactPointId_idx" ON "Conversation"("contactPointId");
CREATE INDEX "Conversation_userId1_userId2_requestId_contactPointId_idx" ON "Conversation"("userId1", "userId2", "requestId", "contactPointId");

ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessContactPoint" ADD CONSTRAINT "BusinessContactPoint_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessContactPoint" ADD CONSTRAINT "BusinessContactPoint_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessMemberInvite" ADD CONSTRAINT "BusinessMemberInvite_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMemberInvite" ADD CONSTRAINT "BusinessMemberInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMemberInvite" ADD CONSTRAINT "BusinessMemberInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactPointId_fkey" FOREIGN KEY ("contactPointId") REFERENCES "BusinessContactPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: owner member + default «مدیریت» contact per existing profile
INSERT INTO "BusinessMember" ("id", "profileId", "userId", "role", "status", "joinedAt", "createdAt", "updatedAt")
SELECT
  'bm_' || substr(md5("id" || '-owner'), 1, 24),
  "id",
  "userId",
  'OWNER'::"BusinessMemberRole",
  'ACTIVE'::"BusinessMemberStatus",
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "BusinessProfile"
WHERE NOT EXISTS (
  SELECT 1 FROM "BusinessMember" bm WHERE bm."profileId" = "BusinessProfile"."id" AND bm."userId" = "BusinessProfile"."userId"
);

INSERT INTO "BusinessContactPoint" (
  "id", "profileId", "label", "slug", "assignedUserId",
  "chatEnabled", "voiceEnabled", "isDefault", "sortOrder", "isPublished",
  "createdAt", "updatedAt"
)
SELECT
  'bcp_' || substr(md5("id" || '-default'), 1, 24),
  "id",
  'مدیریت',
  'management',
  "userId",
  COALESCE("chatEnabled", true),
  true,
  true,
  0,
  true,
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "BusinessProfile"
WHERE NOT EXISTS (
  SELECT 1 FROM "BusinessContactPoint" cp WHERE cp."profileId" = "BusinessProfile"."id" AND cp."isDefault" = true
);
