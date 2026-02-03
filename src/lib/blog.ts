import { prisma } from '@/lib/prisma';

// Environment configuration
const BLOG_MIN_PUBLISHED = parseInt(process.env.BLOG_MIN_PUBLISHED || '3');

export interface PublishedBlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  slug: string;
  tags: string[];
  published: boolean;
  readingTime: number;
  imageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  suggestedLinkType?: string | null;
  suggestedLinkSlug?: string | null;
  suggestedLinkLabel?: string | null;
  mapConfig?: { enabled?: boolean; type?: string; slug?: string } | null;
}

function formatPostDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function mapDbPostToPublished(db: {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: Date | null;
  slug: string;
  tags: unknown;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  suggestedLinkType: string | null;
  suggestedLinkSlug: string | null;
  suggestedLinkLabel: string | null;
  mapConfig: unknown;
}): PublishedBlogPost {
  const tags = Array.isArray(db.tags) ? (db.tags as string[]) : [];
  const mapConfig = db.mapConfig && typeof db.mapConfig === 'object' ? (db.mapConfig as { enabled?: boolean; type?: string; slug?: string }) : null;
  const date = formatPostDate(db.publishedAt);
  return {
    id: db.id,
    title: db.title,
    excerpt: db.excerpt,
    content: db.content,
    author: db.author,
    date,
    slug: db.slug,
    tags,
    published: true,
    readingTime: Math.ceil(db.content.split(/\s+/).length / 200),
    imageUrl: db.imageUrl,
    metaTitle: db.metaTitle,
    metaDescription: db.metaDescription,
    suggestedLinkType: db.suggestedLinkType,
    suggestedLinkSlug: db.suggestedLinkSlug,
    suggestedLinkLabel: db.suggestedLinkLabel,
    mapConfig,
  };
}

// Helper function to get published posts count
export async function getPublishedPostsCount(): Promise<number> {
  return prisma.blogPost.count({ where: { published: true } });
}

// Helper function to get published posts with pagination
export async function getPublishedPosts({
  limit = 20,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}): Promise<PublishedBlogPost[]> {
  const rows = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    skip: offset,
    take: limit,
  });
  return rows.map(mapDbPostToPublished);
}

// Helper function to get a single published post by slug
export async function getPublishedPostBySlug(slug: string): Promise<PublishedBlogPost | null> {
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
  });
  if (!post) return null;
  return mapDbPostToPublished(post);
}

// Helper function to get related posts
export async function getRelatedPosts(currentSlug: string, limit: number = 3): Promise<PublishedBlogPost[]> {
  const posts = await getPublishedPosts({ limit: limit + 10 });
  const filtered = posts.filter((p) => p.slug !== currentSlug);
  return filtered.slice(0, limit);
}

// Get all published post slugs (for generateStaticParams)
export async function getPublishedSlugs(): Promise<string[]> {
  const rows = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

// Check if blog should show coming soon state
export async function shouldShowComingSoon(): Promise<boolean> {
  const count = await getPublishedPostsCount();
  return count < BLOG_MIN_PUBLISHED;
}

// Get blog configuration
export async function getBlogConfig(): Promise<{
  minPublished: number;
  publishedCount: number;
  shouldShowComingSoon: boolean;
}> {
  const publishedCount = await getPublishedPostsCount();
  return {
    minPublished: BLOG_MIN_PUBLISHED,
    publishedCount,
    shouldShowComingSoon: publishedCount < BLOG_MIN_PUBLISHED,
  };
}
