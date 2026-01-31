import { pubData } from './pubData';
import { generatePubSlug } from '@/utils/slugUtils';

export interface AmenityFilter {
  slug: string;
  title: string;
  description: string;
  searchTerms: string[];
}

export interface AreaAmenityPage {
  areaName: string;
  areaSlug: string;
  amenitySlug: string;
  amenityTitle: string;
  pageTitle: string;
  description: string;
  matchingPubs: {
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
    _internal?: {
      place_id?: string;
      photo_name?: string;
      photo_reference?: string;
    };
  }[];
  totalPubs: number;
  matchingCount: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  isIndexable: boolean;
}

// Define the 10 amenity filters
export const AMENITY_FILTERS: AmenityFilter[] = [
  {
    slug: 'sunday-roast',
    title: 'Sunday roast',
    description: 'Traditional Sunday roasts with all the trimmings',
    searchTerms: ['sunday roast', 'roast dinner', 'sunday lunch', 'roast beef', 'yorkshire pudding']
  },
  {
    slug: 'dog-friendly',
    title: 'Dog-friendly',
    description: 'Pubs that welcome dogs',
    searchTerms: ['dog friendly', 'dogs welcome', 'pet friendly', 'canine', 'pets allowed']
  },
  {
    slug: 'beer-garden',
    title: 'Beer garden',
    description: 'Pubs with outdoor beer gardens',
    searchTerms: ['beer garden', 'outdoor seating', 'garden', 'patio', 'terrace', 'outdoor area']
  },
  {
    slug: 'sky-sports',
    title: 'Sky Sports',
    description: 'Pubs showing Sky Sports',
    searchTerms: ['sky sports', 'sports', 'football', 'premier league', 'sports bar', 'big screen']
  },
  {
    slug: 'tnt-sports',
    title: 'TNT Sports',
    description: 'Pubs showing TNT Sports',
    searchTerms: ['tnt sports', 'bt sport', 'sports', 'football', 'premier league', 'sports bar', 'big screen']
  },
  {
    slug: 'terrestrial-tv',
    title: 'Terrestrial TV',
    description: 'Pubs showing Terrestrial TV (BBC, ITV, Channel 4)',
    searchTerms: ['six nations', 'bbc', 'itv', 'terrestrial', 'channel 4', 'free to air']
  },
  {
    slug: 'bottomless-brunch',
    title: 'Bottomless brunch',
    description: 'Bottomless brunch experiences',
    searchTerms: ['bottomless brunch', 'brunch', 'bottomless', 'unlimited drinks', 'brunch deal']
  },
  {
    slug: 'cocktails',
    title: 'Cocktails',
    description: 'Pubs with great cocktail menus',
    searchTerms: ['cocktails', 'cocktail', 'mixology', 'craft cocktails', 'specialty drinks']
  },
  {
    slug: 'pub-quiz',
    title: 'Pub quiz',
    description: 'Pubs with regular quiz nights',
    searchTerms: ['pub quiz', 'quiz night', 'trivia', 'quiz', 'trivia night']
  },
  {
    slug: 'live-music',
    title: 'Live music',
    description: 'Pubs with live music events',
    searchTerms: ['live music', 'live band', 'music', 'entertainment', 'acoustic', 'gig']
  },
  {
    slug: 'real-ale-craft-beer',
    title: 'Real ale & craft beer',
    description: 'Pubs specializing in real ale and craft beer',
    searchTerms: ['real ale', 'craft beer', 'microbrewery', 'local beer', 'ale', 'brewery', 'cask ale']
  },
  {
    slug: 'pool-table-darts',
    title: 'Pool tables & darts',
    description: 'Pubs with pool tables and darts',
    searchTerms: ['pool table', 'darts', 'pool', 'dartboard', 'games', 'snooker']
  }
];

// Map amenity slugs to their primary filter name for URL parameters
export function getAmenityFilterName(amenitySlug: string): string {
  const mapping: { [key: string]: string } = {
    'sunday-roast': 'Sunday Roast',
    'dog-friendly': 'Dog Friendly',
    'beer-garden': 'Beer Garden',
    'sky-sports': 'Sky Sports',
    'tnt-sports': 'TNT Sports',
    'terrestrial-tv': 'Terrestrial TV',
    'bottomless-brunch': 'Bottomless Brunch',
    'cocktails': 'Cocktails',
    'pub-quiz': 'Pub Quiz',
    'live-music': 'Live Music',
    'real-ale-craft-beer': 'Real Ale', // Using the first primary term
    'pool-table-darts': 'Pool Table' // Using the first primary term
  };
  return mapping[amenitySlug] || 'Cocktails'; // Fallback
}

