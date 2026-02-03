export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function requireAdmin(session: unknown) {
  const user = session as { user?: { type?: string } };
  return user?.user?.type === 'admin';
}

// GET /api/admin/blog - List posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const published = searchParams.get('published');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: { published?: boolean } = {};
    if (published === 'true') where.published = true;
    if (published === 'false') where.published = false;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        author: p.author,
        published: p.published,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        imageUrl: p.imageUrl,
        suggestedLinkType: p.suggestedLinkType,
        suggestedLinkSlug: p.suggestedLinkSlug,
        suggestedLinkLabel: p.suggestedLinkLabel,
        mapConfig: p.mapConfig,
        tags: p.tags,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error('Admin blog list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const slug = (body.slug ?? '').trim() || slugify(body.title ?? '');
    if (!slug) {
      return NextResponse.json({ error: 'Slug or title required' }, { status: 400 });
    }

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
    }

    const tags = Array.isArray(body.tags) ? body.tags : (body.tags && String(body.tags).split(',').map((t: string) => t.trim()).filter(Boolean)) || [];
    const published = !!body.published;
    const publishedAt = published ? new Date() : null;

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title: body.title ?? 'Untitled',
        excerpt: body.excerpt ?? '',
        content: body.content ?? '',
        author: body.author ?? 'Pub Club',
        published,
        publishedAt,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        imageUrl: body.imageUrl ?? null,
        suggestedLinkType: body.suggestedLinkType ?? null,
        suggestedLinkSlug: body.suggestedLinkSlug ?? null,
        suggestedLinkLabel: body.suggestedLinkLabel ?? null,
        mapConfig: body.mapConfig ?? null,
        tags,
      },
    });

    return NextResponse.json({
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        author: post.author,
        published: post.published,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        imageUrl: post.imageUrl,
        suggestedLinkType: post.suggestedLinkType,
        suggestedLinkSlug: post.suggestedLinkSlug,
        suggestedLinkLabel: post.suggestedLinkLabel,
        mapConfig: post.mapConfig,
        tags: post.tags,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin blog create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '') || '';
}
