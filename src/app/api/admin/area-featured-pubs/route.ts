export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

// GET /api/admin/area-featured-pubs - Get all area featured pubs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all featured pubs from database
    const featuredPubsFromDb = await prisma.areaFeaturedPub.findMany();

    // Get pub data with proper photo URLs from static data
    const featuredPubsWithPhotos = featuredPubsFromDb.map((featuredPub) => {
      const pubFromData = pubData.find(pub => pub.id === featuredPub.pubId);
      if (!pubFromData) {
        return null;
      }

      const photoUrl = pubFromData._internal?.photo_name 
        ? `/api/photo-by-place?photo_name=${encodeURIComponent(pubFromData._internal.photo_name)}&w=160`
        : pubFromData._internal?.place_id
        ? `/api/photo-by-place?place_id=${encodeURIComponent(pubFromData._internal.place_id)}&w=160`
        : null;

      // Use type assertion to access imageUrl since Prisma types may not be updated yet
      const imageUrl = (featuredPub as any).imageUrl as string | null | undefined;

      return {
        id: `${featuredPub.areaName}-${featuredPub.pubId}`,
        areaName: featuredPub.areaName,
        pubId: featuredPub.pubId,
        imageUrl: imageUrl || null, // Include the hosted image URL from database
        pub: {
          id: pubFromData.id,
          name: pubFromData.name,
          photoUrl: photoUrl,
          rating: pubFromData.rating,
          reviewCount: pubFromData.reviewCount,
          address: pubFromData.address,
          amenities: pubFromData.amenities || [],
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

    // Check if pub exists in database (create if it doesn't)
    let dbPub = await prisma.pub.findUnique({
      where: { id: pubId },
    });

    if (!dbPub) {
      // Create pub in database if it doesn't exist
      dbPub = await prisma.pub.create({
        data: {
          id: pubId,
          name: pubFromData.name,
          slug: pubFromData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          address: pubFromData.address,
          description: pubFromData.description,
          phone: pubFromData.phone,
          website: pubFromData.website,
          rating: pubFromData.rating,
          reviewCount: pubFromData.reviewCount,
          openingHours: pubFromData.openingHours,
          photoUrl: pubFromData._internal?.photo_url,
          lat: pubFromData._internal?.lat,
          lng: pubFromData._internal?.lng,
        },
      });
    }

    // Upsert the featured pub (update if exists, create if not)
    await prisma.areaFeaturedPub.upsert({
      where: {
        areaName: areaName,
      },
      update: {
        pubId: pubId,
      },
      create: {
        areaName: areaName,
        pubId: pubId,
      },
    });

    const photoUrl = pubFromData._internal?.photo_name 
      ? `/api/photo-by-place?photo_name=${encodeURIComponent(pubFromData._internal.photo_name)}&w=160`
      : pubFromData._internal?.place_id
      ? `/api/photo-by-place?place_id=${encodeURIComponent(pubFromData._internal.place_id)}&w=160`
      : null;

    return NextResponse.json({ 
      message: 'Featured pub updated successfully',
      featuredPub: {
        id: `${areaName}-${pubId}`,
        areaName: areaName,
        pubId: pubId,
        pub: {
          id: pubFromData.id,
          name: pubFromData.name,
          photoUrl: photoUrl,
          rating: pubFromData.rating,
          reviewCount: pubFromData.reviewCount,
          address: pubFromData.address,
          amenities: pubFromData.amenities || [],
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
