import { NextRequest, NextResponse } from 'next/server';
import { searchPubs } from '@/lib/services/pubService';
import { isPubOpenNow } from '@/utils/openingHours';

// Use default Node.js runtime on Vercel (avoid explicit edge runtime)

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

    // Build search filters for database query
    const searchFilters: any = {
      area: filters.selectedArea,
      amenities: filters.selectedAmenities,
      searchTerm: filters.searchTerm,
    };

    // Parse bounding box if provided
    if (bboxParam) {
      const [west, south, east, north] = bboxParam.split(',').map(Number);
      if (!isNaN(west) && !isNaN(south) && !isNaN(east) && !isNaN(north)) {
        searchFilters.bbox = { west, south, east, north };
      }
    }

    // Get pubs from database
    let filtered = await searchPubs(filters.searchTerm, searchFilters);

    // Apply client-side filters that require additional processing
    // (rating, opening hours - these could be moved to DB query later)
    if (filters.minRating > 0) {
      filtered = filtered.filter(pub => (pub.rating || 0) >= filters.minRating);
    }

    // Apply opening hours filter
    if (filters.openingFilter === 'Open Now') {
      filtered = filtered.filter(pub => isPubOpenNow(pub.openingHours));
    }

    // Transform to full pub format (includes all fields needed for client-side filtering)
    const items = filtered.map(pub => ({
      id: pub.id,
      name: pub.name,
      description: pub.description || '',
      lat: pub._internal!.lat!,
      lng: pub._internal!.lng!,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      area: pub.area,
      type: pub.type,
      features: pub.features || [],
      address: pub.address,
      phone: pub.phone,
      website: pub.website,
      openingHours: pub.openingHours || '',
      amenities: pub.amenities || [],
      // Photo metadata for client-side rendering
      photo: buildPhotoProxyUrl(pub, 320),
      photoName: pub._internal?.photo_name || null,
      photoRef: pub._internal?.photo_reference || null,
      placeId: pub._internal?.place_id || null,
      // Include full _internal object for compatibility
      _internal: pub._internal,
    }));

    // Response with caching headers
    return NextResponse.json({
      total: filtered.length,
      items,
      nextCursor: null, // For future pagination support
      hasMore: false // Show all pubs, no pagination needed
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

function buildPhotoProxyUrl(pub: any, width: number): string | null {
  const params = new URLSearchParams({
    w: String(width),
  });

  const photoName = pub._internal?.photo_name;
  const placeId = pub._internal?.place_id;
  const photoRef = pub._internal?.photo_reference;

  // Priority 1: Use photo_name (Places API New)
  if (photoName) {
    params.set('photo_name', photoName);
    if (placeId) {
      params.set('place_id', placeId);
    }
    return `/api/photo-by-place?${params.toString()}`;
  }

  // Priority 2: Use place_id (Places API New - will fetch photo_name)
  if (placeId) {
    params.set('place_id', placeId);
    return `/api/photo-by-place?${params.toString()}`;
  }

  // Priority 3: Use photo_reference (legacy API - still supported)
  if (photoRef) {
    params.set('ref', photoRef);
    return `/api/photo-by-place?${params.toString()}`;
  }

  return null;
}
