export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

// Helper function to get city name from ID
function getCityNameFromId(cityId: number): string | null {
  const uniqueAreas = [...new Set(pubData.map(pub => pub.area).filter(Boolean))];
  const index = cityId - 1; // IDs start from 1, arrays start from 0
  return uniqueAreas[index] || null;
}

// Helper function to extract borough from address or area
function getBoroughFromPub(pub: any): string {
  // If area is provided, use it
  if (pub.area && pub.area.trim()) {
    return pub.area.trim();
  }
  
  // Try to extract borough from address
  if (pub.address) {
    // Common London boroughs and areas to look for
    const boroughs = [
      'Westminster', 'Camden', 'Islington', 'Hackney', 'Tower Hamlets',
      'Southwark', 'Lambeth', 'Wandsworth', 'Hammersmith & Fulham',
      'Kensington & Chelsea', 'Greenwich', 'Lewisham', 'Bromley',
      'Croydon', 'Merton', 'Kingston upon Thames', 'Richmond upon Thames',
      'Hounslow', 'Ealing', 'Brent', 'Harrow', 'Hillingdon', 'Enfield',
      'Barnet', 'Haringey', 'Waltham Forest', 'Redbridge', 'Newham',
      'Barking & Dagenham', 'Havering', 'Bexley', 'Sutton'
    ];
    
    // Check if any borough is mentioned in the address
    for (const borough of boroughs) {
      if (pub.address.toLowerCase().includes(borough.toLowerCase())) {
        return borough;
      }
    }
    
    // Try to extract from postcode area (first part of UK postcode)
    const postcodeMatch = pub.address.match(/([A-Z]{1,2})\d/);
    if (postcodeMatch) {
      const postcodeArea = postcodeMatch[1];
      // Map common postcode areas to boroughs
      const postcodeToBorough: Record<string, string> = {
        'SW': 'Southwark/Lambeth',
        'SE': 'Southwark/Lewisham',
        'NW': 'Camden/Brent',
        'N': 'Islington/Hackney',
        'E': 'Tower Hamlets/Newham',
        'W': 'Westminster/Hammersmith',
        'WC': 'Westminster',
        'EC': 'City of London'
      };
      
      if (postcodeToBorough[postcodeArea]) {
        return postcodeToBorough[postcodeArea];
      }
    }
  }
  
  return 'Unknown';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const cityId = searchParams.get('cityId');
    const boroughId = searchParams.get('boroughId');
    const managerStatus = searchParams.get('managerStatus');

    // Start with all pubs from your actual data
    let filteredPubs = [...pubData];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPubs = filteredPubs.filter(pub =>
        pub.name.toLowerCase().includes(searchLower) ||
        pub.address.toLowerCase().includes(searchLower) ||
        pub.area.toLowerCase().includes(searchLower)
      );
    }

    // Apply city filter (using area field)
    if (cityId && cityId !== '0') {
      // Get the city name from the cityId
      const cityName = getCityNameFromId(parseInt(cityId));
      if (cityName) {
        filteredPubs = filteredPubs.filter(pub => pub.area === cityName);
      }
    }

    // Apply borough filter (using area field - same as city for now)
    if (boroughId && boroughId !== '0') {
      // Get the borough name from the boroughId
      const boroughName = getCityNameFromId(parseInt(boroughId));
      if (boroughName) {
        filteredPubs = filteredPubs.filter(pub => pub.area === boroughName);
      }
    }

    // Transform the data to match the expected format
    const transformedPubs = filteredPubs.map((pub) => {
      // Check if this pub has a manager (has manager_email)
      let managerStatus = 'never_logged_in';
      let lastLoginAt = null;

      if (pub.manager_email) {
        // Check if this manager has logged in recently by looking at database
        // For now, we'll set a mock status - you can enhance this later
        managerStatus = 'active'; // Assume active if has manager email
        lastLoginAt = pub.last_updated ? new Date(pub.last_updated) : null;
      }

      // Start with 0 views - will be tracked via real analytics
      const views = 0;

      return {
        id: pub.id,
        name: pub.name,
        slug: pub.id, // Use ID as slug for now
        address: pub.address,
        postcode: '', // Not in your data structure
        phone: pub.phone,
        website: pub.website,
        description: pub.description,
        rating: pub.rating,
        reviewCount: pub.reviewCount,
        openingHours: pub.openingHours,
        photoUrl: pub._internal?.photo_url,
        city: { id: 1, name: pub.area || 'London' }, // Using area as city for now
        borough: { id: 1, name: getBoroughFromPub(pub) },
        amenities: pub.features?.map(feature => ({
          amenity: {
            label: feature,
          },
        })) || [],
        managerStatus,
        lastLoginAt,
        views,
        createdAt: pub.last_updated ? new Date(pub.last_updated) : new Date(),
        updatedAt: pub.last_updated ? new Date(pub.last_updated) : new Date(),
      };
    });

    // Apply manager status filter after transformation
    let finalPubs = transformedPubs;
    if (managerStatus) {
      finalPubs = transformedPubs.filter(pub => pub.managerStatus === managerStatus);
    }

    // Apply pagination
    const totalCount = finalPubs.length;
    const skip = (page - 1) * limit;
    const paginatedPubs = finalPubs.slice(skip, skip + limit);

    return NextResponse.json({
      pubs: paginatedPubs,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + limit < totalCount,
    });
  } catch (error) {
    console.error('Error fetching pubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pubs' },
      { status: 500 }
    );
  }
}