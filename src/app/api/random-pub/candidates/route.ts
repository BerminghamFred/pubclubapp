import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import { isPubOpenNow } from '@/utils/openingHours';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const area = searchParams.get('area') || undefined;
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];
    const openNow = searchParams.get('open_now') === 'true';
    const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined;
    const excludeIds = searchParams.get('exclude_ids')?.split(',').filter(Boolean) || [];
    
    // Count pubs based on criteria (without loading full data)
    let candidateCount = 0;
    let availableCount = 0;
    
    for (const pub of pubData) {
      // Area filter
      if (area && !pub.area?.toLowerCase().includes(area.toLowerCase())) {
        continue;
      }
      
      // Amenity filters (AND logic)
      if (amenities.length > 0) {
        const hasAllAmenities = amenities.every(amenity => 
          pub.amenities?.includes(amenity)
        );
        if (!hasAllAmenities) continue;
      }
      
      // Rating filter
      if (minRating && pub.rating < minRating) {
        continue;
      }
      
      // Open now filter
      if (openNow && !isPubOpenNow(pub.openingHours)) {
        continue;
      }
      
      candidateCount++;
      
      // Check if available (not excluded)
      if (!excludeIds.includes(pub.id)) {
        availableCount++;
      }
    }
    
    const response = NextResponse.json({
      totalCandidates: candidateCount,
      availableCandidates: availableCount,
      excludedCount: candidateCount - availableCount,
      filters: {
        area,
        amenities,
        openNow,
        minRating,
        excludeIds
      },
      timestamp: new Date().toISOString()
    });
    
    // Add caching headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error counting candidates:', error);
    return NextResponse.json(
      { error: 'Failed to count candidates' },
      { status: 500 }
    );
  }
}
