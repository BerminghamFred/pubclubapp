-- CreateTable
CREATE TABLE "upcoming_fixtures" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT,
    "startingAt" TIMESTAMP(3) NOT NULL,
    "channelSlug" TEXT,
    "channelName" TEXT NOT NULL,
    "channelLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upcoming_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upcoming_fixtures_startingAt_idx" ON "upcoming_fixtures"("startingAt");
