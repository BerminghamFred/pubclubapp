import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import fs from 'fs';
import path from 'path';

interface Area {
  slug: string;
  name: string;
  pubCount: number;
  image?: string;
  isNearby?: boolean;
}

// Mock geolocation service - in production, you'd use a real geocoding service
async function getLocationFromCoords(lat: number, lng: number): Promise<string | null> {
  // This is a simplified mock - in production, use Google Geocoding API or similar
  const mockAreas = [
    { name: 'Islington', bounds: { north: 51.55, south: 51.52, east: -0.08, west: -0.12 } },
    { name: 'Camden', bounds: { north: 51.56, south: 51.53, east: -0.12, west: -0.16 } },
    { name: 'Shoreditch', bounds: { north: 51.53, south: 51.50, east: -0.05, west: -0.08 } },
    { name: 'Brixton', bounds: { north: 51.47, south: 51.44, east: -0.10, west: -0.13 } },
    { name: 'Clapham', bounds: { north: 51.46, south: 51.43, east: -0.15, west: -0.18 } },
    { name: 'Hackney', bounds: { north: 51.56, south: 51.53, east: -0.05, west: -0.08 } }
  ];
  
  for (const area of mockAreas) {
    if (lat >= area.bounds.south && lat <= area.bounds.north &&
        lng >= area.bounds.west && lng <= area.bounds.east) {
      return area.name;
    }
  }
  
  return null;
}

async function generateAreas(): Promise<Area[]> {
  const areaCounts = new Map<string, number>();
  
  // Count pubs per area
  pubData.forEach(pub => {
    if (pub.area) {
      areaCounts.set(pub.area, (areaCounts.get(pub.area) || 0) + 1);
    }
  });
  
  // Get featured pubs from file
  const FEATURED_PUBS_FILE = path.join(process.cwd(), 'data', 'featured-pubs.json');
  let featuredPubsData = {};
  
  try {
    if (fs.existsSync(FEATURED_PUBS_FILE)) {
      const data = fs.readFileSync(FEATURED_PUBS_FILE, 'utf8');
      featuredPubsData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading featured pubs file:', error);
  }
  
  const featuredPubMap = new Map<string, string>();
  Object.entries(featuredPubsData).forEach(([areaName, pubId]) => {
    // Find the pub in pubData to get the photo
    const pubFromData = pubData.find(pub => pub.id === pubId);
    if (pubFromData) {
      // Construct proper photo URL using the photo API
      const photoUrl = pubFromData._internal?.photo_name 
        ? `/api/photo-by-place?photo_name=${encodeURIComponent(pubFromData._internal.photo_name)}&w=160`
        : pubFromData._internal?.place_id
        ? `/api/photo-by-place?place_id=${encodeURIComponent(pubFromData._internal.place_id)}&w=160`
        : null;
      
      if (photoUrl) {
        featuredPubMap.set(areaName, photoUrl);
      }
    }
  });
  
  // Convert to areas array
  const areas: Area[] = Array.from(areaCounts.entries())
    .filter(([_, count]) => count >= 5) // Only areas with 5+ pubs
    .map(([name, pubCount]) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const featuredPubPhoto = featuredPubMap.get(name);
      
      return {
        slug,
        name,
        pubCount,
        image: featuredPubPhoto || undefined, // Use featured pub photo or no image
        isNearby: false
      };
    })
    .sort((a, b) => b.pubCount - a.pubCount);
  
  return areas;
}

function getNearbyAreas(userArea: string, allAreas: Area[]): Area[] {
  // Mock nearby areas - in production, use actual geographic proximity
  const nearbyMap: Record<string, string[]> = {
    'Islington': ['Camden', 'Hackney', 'Shoreditch'],
    'Camden': ['Islington', 'Hackney', 'Westminster'],
    'Shoreditch': ['Hackney', 'Islington', 'Brixton'],
    'Brixton': ['Clapham', 'Shoreditch', 'Camberwell'],
    'Clapham': ['Brixton', 'Wandsworth', 'Battersea'],
    'Hackney': ['Islington', 'Camden', 'Shoreditch']
  };
  
  const nearbyNames = nearbyMap[userArea] || [];
  const nearbyAreas = allAreas
    .filter(area => nearbyNames.includes(area.name))
    .map(area => ({ ...area, isNearby: true }));
  
  // Add the user's area as the first item
  const userAreaObj = allAreas.find(area => area.name === userArea);
  if (userAreaObj) {
    nearbyAreas.unshift({ ...userAreaObj, isNearby: true });
  }
  
  return nearbyAreas.slice(0, 8); // Limit to 8 nearby areas
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    
    const allAreas = await generateAreas();
    let areas: Area[] = [];
    
    if (location) {
      // Parse location (could be "lat,lng" or city name)
      const locationParts = location.split(',');
      
      if (locationParts.length === 2) {
        // It's coordinates
        const lat = parseFloat(locationParts[0]);
        const lng = parseFloat(locationParts[1]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const userArea = await getLocationFromCoords(lat, lng);
          if (userArea) {
            areas = getNearbyAreas(userArea, allAreas);
          }
        }
      } else {
        // It's a city name
        const userArea = location;
        areas = getNearbyAreas(userArea, allAreas);
      }
    }
    
    // Fallback to top cities if no location or no nearby areas found
    if (areas.length === 0) {
      areas = allAreas.slice(0, 8);
    }
    
    const response = NextResponse.json({
      areas,
      total: areas.length,
      location_detected: areas.some(area => area.isNearby),
      generated_at: new Date().toISOString()
    });
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=7200'); // 30 min cache
    
    return response;
  } catch (error) {
    console.error('Error generating homepage areas:', error);
    return NextResponse.json(
      { error: 'Failed to generate homepage areas' },
      { status: 500 }
    );
  }
}
