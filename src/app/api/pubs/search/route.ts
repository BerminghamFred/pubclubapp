import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import { isPubOpenNow } from '@/utils/openingHours';

export const runtime = 'edge';

// Helper to check if a point is within bounds
function isInBounds(lat: number, lng: number, bbox: { west: number; south: number; east: number; north: number }): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

// Hash filter object for caching key
function hashFilters(filters: any): string {
  return JSON.stringify(filters);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse bounding box: west,south,east,north
    const bboxParam = searchParams.get('bbox');
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    
    // Parse filters
    const filtersParam = searchParams.get('filters');
    let filters: any = {};
    if (filtersParam) {
      try {
        filters = JSON.parse(decodeURIComponent(filtersParam));
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }

    // Filter pubs based on criteria
    let filtered = pubData.filter(pub => pub._internal?.lat && pub._internal?.lng);

    // Apply bounding box filter if provided
    if (bboxParam) {
      const [west, south, east, north] = bboxParam.split(',').map(Number);
      if (!isNaN(west) && !isNaN(south) && !isNaN(east) && !isNaN(north)) {
        const bbox = { west, south, east, north };
        filtered = filtered.filter(pub => 
          pub._internal?.lat && pub._internal?.lng &&
          isInBounds(pub._internal.lat, pub._internal.lng, bbox)
        );
      }
    }

    // Apply search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(pub => 
        pub.name.toLowerCase().includes(searchLower) ||
        pub.description?.toLowerCase().includes(searchLower) ||
        pub.area?.toLowerCase().includes(searchLower) ||
        pub.address?.toLowerCase().includes(searchLower)
      );
    }

    // Apply area filter
    if (filters.selectedArea && filters.selectedArea !== 'All Areas') {
      filtered = filtered.filter(pub => pub.area === filters.selectedArea);
    }

    // Apply amenities filter
    if (filters.selectedAmenities && filters.selectedAmenities.length > 0) {
      filtered = filtered.filter(pub => {
        return filters.selectedAmenities.every((amenity: string) => 
          pub.amenities?.includes(amenity) || pub.features?.includes(amenity)
        );
      });
    }

    // Apply rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(pub => (pub.rating || 0) >= filters.minRating);
    }

    // Apply opening hours filter
    if (filters.openingFilter === 'Open Now') {
      filtered = filtered.filter(pub => isPubOpenNow(pub.openingHours));
    }

    // Limit results
    const limitedResults = filtered.slice(0, limit);

    // Transform to lightweight pin format
    const items = limitedResults.map(pub => ({
      id: pub.id,
      name: pub.name,
      lat: pub._internal!.lat!,
      lng: pub._internal!.lng!,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      area: pub.area,
      type: pub.type,
      amenities: pub.amenities?.slice(0, 5) || [], // Only send first 5 for efficiency
      // Use cached photo proxy URL
      photo: pub._internal?.photo_name 
        ? `/api/photo-by-place?photo_name=${encodeURIComponent(pub._internal.photo_name)}&w=160`
        : pub._internal?.place_id
        ? `/api/photo-by-place?place_id=${encodeURIComponent(pub._internal.place_id)}&w=160`
        : null
    }));

    // Response with caching headers
    return NextResponse.json({
      total: filtered.length,
      items,
      nextCursor: null, // For future pagination support
      hasMore: filtered.length > limit
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min cache
      }
    });

  } catch (error) {
    console.error('Error in /api/pubs/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
