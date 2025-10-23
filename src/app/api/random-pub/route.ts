import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import { isPubOpenNow } from '@/utils/openingHours';

type SearchSelection = 
  | { type: 'area'; data: { area: string } }
  | { type: 'amenity'; data: { amenity: string } }
  | { type: 'pub'; data: { pub: string } };

interface RandomPubFilters {
  area?: string;
  amenities?: string[];
  openNow?: boolean;
  minRating?: number;
  excludeIds?: string[];
  searchSelections?: SearchSelection[];
}

// Weighted random selection using crypto RNG
function selectRandomPub(pubs: any[], excludeIds: string[] = []): any | null {
  if (pubs.length === 0) return null;
  
  // Filter out excluded pubs
  const availablePubs = pubs.filter(pub => !excludeIds.includes(pub.id));
  if (availablePubs.length === 0) return null;
  
  // Calculate weights for each pub
  const weightedPubs = availablePubs.map(pub => {
    let weight = 1.0; // Base weight
    
    // Rating boost
    if (pub.rating >= 4.5) weight += 0.05;
    else if (pub.rating >= 4.0) weight += 0.03;
    else if (pub.rating >= 3.5) weight += 0.01;
    
    // Review count boost
    if (pub.reviewCount && pub.reviewCount >= 100) weight += 0.02;
    else if (pub.reviewCount && pub.reviewCount >= 50) weight += 0.01;
    
    return { ...pub, weight };
  });
  
  // Calculate total weight
  const totalWeight = weightedPubs.reduce((sum, pub) => sum + pub.weight, 0);
  
  // Generate random number using crypto RNG
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const random = array[0] / (0xffffffff + 1);
  
  // Roulette wheel selection
  let currentWeight = 0;
  const target = random * totalWeight;
  
  for (const pub of weightedPubs) {
    currentWeight += pub.weight;
    if (currentWeight >= target) {
      return pub;
    }
  }
  
  // Fallback to last pub
  return weightedPubs[weightedPubs.length - 1];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: RandomPubFilters = {
      area: searchParams.get('area') || undefined,
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
      openNow: searchParams.get('open_now') === 'true',
      minRating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
      excludeIds: searchParams.get('exclude_ids')?.split(',').filter(Boolean) || [],
      searchSelections: searchParams.get('search_selections') 
        ? (JSON.parse(searchParams.get('search_selections')!) as SearchSelection[])
        : []
    };
    
    // Filter pubs based on criteria
    let filteredPubs = pubData.filter(pub => {
      // Area filter
      if (filters.area && !pub.area?.toLowerCase().includes(filters.area.toLowerCase())) {
        return false;
      }
      
      // Amenity filters (AND logic)
      if (filters.amenities && filters.amenities.length > 0) {
        const hasAllAmenities = filters.amenities.every(amenity => 
          pub.amenities?.includes(amenity)
        );
        if (!hasAllAmenities) return false;
      }
      
      // Rating filter
      if (filters.minRating && pub.rating < filters.minRating) {
        return false;
      }
      
      // Open now filter
      if (filters.openNow && !isPubOpenNow(pub.openingHours)) {
        return false;
      }
      
      // Search selections filter (from SearchBar)
      if (filters.searchSelections && filters.searchSelections.length > 0) {
        const matchesSearchSelections = filters.searchSelections.every((selection: SearchSelection) => {
          switch (selection.type) {
            case 'area':
              return pub.area === selection.data.area;
            case 'amenity':
              return pub.amenities?.includes(selection.data.amenity) || pub.features?.includes(selection.data.amenity);
            case 'pub':
              return pub.name.toLowerCase().includes(selection.data.pub.toLowerCase());
            default:
              return true;
          }
        });
        if (!matchesSearchSelections) return false;
      }
      
      return true;
    });
    
    if (filteredPubs.length === 0) {
      return NextResponse.json(
        { error: 'No pubs match your current filters' },
        { status: 404 }
      );
    }
    
    // Select random pub
    const selectedPub = selectRandomPub(filteredPubs, filters.excludeIds);
    
    if (!selectedPub) {
      return NextResponse.json(
        { error: 'No available pubs after exclusions' },
        { status: 404 }
      );
    }
    
    // Return the selected pub with metadata
    const response = NextResponse.json({
      pub: selectedPub,
      totalCandidates: filteredPubs.length,
      availableAfterExclusions: filteredPubs.filter(pub => !filters.excludeIds?.includes(pub.id)).length,
      filters: filters,
      timestamp: new Date().toISOString()
    });
    
    // Add caching headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error selecting random pub:', error);
    return NextResponse.json(
      { error: 'Failed to select random pub' },
      { status: 500 }
    );
  }
}
