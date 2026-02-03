export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllAreas } from '@/data/areaData';
import { AMENITY_FILTERS } from '@/data/amenityData';

function requireAdmin(session: unknown) {
  const user = session as { user?: { type?: string } };
  return user?.user?.type === 'admin';
}

// GET /api/admin/blog/options - Areas and amenities for suggested link / map dropdowns
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return ALL areas (not just indexable) for admin use
    const areas = getAllAreas().map((a) => ({ slug: a.slug, name: a.name }));
    const amenities = AMENITY_FILTERS.map((a) => ({ slug: a.slug, title: a.title }));

    return NextResponse.json({ areas, amenities });
  } catch (error) {
    console.error('Admin blog options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
