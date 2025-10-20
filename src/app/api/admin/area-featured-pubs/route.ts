import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pubData } from '@/data/pubData';
import fs from 'fs';
import path from 'path';

// File path for storing featured pubs
const FEATURED_PUBS_FILE = path.join(process.cwd(), 'data', 'featured-pubs.json');

// Helper functions for file operations
function readFeaturedPubs() {
  try {
    if (!fs.existsSync(FEATURED_PUBS_FILE)) {
      return {};
    }
    const data = fs.readFileSync(FEATURED_PUBS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading featured pubs file:', error);
    return {};
  }
}

function writeFeaturedPubs(data: any) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(FEATURED_PUBS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(FEATURED_PUBS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing featured pubs file:', error);
    throw error;
  }
}

// GET /api/admin/area-featured-pubs - Get all area featured pubs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const featuredPubsData = readFeaturedPubs();

    // Get pub data with proper photo URLs
    const featuredPubsWithPhotos = Object.entries(featuredPubsData).map(([areaName, pubId]) => {
      const pubFromData = pubData.find(pub => pub.id === pubId);
      if (!pubFromData) {
        return null;
      }

      const photoUrl = pubFromData._internal?.photo_name 
        ? `/api/photo-by-place?photo_name=${encodeURIComponent(pubFromData._internal.photo_name)}&w=160`
        : pubFromData._internal?.place_id
        ? `/api/photo-by-place?place_id=${encodeURIComponent(pubFromData._internal.place_id)}&w=160`
        : null;

      return {
        id: `${areaName}-${pubId}`,
        areaName: areaName,
        pubId: pubId as string,
        pub: {
          id: pubFromData.id,
          name: pubFromData.name,
          photoUrl: photoUrl,
          rating: pubFromData.rating,
          reviewCount: pubFromData.reviewCount,
          address: pubFromData.address,
        }
      };
    }).filter(Boolean);

    return NextResponse.json({ featuredPubs: featuredPubsWithPhotos });
  } catch (error) {
    console.error('Error fetching area featured pubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch area featured pubs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/area-featured-pubs - Set featured pub for an area
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { areaName, pubId } = await request.json();

    if (!areaName || !pubId) {
      return NextResponse.json(
        { error: 'Area name and pub ID are required' },
        { status: 400 }
      );
    }

    // Verify the pub exists in pubData
    const pubFromData = pubData.find(pub => pub.id === pubId);

    if (!pubFromData) {
      return NextResponse.json(
        { error: 'Pub not found in data' },
        { status: 404 }
      );
    }

    console.log(`Setting featured pub for area: ${areaName}, pubId: ${pubId}`);

    // Read current featured pubs data
    const featuredPubsData = readFeaturedPubs();
    
    // Update the data with new selection
    featuredPubsData[areaName] = pubId;
    
    // Write back to file
    writeFeaturedPubs(featuredPubsData);

    return NextResponse.json({ 
      message: 'Featured pub updated successfully',
      featuredPub: {
        id: `${areaName}-${pubId}`,
        areaName: areaName,
        pubId: pubId,
        pub: {
          id: pubFromData.id,
          name: pubFromData.name,
          photoUrl: pubFromData._internal?.photo_name 
            ? `/api/photo-by-place?photo_name=${encodeURIComponent(pubFromData._internal.photo_name)}&w=160`
            : pubFromData._internal?.place_id
            ? `/api/photo-by-place?place_id=${encodeURIComponent(pubFromData._internal.place_id)}&w=160`
            : null,
          rating: pubFromData.rating,
          reviewCount: pubFromData.reviewCount,
          address: pubFromData.address,
        }
      }
    });
  } catch (error) {
    console.error('Error setting area featured pub:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to set area featured pub',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
