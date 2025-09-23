import { NextRequest, NextResponse } from 'next/server';
import { getAllAreas } from '@/data/areaData';
import { AMENITY_FILTERS } from '@/data/amenityData';
import { pubData } from '@/data/pubData';

// Check if a pub matches an amenity filter
function pubMatchesAmenity(pub: any, amenitySlug: string): boolean {
  if (!pub.amenities) return false;
  
  // Find the amenity filter for this slug
  const amenityFilter = AMENITY_FILTERS.find(a => a.slug === amenitySlug);
  if (!amenityFilter) return false;
  
  // Check if any pub amenity matches the search terms
  return pub.amenities.some((amenityName: string) => 
    amenityFilter.searchTerms.some((term: string) => 
      amenityName.toLowerCase().includes(term.toLowerCase())
    )
  );
}

// Get all possible area × amenity combinations that have pages
export async function GET(request: NextRequest) {
  try {
    const allAreas = getAllAreas();
    const validAreas = allAreas.filter(area => area.pubCount >= 10);
    
    const candidates: any[] = [];
    
    for (const area of validAreas) {
      for (const amenity of AMENITY_FILTERS) {
        const matchingPubs = pubData.filter(pub => 
          pub.area === area.name && 
          pubMatchesAmenity(pub, amenity.slug)
        );
        
        if (matchingPubs.length >= 3) {
          candidates.push({
            areaSlug: area.slug,
            amenitySlug: amenity.slug,
            areaName: area.name,
            amenityTitle: amenity.title,
            amenityDescription: amenity.description,
            pubCount: matchingPubs.length,
            href: `/area/${area.slug}/${amenity.slug}`,
            icon: getAmenityIcon(amenity.slug)
          });
        }
      }
    }
    
    // Sort by pub count (descending)
    candidates.sort((a, b) => b.pubCount - a.pubCount);
    
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}

// Get amenity icon
function getAmenityIcon(amenitySlug: string): string {
  const icons: Record<string, string> = {
    'sunday-roast': '🍖',
    'dog-friendly': '🐕',
    'beer-garden': '🌳',
    'sky-sports': '📺',
    'bottomless-brunch': '🥂',
    'cocktails': '🍸',
    'pub-quiz': '🧠',
    'live-music': '🎵',
    'real-ale-craft-beer': '🍺',
    'pool-table-darts': '🎯'
  };
  
  return icons[amenitySlug] || '🍺';
}
