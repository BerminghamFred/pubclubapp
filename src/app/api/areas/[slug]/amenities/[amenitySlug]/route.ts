import { NextRequest, NextResponse } from 'next/server';
import { getAreaAmenityPage } from '@/data/amenityData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; amenitySlug: string }> }
) {
  try {
    const resolvedParams = await params;
    const pageData = getAreaAmenityPage(resolvedParams.slug, resolvedParams.amenitySlug);
    
    if (!pageData) {
      return NextResponse.json(
        { error: 'Area amenity page not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(pageData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching area amenity page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
