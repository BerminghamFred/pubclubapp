-- CreateTable
CREATE TABLE "area_featured_pubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaName" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "area_featured_pubs_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "area_featured_pubs_areaName_key" ON "area_featured_pubs"("areaName");
