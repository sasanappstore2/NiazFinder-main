-- CreateTable
CREATE TABLE "NeedBrowseAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "browsePath" TEXT NOT NULL,
    "categorySlug" TEXT,
    "citySlugs" TEXT NOT NULL DEFAULT '[]',
    "filtersJson" TEXT NOT NULL DEFAULT '{}',
    "searchQuery" TEXT,
    "fingerprint" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeedBrowseAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeedBrowseAlert_userId_active_idx" ON "NeedBrowseAlert"("userId", "active");

-- CreateIndex
CREATE INDEX "NeedBrowseAlert_categorySlug_idx" ON "NeedBrowseAlert"("categorySlug");

-- CreateIndex
CREATE INDEX "NeedBrowseAlert_fingerprint_idx" ON "NeedBrowseAlert"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "NeedBrowseAlert_userId_fingerprint_key" ON "NeedBrowseAlert"("userId", "fingerprint");

-- AddForeignKey
ALTER TABLE "NeedBrowseAlert" ADD CONSTRAINT "NeedBrowseAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
