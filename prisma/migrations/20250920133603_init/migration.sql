-- CreateTable
CREATE TABLE "cities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "boroughs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    CONSTRAINT "boroughs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pubs" (
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
    CONSTRAINT "pubs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pubs_boroughId_fkey" FOREIGN KEY ("boroughId") REFERENCES "boroughs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "pub_amenities" (
    "pubId" TEXT NOT NULL,
    "amenityId" INTEGER NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY ("pubId", "amenityId"),
    CONSTRAINT "pub_amenities_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pub_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pub_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pubId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pub_photos_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "managers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pub_managers" (
    "pubId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',

    PRIMARY KEY ("pubId", "managerId"),
    CONSTRAINT "pub_managers_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pub_managers_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "managers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "manager_logins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT,
    "pubId" TEXT,
    "loggedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manager_logins_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "managers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "manager_logins_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'content_admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "admin_audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "events_page_view" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "pubId" TEXT,
    "areaSlug" TEXT,
    "ref" TEXT,
    "utm" JSONB,
    "device" TEXT
);

-- CreateTable
CREATE TABLE "events_search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "resultsCount" INTEGER
);

-- CreateTable
CREATE TABLE "events_filter_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "filterKey" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER
);

-- CreateTable
CREATE TABLE "events_cta_click" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "pub_views_daily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pubId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "filters_daily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filterKey" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "date" DATETIME NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "searches_daily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "date" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "boroughs_cityId_name_key" ON "boroughs"("cityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pubs_slug_key" ON "pubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_key_key" ON "amenities"("key");

-- CreateIndex
CREATE UNIQUE INDEX "managers_email_key" ON "managers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pub_views_daily_pubId_date_key" ON "pub_views_daily"("pubId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "filters_daily_filterKey_cityId_boroughId_date_key" ON "filters_daily"("filterKey", "cityId", "boroughId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "searches_daily_cityId_boroughId_date_key" ON "searches_daily"("cityId", "boroughId", "date");
