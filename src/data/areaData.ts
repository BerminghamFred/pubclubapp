import { pubData } from './pubData';
import { generatePubSlug } from '@/utils/slugUtils';

export interface Area {
  name: string;
  slug: string;
  pubCount: number;
  topPubs: {
    id: string;
    name: string;
    url: string;
    image?: string;
    rating: number;
    reviewCount: number;
    priceRange: string;
    badges: string[];
    lat?: number;
    lng?: number;
  }[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  summary: string;
  isIndexable: boolean;
}

// Generate area slug from name
export function generateAreaSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

// Generate SEO summary for an area
export function generateAreaSummary(areaName: string, pubCount: number, topAmenities: string[]): string {
  const templates = [
    `Discover the best pubs in ${areaName}, home to ${pubCount} fantastic drinking establishments. From traditional British pubs with roaring fireplaces to modern gastropubs serving craft beer, ${areaName} offers something for every taste. Many venues feature ${topAmenities.slice(0, 2).join(' and ')}, making it perfect for both casual drinks and special occasions. Whether you're looking for a cozy corner pub or a lively bar with live music, ${areaName}'s pub scene delivers an authentic London experience.`,
    
    `${areaName} boasts an impressive collection of ${pubCount} pubs and bars, each offering its own unique character and atmosphere. The area is particularly known for ${topAmenities.slice(0, 2).join(' and ')}, attracting locals and visitors alike. From historic pubs dating back centuries to contemporary venues with innovative cocktail menus, ${areaName} provides a diverse drinking experience. The community-focused atmosphere and excellent transport links make it easy to explore the best pubs this area has to offer.`,
    
    `With ${pubCount} pubs to choose from, ${areaName} stands out as one of London's premier destinations for pub enthusiasts. The area's venues range from intimate neighborhood pubs to bustling bars, many featuring ${topAmenities.slice(0, 3).join(', ')}. Whether you're planning a weekend pub crawl or looking for the perfect spot for after-work drinks, ${areaName} delivers with its mix of traditional charm and modern amenities. The friendly local atmosphere and diverse selection ensure there's always something new to discover.`
  ];
  
  // Select template based on area name hash for consistency
  const hash = areaName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return templates[Math.abs(hash) % templates.length];
}

// Get top amenities for an area
export function getTopAmenitiesForArea(areaName: string): string[] {
  const areaPubs = pubData.filter(pub => pub.area === areaName);
  const amenityCount: { [key: string]: number } = {};
  
  areaPubs.forEach(pub => {
    if (pub.amenities) {
      pub.amenities.forEach(amenity => {
        amenityCount[amenity] = (amenityCount[amenity] || 0) + 1;
      });
    }
  });
  
  return Object.entries(amenityCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([amenity]) => amenity);
}

// Calculate bounds for an area
export function calculateAreaBounds(areaName: string) {
  const areaPubs = pubData.filter(pub => pub.area === areaName && pub._internal?.lat && pub._internal?.lng);
  
  if (areaPubs.length === 0) {
    // Default London bounds
    return {
      north: 51.7,
      south: 51.3,
      east: 0.3,
      west: -0.5
    };
  }
  
  const lats = areaPubs.map(pub => pub._internal!.lat!);
  const lngs = areaPubs.map(pub => pub._internal!.lng!);
  
  return {
    north: Math.max(...lats) + 0.01,
    south: Math.min(...lats) - 0.01,
    east: Math.max(...lngs) + 0.01,
    west: Math.min(...lngs) - 0.01
  };
}

// Generate area data
export function generateAreaData(areaName: string): Area {
  const areaPubs = pubData.filter(pub => pub.area === areaName);
  
  // Sort pubs by rating, then by review count
  const sortedPubs = areaPubs
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);
  
  const topAmenities = getTopAmenitiesForArea(areaName);
  const summary = generateAreaSummary(areaName, areaPubs.length, topAmenities);
  
  return {
    name: areaName,
    slug: generateAreaSlug(areaName),
    pubCount: areaPubs.length,
    topPubs: sortedPubs.map(pub => ({
      id: pub.id,
      name: pub.name,
      url: `/pubs/${generatePubSlug(pub.name, pub.id)}`,
      image: pub._internal?.photo_url,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      priceRange: '££', // Default for now
      badges: pub.amenities?.slice(0, 5) || [],
      lat: pub._internal?.lat,
      lng: pub._internal?.lng
    })),
    bounds: calculateAreaBounds(areaName),
    summary,
    isIndexable: areaPubs.length >= 10 // Quality bar: at least 10 pubs
  };
}

// Get all areas with their data
export function getAllAreas(): Area[] {
  const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(area => area && area.trim()))];
  return uniqueAreas.map(areaName => generateAreaData(areaName));
}

// Get area by slug
export function getAreaBySlug(slug: string): Area | null {
  const allAreas = getAllAreas();
  return allAreas.find(area => area.slug === slug) || null;
}

// Get all pubs for an area (for pagination)
export function getAllPubsForArea(areaName: string) {
  const areaPubs = pubData.filter(pub => pub.area === areaName);
  
  // Sort pubs by rating, then by review count
  return areaPubs
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    })
    .map(pub => ({
      id: pub.id,
      name: pub.name,
      url: `/pubs/${generatePubSlug(pub.name, pub.id)}`,
      image: pub._internal?.photo_url,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      priceRange: '££', // Default for now
      badges: pub.amenities?.slice(0, 5) || [],
      lat: pub._internal?.lat,
      lng: pub._internal?.lng
    }));
}

// Get areas for static generation (only indexable ones)
export function getIndexableAreas(): Area[] {
  return getAllAreas().filter(area => area.isIndexable);
}
