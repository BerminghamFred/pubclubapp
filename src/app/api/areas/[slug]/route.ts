import { NextRequest, NextResponse } from 'next/server';
import { getAreaBySlug } from '@/data/areaData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const area = getAreaBySlug(resolvedParams.slug);
    
    if (!area) {
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(area, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching area:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
