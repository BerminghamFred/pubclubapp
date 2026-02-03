export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function requireAdmin(session: unknown) {
  const user = session as { user?: { type?: string } };
  return user?.user?.type === 'admin';
}

// GET /api/admin/blog/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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
    console.error('Admin blog get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/blog/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const slug = (body.slug ?? existing.slug).trim();
    if (slug !== existing.slug) {
      const duplicate = await prisma.blogPost.findUnique({ where: { slug } });
      if (duplicate) {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
      }
    }

    const tags = Array.isArray(body.tags)
      ? body.tags
      : body.tags != null
        ? String(body.tags).split(',').map((t: string) => t.trim()).filter(Boolean)
        : (existing.tags as string[]);
    const published = body.published !== undefined ? !!body.published : existing.published;
    const publishedAt = published && !existing.publishedAt ? new Date() : existing.publishedAt;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        slug,
        title: body.title ?? existing.title,
        excerpt: body.excerpt ?? existing.excerpt,
        content: body.content ?? existing.content,
        author: body.author ?? existing.author,
        published,
        publishedAt,
        metaTitle: body.metaTitle !== undefined ? body.metaTitle : existing.metaTitle,
        metaDescription: body.metaDescription !== undefined ? body.metaDescription : existing.metaDescription,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
        suggestedLinkType: body.suggestedLinkType !== undefined ? body.suggestedLinkType : existing.suggestedLinkType,
        suggestedLinkSlug: body.suggestedLinkSlug !== undefined ? body.suggestedLinkSlug : existing.suggestedLinkSlug,
        suggestedLinkLabel: body.suggestedLinkLabel !== undefined ? body.suggestedLinkLabel : existing.suggestedLinkLabel,
        mapConfig: body.mapConfig !== undefined ? body.mapConfig : existing.mapConfig,
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
    console.error('Admin blog update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin blog delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
