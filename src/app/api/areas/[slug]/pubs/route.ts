import { NextRequest, NextResponse } from 'next/server';
import { getAreaBySlug } from '@/data/areaData';
import { pubData } from '@/data/pubData';
import { generatePubSlug } from '@/utils/slugUtils';

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
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filters = searchParams.get('filters')?.split(',') || [];
    
    // Get all pubs in the area
    let areaPubs = pubData.filter(pub => pub.area === area.name);
    
    // Apply filters if any
    if (filters.length > 0) {
      areaPubs = areaPubs.filter(pub => 
        pub.amenities && filters.some(filter => pub.amenities!.includes(filter))
      );
    }
    
    // Sort by rating, then by review count
    areaPubs.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });
    
    // Paginate
    const paginatedPubs = areaPubs.slice(offset, offset + limit);
    
    // Format response
    const pubs = paginatedPubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      url: `/pubs/${generatePubSlug(pub.name, pub.id)}`,
      image: pub._internal?.photo_url,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      priceRange: '££', // Default for now
      badges: pub.amenities?.slice(0, 5) || [],
      lat: pub._internal?.lat,
      lng: pub._internal?.lng,
      address: pub.address,
      phone: pub.phone,
      website: pub.website
    }));
    
    return NextResponse.json({
      pubs,
      total: areaPubs.length,
      hasMore: offset + limit < areaPubs.length,
      area: {
        name: area.name,
        slug: area.slug
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    });
  } catch (error) {
    console.error('Error fetching area pubs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
