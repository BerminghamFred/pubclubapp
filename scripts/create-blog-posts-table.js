/**
 * One-off script to create the blog_posts table when Prisma migrate deploy
 * fails (e.g. P3005 baseline). Run: node scripts/create-blog-posts-table.js
 *
 * Uses DATABASE_URL from .env. For Supabase, you can instead run the SQL
 * below in the Supabase SQL Editor.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createTable = `
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "imageUrl" TEXT,
  "suggestedLinkType" TEXT,
  "suggestedLinkSlug" TEXT,
  "suggestedLinkLabel" TEXT,
  "mapConfig" JSONB,
  "tags" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);
`;

const createIndex = `CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");`;

async function main() {
  try {
    await prisma.$executeRawUnsafe(createTable);
    await prisma.$executeRawUnsafe(createIndex);
    console.log('blog_posts table created (or already exists).');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
