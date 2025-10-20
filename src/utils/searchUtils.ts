import { pubData } from '@/data/pubData';
import { getAllAreas } from '@/data/areaData';
import { AMENITY_FILTERS } from '@/data/amenityData';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'area' | 'amenity' | 'pub';
  icon: string;
  color: string;
  data?: any;
}

export interface SearchResult {
  areas: SearchSuggestion[];
  amenities: SearchSuggestion[];
  pubs: SearchSuggestion[];
}

// Get all searchable data
export function getSearchData(): { areas: string[], amenities: string[], pubs: string[] } {
  // Get all areas
  const areas = Array.from(new Set(pubData.map(pub => pub.area).filter(Boolean))).sort();
  
  // Get all unique amenities from pub data
  const allAmenities = new Set<string>();
  pubData.forEach(pub => {
    if (pub.amenities) {
      pub.amenities.forEach(amenity => allAmenities.add(amenity));
    }
  });
  const amenities = Array.from(allAmenities).sort();
  
  // Get all pub names (we'll use the full pub data in searchSuggestions)
  const pubs = pubData.map(pub => pub.name).sort();
  
  return { areas, amenities, pubs };
}

// Search function that returns suggestions based on query
export function searchSuggestions(query: string, limit: number = 8): SearchResult {
  if (!query || query.length < 2) {
    return { areas: [], amenities: [], pubs: [] };
  }
  
  const searchLower = query.toLowerCase();
  const { areas, amenities, pubs } = getSearchData();
  
  // Search areas
  const matchingAreas = areas
    .filter(area => area.toLowerCase().includes(searchLower))
    .slice(0, Math.ceil(limit / 3))
    .map(area => ({
      id: `area-${area}`,
      text: area,
      type: 'area' as const,
      icon: '📍',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      data: { area }
    }));
  
  // Search amenities
  const matchingAmenities = amenities
    .filter(amenity => amenity.toLowerCase().includes(searchLower))
    .slice(0, Math.ceil(limit / 3))
    .map(amenity => ({
      id: `amenity-${amenity}`,
      text: amenity,
      type: 'amenity' as const,
      icon: '🏷️',
      color: 'bg-green-100 text-green-800 border-green-200',
      data: { amenity }
    }));
  
  // Search pubs
  const matchingPubs = pubData
    .filter(pub => pub.name.toLowerCase().includes(searchLower))
    .slice(0, Math.ceil(limit / 3))
    .map(pub => ({
      id: `pub-${pub.id}`,
      text: pub.name,
      type: 'pub' as const,
      icon: '🍺',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      data: { pub: pub.name }
    }));
  
  return {
    areas: matchingAreas,
    amenities: matchingAmenities,
    pubs: matchingPubs
  };
}

// Get all suggestions for a query (combined and sorted by relevance)
export function getAllSuggestions(query: string, limit: number = 8): SearchSuggestion[] {
  const results = searchSuggestions(query, limit);
  const allSuggestions = [...results.areas, ...results.amenities, ...results.pubs];
  
  // Sort by relevance (exact matches first, then by length)
  return allSuggestions
    .sort((a, b) => {
      const aExact = a.text.toLowerCase() === query.toLowerCase();
      const bExact = b.text.toLowerCase() === query.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return a.text.length - b.text.length;
    })
    .slice(0, limit);
}

// Generate URL for search result
export function generateSearchUrl(selections: SearchSuggestion[]): string {
  const areas = selections.filter(s => s.type === 'area').map(s => s.data.area);
  const amenities = selections.filter(s => s.type === 'amenity').map(s => s.data.amenity);
  const pubs = selections.filter(s => s.type === 'pub').map(s => s.data.pub);
  
  const params = new URLSearchParams();
  
  if (areas.length > 0) {
    params.set('area', areas[0]); // Take first area
  }
  
  if (amenities.length > 0) {
    params.set('amenities', amenities.join(','));
  }
  
  if (pubs.length > 0) {
    params.set('search', pubs[0]); // Take first pub
  }
  
  const queryString = params.toString();
  return `/pubs${queryString ? `?${queryString}` : ''}`;
}
