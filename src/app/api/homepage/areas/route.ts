export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import { prisma } from '@/lib/prisma';

interface Area {
  slug: string;
  name: string;
  pubCount: number;
  image?: string;
  isNearby?: boolean;
  distance?: number; // Distance in km from user location
  centroid?: { lat: number; lng: number }; // Area center point
}

// Calculate distance between two coordinates using Haversine formula (returns km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate area centroid (center point) from pub locations
function calculateAreaCentroid(areaName: string): { lat: number; lng: number } | null {
  const areaPubs = pubData.filter(
    pub => pub.area === areaName && pub._internal?.lat && pub._internal?.lng
  );
  
  if (areaPubs.length === 0) {
    return null;
  }
  
  const latSum = areaPubs.reduce((sum, pub) => sum + (pub._internal!.lat!), 0);
  const lngSum = areaPubs.reduce((sum, pub) => sum + (pub._internal!.lng!), 0);
  
  return {
    lat: latSum / areaPubs.length,
    lng: lngSum / areaPubs.length
  };
}


async function generateAreas(): Promise<Area[]> {
  const areaCounts = new Map<string, number>();
  
  // Count pubs per area
  pubData.forEach(pub => {
    if (pub.area) {
      areaCounts.set(pub.area, (areaCounts.get(pub.area) || 0) + 1);
    }
  });
  
  // Get hosted image URLs from database - ONLY use hosted URLs, no featured pub photos
  const areaImageMap = new Map<string, string>(); // Maps area name to hosted image URL
  
  try {
    const featuredPubsFromDb = await prisma.areaFeaturedPub.findMany();
    
    featuredPubsFromDb.forEach((featuredPub) => {
      // Only use hosted imageUrl from database - no fallback to featured pub photos
      const imageUrl = (featuredPub as any).imageUrl as string | null | undefined;
      if (imageUrl) {
        // Normalize area name for consistent matching (trim whitespace, handle case)
        const normalizedAreaName = featuredPub.areaName.trim();
        areaImageMap.set(normalizedAreaName, imageUrl);
        console.log(`[Areas API] Found hosted image URL for "${normalizedAreaName}": ${imageUrl}`);
      }
    });
    
    console.log(`[Areas API] Total hosted image URLs: ${areaImageMap.size}`);
  } catch (error) {
    console.error('Error reading featured pubs from database:', error);
  }
  
  // Convert to areas array with centroids calculated
  const areas: Area[] = Array.from(areaCounts.entries())
    .filter(([_, count]) => count >= 5) // Only areas with 5+ pubs
    .map(([name, pubCount]) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const normalizedName = name.trim();
      
      // ONLY use hosted image URL - no featured pub photo fallback
      const hostedImageUrl = areaImageMap.get(normalizedName) || areaImageMap.get(name);
      
      // Calculate area centroid for distance calculations
      const centroid = calculateAreaCentroid(name);
      
      if (hostedImageUrl) {
        console.log(`[Areas API] Using hosted image for "${name}": ${hostedImageUrl}`);
      } else {
        console.log(`[Areas API] No hosted image URL for "${name}"`);
      }
      
      return {
        slug,
        name,
        pubCount,
        image: hostedImageUrl || undefined, // Only use hosted URL, no fallback
        isNearby: false,
        centroid: centroid || undefined
      };
    })
    .sort((a, b) => b.pubCount - a.pubCount); // Default sort by pub count
  
  return areas;
}

// Get areas sorted by proximity to user location (using real geographic distance)
function getAreasByProximity(userLat: number, userLng: number, allAreas: Area[]): Area[] {
  // Calculate distance for each area and sort by proximity
  const areasWithDistance = allAreas
    .map(area => {
      if (!area.centroid) {
        // If area has no centroid, assign a very large distance so it appears last
        return { ...area, distance: Infinity, isNearby: false };
      }
      
      const distance = calculateDistance(
        userLat,
        userLng,
        area.centroid.lat,
        area.centroid.lng
      );
      
      return {
        ...area,
        distance,
        isNearby: true // Mark as nearby if we have a distance
      };
    })
    .sort((a, b) => {
      // Sort by distance (closest first)
      if (a.distance === Infinity && b.distance === Infinity) {
        return b.pubCount - a.pubCount; // If both have no distance, sort by pub count
      }
      if (a.distance === Infinity) return 1; // Areas without centroids go last
      if (b.distance === Infinity) return -1;
      return a.distance - b.distance;
    });
  
  // Debug: Log areas with distances
  console.log(`[Areas API] Areas sorted by proximity (closest first):`);
  areasWithDistance.slice(0, 10).forEach(area => {
    const distanceStr = area.distance === Infinity ? 'N/A' : `${area.distance.toFixed(2)} km`;
    console.log(`  - ${area.name}: ${distanceStr}, image = ${area.image || 'none'}`);
  });
  
  return areasWithDistance.slice(0, 8); // Return 8 closest areas
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    
    const allAreas = await generateAreas();
    let areas: Area[] = [];
    
    if (location) {
      // Parse location - should be "lat,lng" coordinates
      const locationParts = location.split(',');
      
      if (locationParts.length === 2) {
        // It's coordinates
        const lat = parseFloat(locationParts[0]);
        const lng = parseFloat(locationParts[1]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // Use real geographic proximity sorting
          areas = getAreasByProximity(lat, lng, allAreas);
          console.log(`[Areas API] User location: ${lat}, ${lng}`);
          console.log(`[Areas API] Returning ${areas.length} areas sorted by proximity`);
        } else {
          console.warn(`[Areas API] Invalid coordinates: ${location}`);
        }
      } else {
        console.warn(`[Areas API] Location format should be "lat,lng", got: ${location}`);
      }
    }
    
    // Fallback to top areas by pub count if no valid location provided
    if (areas.length === 0) {
      console.log('[Areas API] No valid location provided, returning top areas by pub count');
      areas = allAreas.slice(0, 8);
    }
    
    // Debug: Log the final areas with images and distances
    console.log('[Areas API] Final areas being returned:');
    areas.forEach(area => {
      const distanceStr = area.distance !== undefined ? ` (${area.distance.toFixed(2)} km)` : '';
      console.log(`  - ${area.name}${distanceStr}: image = ${area.image || 'none'}`);
    });
    
    const response = NextResponse.json({
      areas,
      total: areas.length,
      location_detected: areas.some(area => area.isNearby),
      generated_at: new Date().toISOString()
    });
    
    // Add caching headers - shorter cache for development, longer for production
    const cacheMaxAge = process.env.NODE_ENV === 'production' ? 1800 : 60; // 30 min in prod, 1 min in dev
    response.headers.set('Cache-Control', `public, max-age=${cacheMaxAge}, stale-while-revalidate=3600`);
    
    return response;
  } catch (error) {
    console.error('Error generating homepage areas:', error);
    return NextResponse.json(
      { error: 'Failed to generate homepage areas' },
      { status: 500 }
    );
  }
}
