-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photos" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "reportedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reviews_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wishlist_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "note" TEXT,
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "checkins_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "postcode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "priceRange" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER,
    "openingHours" TEXT,
    "photoUrl" TEXT,
    "managerEmail" TEXT,
    "managerPassword" TEXT,
    "lastUpdated" DATETIME,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userReviewCount" INTEGER NOT NULL DEFAULT 0,
    "userRatingAvg" REAL,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "checkinCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "pubs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pubs_boroughId_fkey" FOREIGN KEY ("boroughId") REFERENCES "boroughs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pubs" ("address", "boroughId", "cityId", "createdAt", "description", "id", "lastUpdated", "lat", "lng", "managerEmail", "managerPassword", "name", "openingHours", "phone", "photoUrl", "postcode", "priceRange", "rating", "reviewCount", "slug", "updatedAt", "updatedBy", "website") SELECT "address", "boroughId", "cityId", "createdAt", "description", "id", "lastUpdated", "lat", "lng", "managerEmail", "managerPassword", "name", "openingHours", "phone", "photoUrl", "postcode", "priceRange", "rating", "reviewCount", "slug", "updatedAt", "updatedBy", "website" FROM "pubs";
DROP TABLE "pubs";
ALTER TABLE "new_pubs" RENAME TO "pubs";
CREATE UNIQUE INDEX "pubs_slug_key" ON "pubs"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "reviews_pubId_idx" ON "reviews"("pubId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_pubId_key" ON "reviews"("userId", "pubId");

-- CreateIndex
CREATE INDEX "wishlist_userId_idx" ON "wishlist"("userId");

-- CreateIndex
CREATE INDEX "wishlist_pubId_idx" ON "wishlist"("pubId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_pubId_key" ON "wishlist"("userId", "pubId");

-- CreateIndex
CREATE INDEX "checkins_userId_idx" ON "checkins"("userId");

-- CreateIndex
CREATE INDEX "checkins_pubId_idx" ON "checkins"("pubId");

-- CreateIndex
CREATE UNIQUE INDEX "checkins_userId_pubId_key" ON "checkins"("userId", "pubId");
