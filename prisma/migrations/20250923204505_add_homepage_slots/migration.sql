-- CreateTable
CREATE TABLE "homepage_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "amenitySlug" TEXT,
    "pubCount" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "lastViewed" DATETIME
);

-- CreateTable
CREATE TABLE "homepage_slot_interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homepage_slot_interactions_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "homepage_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "homepage_slots_score_idx" ON "homepage_slots"("score");

-- CreateIndex
CREATE INDEX "homepage_slots_isActive_position_idx" ON "homepage_slots"("isActive", "position");

-- CreateIndex
CREATE UNIQUE INDEX "homepage_slots_areaSlug_amenitySlug_key" ON "homepage_slots"("areaSlug", "amenitySlug");

-- CreateIndex
CREATE INDEX "homepage_slot_interactions_slotId_idx" ON "homepage_slot_interactions"("slotId");

-- CreateIndex
CREATE INDEX "homepage_slot_interactions_sessionId_idx" ON "homepage_slot_interactions"("sessionId");