// Generate area slug (reuse existing function)
function generateAreaSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

// Check if a pub matches an amenity filter
function pubMatchesAmenity(pub: any, amenity: AmenityFilter): boolean {
  if (!pub.amenities) return false;
  
  // Check if any amenity matches the search terms
  return pub.amenities.some((amenityName: string) => 
    amenity.searchTerms.some(term => 
      amenityName.toLowerCase().includes(term.toLowerCase())
    )
  );
}

// Calculate bounds for matching pubs
function calculateAmenityBounds(areaName: string, matchingPubs: any[]) {
  const pubsWithCoords = matchingPubs.filter(pub => pub.lat && pub.lng);
  
  if (pubsWithCoords.length === 0) {
    // Fallback to area bounds
    const allAreaPubs = pubData.filter(pub => pub.area === areaName && pub._internal?.lat && pub._internal?.lng);
    if (allAreaPubs.length === 0) {
      return {
        north: 51.7,
        south: 51.3,
        east: 0.3,
        west: -0.5
      };
    }
    
    const lats = allAreaPubs.map(pub => pub._internal!.lat!);
    const lngs = allAreaPubs.map(pub => pub._internal!.lng!);
    
    return {
      north: Math.max(...lats) + 0.01,
      south: Math.min(...lats) - 0.01,
      east: Math.max(...lngs) + 0.01,
      west: Math.min(...lngs) - 0.01
    };
  }
  
  const lats = pubsWithCoords.map(pub => pub.lat);
  const lngs = pubsWithCoords.map(pub => pub.lng);
  
  return {
    north: Math.max(...lats) + 0.01,
    south: Math.min(...lats) - 0.01,
    east: Math.max(...lngs) + 0.01,
    west: Math.min(...lngs) - 0.01
  };
}

// Generate area+amenity page data
export function generateAreaAmenityData(areaName: string, amenitySlug: string): AreaAmenityPage | null {
  const amenity = AMENITY_FILTERS.find(a => a.slug === amenitySlug);
  if (!amenity) return null;
  
  const areaPubs = pubData.filter(pub => pub.area === areaName);
  if (areaPubs.length <= 10) return null; // Only generate for areas with >10 pubs
  
  const matchingPubs = areaPubs.filter(pub => pubMatchesAmenity(pub, amenity));
  
  // Sort by rating, then by review count
  const sortedMatchingPubs = matchingPubs
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    })
    // Don't slice here - we'll handle pagination in the component
  
  const areaSlug = generateAreaSlug(areaName);
  const pageTitle = `Best ${amenity.title} pubs in ${areaName}`;
  
  return {
    areaName,
    areaSlug,
    amenitySlug,
    amenityTitle: amenity.title,
    pageTitle,
    description: generateAmenityDescription(areaName, amenity, matchingPubs.length, areaPubs.length),
    matchingPubs: sortedMatchingPubs.map(pub => ({
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
      _internal: {
        place_id: pub._internal?.place_id,
        photo_name: pub._internal?.photo_name,
        photo_reference: pub._internal?.photo_reference
      }
    })),
    totalPubs: areaPubs.length,
    matchingCount: matchingPubs.length,
    bounds: calculateAmenityBounds(areaName, sortedMatchingPubs),
    isIndexable: areaPubs.length > 10 // Quality bar: area must have >10 pubs total
  };
}

