export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

interface TrendingTile {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  icon: string;
  city: string;
  amenity: string;
  pubCount: number;
  score: number;
  isSeasonal?: boolean;
}

// Amenity icons mapping
const amenityIcons: Record<string, string> = {
  'Dog Friendly': '🐕',
  'Beer Garden': '🌳',
  'Sunday Roast': '🍖',
  'Sky Sports': '📺',
  'Pub Quiz': '🧠',
  'Live Music': '🎵',
  'Craft Beer': '🍺',
  'WiFi': '📶',
  'Fireplace': '🔥',
  'Rooftop': '🏢',
  'Riverside': '🌊',
  'Open Late': '🌙',
  'Cocktails': '🍸',
  'Real Ale': '🍺',
  'Food Served': '🍽️',
  'Bar Snacks': '🥜'
};

// Seasonal boosts based on current month
function getSeasonalBoost(amenity: string): number {
  const month = new Date().getMonth() + 1; // 1-12
  
  // Summer (June-August)
  if (month >= 6 && month <= 8) {
    if (['Beer Garden', 'Rooftop', 'Riverside'].includes(amenity)) return 0.2;
  }
  
  // Autumn/Winter (September-February)
  if (month >= 9 || month <= 2) {
    if (['Sunday Roast', 'Fireplace', 'Open Late'].includes(amenity)) return 0.2;
  }
  
  // Spring (March-May)
  if (month >= 3 && month <= 5) {
    if (['Beer Garden', 'Riverside'].includes(amenity)) return 0.15;
  }
  
  return 0;
}

