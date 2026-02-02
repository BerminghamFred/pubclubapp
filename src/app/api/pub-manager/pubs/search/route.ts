export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

// GET - Search pubs by name (for Connect flow). Returns id, name, slug, area only.
export async function GET(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, pubs: [] });
    }

    const searchLower = q.toLowerCase();
    const pubs = await prisma.pub.findMany({
      where: {
        name: { contains: searchLower, mode: 'insensitive' },
      },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        borough: { select: { name: true } },
        city: { select: { name: true } },
      },
    });

    const items = pubs.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      area: p.borough?.name || p.city?.name || '',
    }));

    return NextResponse.json({ success: true, pubs: items });
  } catch (error) {
    console.error('Pub search error:', error);
    return NextResponse.json(
      { success: false, message: 'Search failed.' },
      { status: 500 }
    );
  }
}
