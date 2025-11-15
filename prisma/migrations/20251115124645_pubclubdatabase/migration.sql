-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boroughs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,

    CONSTRAINT "boroughs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "postcode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "priceRange" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "openingHours" TEXT,
    "photoUrl" TEXT,
    "managerEmail" TEXT,
    "managerPassword" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userReviewCount" INTEGER NOT NULL DEFAULT 0,
    "userRatingAvg" DOUBLE PRECISION,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "checkinCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_amenities" (
    "pubId" TEXT NOT NULL,
    "amenityId" INTEGER NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pub_amenities_pkey" PRIMARY KEY ("pubId","amenityId")
);

-- CreateTable
CREATE TABLE "pub_photos" (
    "id" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pub_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_managers" (
    "pubId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',

    CONSTRAINT "pub_managers_pkey" PRIMARY KEY ("pubId","managerId")
);

-- CreateTable
CREATE TABLE "manager_logins" (
    "id" TEXT NOT NULL,
    "managerId" TEXT,
    "pubId" TEXT,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_logins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'content_admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_page_view" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "pubId" TEXT,
    "areaSlug" TEXT,
    "ref" TEXT,
    "utm" JSONB,
    "device" TEXT,

    CONSTRAINT "events_page_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_search" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "resultsCount" INTEGER,

    CONSTRAINT "events_search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_filter_usage" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "filterKey" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER,

    CONSTRAINT "events_filter_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_cta_click" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "events_cta_click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_views_daily" (
    "id" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pub_views_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filters_daily" (
    "id" TEXT NOT NULL,
    "filterKey" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "filters_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searches_daily" (
    "id" TEXT NOT NULL,
    "cityId" INTEGER,
    "boroughId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "searches_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photos" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "reportedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "note" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_slots" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "amenitySlug" TEXT,
    "pubCount" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "lastViewed" TIMESTAMP(3),

    CONSTRAINT "homepage_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_slot_interactions" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_slot_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_featured_pubs" (
    "id" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_featured_pubs_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "area_featured_pubs_areaName_key" ON "area_featured_pubs"("areaName");

-- AddForeignKey
ALTER TABLE "boroughs" ADD CONSTRAINT "boroughs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pubs" ADD CONSTRAINT "pubs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pubs" ADD CONSTRAINT "pubs_boroughId_fkey" FOREIGN KEY ("boroughId") REFERENCES "boroughs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_amenities" ADD CONSTRAINT "pub_amenities_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_amenities" ADD CONSTRAINT "pub_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_photos" ADD CONSTRAINT "pub_photos_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_managers" ADD CONSTRAINT "pub_managers_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pub_managers" ADD CONSTRAINT "pub_managers_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "managers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_logins" ADD CONSTRAINT "manager_logins_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_logins" ADD CONSTRAINT "manager_logins_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_pubId_fkey" FOREIGN KEY ("pubId") REFERENCES "pubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_slot_interactions" ADD CONSTRAINT "homepage_slot_interactions_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "homepage_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