// Generate trending tiles based on pub data
function generateTrendingTiles(): TrendingTile[] {
  const tiles: TrendingTile[] = [];
  
  // Get unique areas with pub counts
  const areaCounts = new Map<string, number>();
  const areaAmenities = new Map<string, Set<string>>();
  
  pubData.forEach(pub => {
    if (pub.area) {
      areaCounts.set(pub.area, (areaCounts.get(pub.area) || 0) + 1);
      
      if (!areaAmenities.has(pub.area)) {
        areaAmenities.set(pub.area, new Set());
      }
      
      // Add features and amenities
      pub.features?.forEach(feature => areaAmenities.get(pub.area)!.add(feature));
      pub.amenities?.forEach(amenity => areaAmenities.get(pub.area)!.add(amenity));
    }
  });
  
  // Top areas by pub count
  const topAreas = Array.from(areaCounts.entries())
    .filter(([_, count]) => count >= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  // Top amenities across all pubs
  const amenityCounts = new Map<string, number>();
  pubData.forEach(pub => {
    pub.features?.forEach(feature => {
      amenityCounts.set(feature, (amenityCounts.get(feature) || 0) + 1);
    });
    pub.amenities?.forEach(amenity => {
      amenityCounts.set(amenity, (amenityCounts.get(amenity) || 0) + 1);
    });
  });
  
  const topAmenities = Array.from(amenityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([amenity]) => amenity);
  
  // Generate tiles
  let tileId = 1;
  const usedCombinations = new Set<string>();
  
  for (const [area, totalPubs] of topAreas) {
    const areaSlug = area.toLowerCase().replace(/\s+/g, '-');
    const amenities = areaAmenities.get(area) || new Set();
    
    for (const amenity of topAmenities) {
      if (amenities.has(amenity)) {
        const combination = `${area}-${amenity}`;
        if (usedCombinations.has(combination)) continue;
        
        // Count pubs with this amenity in this area
        const amenityPubs = pubData.filter(pub => 
          pub.area === area && 
          (pub.features?.includes(amenity) || pub.amenities?.includes(amenity))
        ).length;
        
        if (amenityPubs >= 3) {
          const seasonalBoost = getSeasonalBoost(amenity);
          const score = 0.5 + (amenityPubs / totalPubs) * 0.3 + seasonalBoost;
          
          tiles.push({
            id: `tile-${tileId++}`,
            title: `Best ${amenity} in ${area}`,
            subtitle: getAmenitySubtitle(amenity),
            href: `/area/${areaSlug}?amenities=${encodeURIComponent(amenity)}`,
            icon: amenityIcons[amenity] || '🍺',
            city: area,
            amenity,
            pubCount: amenityPubs,
            score,
            isSeasonal: seasonalBoost > 0
          });
          
          usedCombinations.add(combination);
        }
      }
    }
  }
  
  // Sort by score and return top tiles
  return tiles
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function getAmenitySubtitle(amenity: string): string {
  const subtitles: Record<string, string> = {
    'Dog Friendly': 'Pubs where your furry friend is welcome',
    'Beer Garden': 'Sunny terraces & cold pints',
    'Sunday Roast': 'Traditional Sunday dinners',
    'Sky Sports': 'Watch the game with great atmosphere',
    'Pub Quiz': 'Test your knowledge & win prizes',
    'Live Music': 'Bands, DJs & acoustic nights',
    'Craft Beer': 'Local brews & independent taps',
    'WiFi': 'Work-friendly pubs with good internet',
    'Fireplace': 'Cozy spots to warm up',
    'Rooftop': 'Drinks with a view',
    'Riverside': 'Pubs by the water',
    'Open Late': 'Late night drinking spots',
    'Cocktails': 'Creative drinks & mixology',
    'Real Ale': 'Traditional cask ales',
    'Food Served': 'Great food & drink combos',
    'Bar Snacks': 'Perfect nibbles with your pint'
  };
  
  return subtitles[amenity] || 'Great pubs with this feature';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    
    // Try to get slots from database first
    const dbSlots = await prisma.homepageSlot.findMany({
      where: { isActive: true },
      orderBy: [
        { position: 'asc' },
        { score: 'desc' }
      ]
    });
    
    if (dbSlots.length > 0) {
      // Convert database slots to tile format
      const tiles = dbSlots.map(slot => ({
        id: slot.id,
        title: slot.title,
        subtitle: slot.subtitle,
        href: slot.href,
        icon: slot.icon,
        city: slot.areaSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        amenity: slot.amenitySlug ? slot.amenitySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'All Pubs',
        pubCount: slot.pubCount,
        score: slot.score,
        isSeasonal: slot.isSeasonal
      }));
      
      const response = NextResponse.json({
        tiles,
        total: tiles.length,
        source: 'database',
        generated_at: new Date().toISOString()
      });
      
      // Add appropriate caching headers
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      
      return response;
    }
    
    // Fallback to generated tiles if no database slots
    const tiles = generateTrendingTiles();
    const diversifiedTiles = applyDiversityRules(tiles, location);
    
    const response = NextResponse.json({
      tiles: diversifiedTiles,
      total: diversifiedTiles.length,
      source: 'generated',
      generated_at: new Date().toISOString()
    });
    
    // Add appropriate caching headers for generated content
    response.headers.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('Error generating homepage slots:', error);
    return NextResponse.json(
      { error: 'Failed to generate homepage slots' },
      { status: 500 }
    );
  }
}

function applyDiversityRules(tiles: TrendingTile[], location?: string | null): TrendingTile[] {
  const diversified: TrendingTile[] = [];
  const cityCounts = new Map<string, number>();
  const amenityCounts = new Map<string, number>();
  const maxPerCity = 2;
  const minAmenities = 3;
  
  // Sort tiles by score
  const sortedTiles = [...tiles].sort((a, b) => b.score - a.score);
  
  for (const tile of sortedTiles) {
    const cityCount = cityCounts.get(tile.city) || 0;
    const amenityCount = amenityCounts.get(tile.amenity) || 0;
    
    // Apply diversity rules
    if (cityCount < maxPerCity && amenityCount < 3) {
      diversified.push(tile);
      cityCounts.set(tile.city, cityCount + 1);
      amenityCounts.set(tile.amenity, amenityCount + 1);
    }
    
    // Stop when we have enough tiles
    if (diversified.length >= 12) break;
  }
  
  // Ensure we have at least minAmenities different amenities
  const uniqueAmenities = new Set(diversified.map(t => t.amenity));
  if (uniqueAmenities.size < minAmenities) {
    // Add more tiles with different amenities
    for (const tile of sortedTiles) {
      if (!uniqueAmenities.has(tile.amenity) && diversified.length < 12) {
        diversified.push(tile);
        uniqueAmenities.add(tile.amenity);
      }
    }
  }
  
  return diversified;
}