import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pubData } from '@/data/pubData';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique areas from pub data
    const areaSet = new Set<string>();
    const areaCounts = new Map<string, number>();

    pubData.forEach(pub => {
      if (pub.area) {
        areaSet.add(pub.area);
        areaCounts.set(pub.area, (areaCounts.get(pub.area) || 0) + 1);
      }
    });

    // Convert to array and sort by pub count (descending), then by name
    const areas = Array.from(areaSet)
      .sort((a, b) => {
        const countA = areaCounts.get(a) || 0;
        const countB = areaCounts.get(b) || 0;
        if (countA !== countB) {
          return countB - countA; // Sort by count first
        }
        return a.localeCompare(b); // Then by name
      });

    return NextResponse.json({ 
      areas,
      total: areas.length,
      areaCounts: Object.fromEntries(areaCounts)
    });

  } catch (error) {
    console.error('Error fetching admin areas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch areas' },
      { status: 500 }
    );
  }
}
