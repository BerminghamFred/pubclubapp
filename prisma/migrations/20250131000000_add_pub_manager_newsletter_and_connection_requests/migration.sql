-- CreateTable
CREATE TABLE "pub_manager_newsletter" (
    "id" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "pubName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pub_manager_newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pub_manager_connection_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pubId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pub_manager_connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pub_manager_newsletter_pubId_key" ON "pub_manager_newsletter"("pubId");

-- CreateIndex
CREATE UNIQUE INDEX "pub_manager_connection_requests_email_pubId_key" ON "pub_manager_connection_requests"("email", "pubId");