// Generate unique SEO descriptions for amenity pages
function generateAmenityDescription(areaName: string, amenity: AmenityFilter, matchingCount: number, totalPubs: number): string {
  const templates = [
    `${areaName} has ${totalPubs} pubs, with ${matchingCount} great options for ${amenity.title.toLowerCase()}. From traditional venues to modern gastropubs, expect ${getAmenityBenefits(amenity.slug)[0]} and ${getAmenityBenefits(amenity.slug)[1]}. Looking for alternatives? Try nearby areas or use our filters to find ${getRelatedAmenities(amenity.slug)[0]} or ${getRelatedAmenities(amenity.slug)[1]} near you.`,
    
    `Discover the best ${amenity.title.toLowerCase()} pubs in ${areaName}, where ${matchingCount} venues offer ${getAmenityBenefits(amenity.slug)[0]} and ${getAmenityBenefits(amenity.slug)[1]}. Whether you're after a cozy local or a bustling bar, ${areaName}'s pub scene delivers quality ${amenity.title.toLowerCase()} experiences. Use our map and filters to explore all ${totalPubs} pubs in the area.`,
    
    `With ${matchingCount} ${amenity.title.toLowerCase()} pubs to choose from, ${areaName} stands out for ${getAmenityBenefits(amenity.slug)[0]} and ${getAmenityBenefits(amenity.slug)[1]}. From historic establishments to contemporary venues, the area offers diverse options for ${amenity.title.toLowerCase()} enthusiasts. Explore our comprehensive guide to all ${totalPubs} pubs in ${areaName}.`
  ];
  
  // Select template based on area name hash for consistency
  const hash = areaName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return templates[Math.abs(hash) % templates.length];
}

// Get amenity-specific benefits
function getAmenityBenefits(amenitySlug: string): string[] {
  const benefits: { [key: string]: string[] } = {
    'sunday-roast': ['traditional roasts', 'yorkshire puddings', 'gravy'],
    'dog-friendly': ['welcoming atmosphere', 'water bowls', 'dog treats'],
    'beer-garden': ['outdoor seating', 'fresh air', 'sunny spots'],
    'sky-sports': ['big screens', 'match atmosphere', 'sports viewing'],
    'tnt-sports': ['big screens', 'match atmosphere', 'sports viewing'],
    'terrestrial-tv': ['free-to-air sport', 'Six Nations', 'BBC and ITV'],
    'bottomless-brunch': ['unlimited drinks', 'brunch classics', 'weekend vibes'],
    'cocktails': ['craft cocktails', 'mixology', 'premium spirits'],
    'pub-quiz': ['quiz nights', 'team games', 'prizes'],
    'live-music': ['live bands', 'acoustic sets', 'entertainment'],
    'real-ale-craft-beer': ['local brews', 'cask ales', 'beer expertise'],
    'pool-table-darts': ['games', 'competition', 'social fun']
  };
  return benefits[amenitySlug] || ['great atmosphere', 'quality service'];
}

// Get related amenities for internal linking
function getRelatedAmenities(amenitySlug: string): string[] {
  const related: { [key: string]: string[] } = {
    'sunday-roast': ['dog-friendly pubs', 'beer gardens'],
    'dog-friendly': ['beer gardens', 'real ale pubs'],
    'beer-garden': ['dog-friendly pubs', 'cocktail bars'],
    'sky-sports': ['pub quiz', 'live music'],
    'tnt-sports': ['sky sports', 'pub quiz'],
    'terrestrial-tv': ['sky sports', 'tnt sports'],
    'bottomless-brunch': ['cocktails', 'sunday roast'],
    'cocktails': ['live music', 'bottomless brunch'],
    'pub-quiz': ['sky sports', 'real ale'],
    'live-music': ['cocktails', 'pub quiz'],
    'real-ale-craft-beer': ['pub quiz', 'dog-friendly'],
    'pool-table-darts': ['sky sports', 'live music']
  };
  return related[amenitySlug] || ['great pubs', 'local venues'];
}

// Get all area+amenity combinations for static generation
export function getAllAreaAmenityCombinations(): Array<{ areaSlug: string; amenitySlug: string }> {
  const combinations: Array<{ areaSlug: string; amenitySlug: string }> = [];
  
  // Get unique areas with >10 pubs
  const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(area => area && area.trim()))];
  const validAreas = uniqueAreas.filter(areaName => {
    const areaPubs = pubData.filter(pub => pub.area === areaName);
    return areaPubs.length > 10;
  });
  
  // Generate combinations
  validAreas.forEach(areaName => {
    const areaSlug = generateAreaSlug(areaName);
    AMENITY_FILTERS.forEach(amenity => {
      combinations.push({
        areaSlug,
        amenitySlug: amenity.slug
      });
    });
  });
  
  return combinations;
}

// Get area+amenity page by slugs
export function getAreaAmenityPage(areaSlug: string, amenitySlug: string): AreaAmenityPage | null {
  // Find area name from slug
  const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(area => area && area.trim()))];
  const areaName = uniqueAreas.find(area => generateAreaSlug(area) === areaSlug);
  
  if (!areaName) return null;
  
  return generateAreaAmenityData(areaName, amenitySlug);
}
