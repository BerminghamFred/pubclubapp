export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

// POST /api/admin/area-featured-pubs/upload-image - Set hosted image URL for area
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { areaName, imageUrl } = body;

    if (!areaName) {
      return NextResponse.json(
        { error: 'Area name is required' },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Valid image URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if area featured pub exists
    let existing = await prisma.areaFeaturedPub.findUnique({
      where: { areaName }
    });

    if (existing) {
      // Update existing record with imageUrl
      await prisma.areaFeaturedPub.update({
        where: { areaName },
        data: { imageUrl }
      });
    } else {
      // Create new record - find first pub in this area as placeholder
      const areaPubs = pubData.filter(pub => pub.area === areaName);
      
      if (areaPubs.length === 0) {
        return NextResponse.json(
          { error: `No pubs found in area "${areaName}". Please ensure the area exists and has pubs.` },
          { status: 404 }
        );
      }

      // Use the first pub (sorted by rating) as placeholder
      const placeholderPub = areaPubs.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      
      // Ensure pub exists in database
      let dbPub = await prisma.pub.findUnique({
        where: { id: placeholderPub.id },
      });

      if (!dbPub) {
        dbPub = await prisma.pub.create({
          data: {
            id: placeholderPub.id,
            name: placeholderPub.name,
            slug: placeholderPub.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            address: placeholderPub.address,
            description: placeholderPub.description,
            phone: placeholderPub.phone,
            website: placeholderPub.website,
            rating: placeholderPub.rating,
            reviewCount: placeholderPub.reviewCount,
            openingHours: placeholderPub.openingHours,
            photoUrl: placeholderPub._internal?.photo_url,
            lat: placeholderPub._internal?.lat,
            lng: placeholderPub._internal?.lng,
          },
        });
      }

      // Create new record with imageUrl
      existing = await prisma.areaFeaturedPub.create({
        data: {
          areaName,
          pubId: placeholderPub.id,
          imageUrl
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Image URL saved successfully',
      imageUrl: imageUrl,
      areaName: areaName
    });

  } catch (error) {
    console.error('Error saving area image URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', { errorMessage });
    
    return NextResponse.json(
      { 
        error: 'Failed to save image URL',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/area-featured-pubs/upload-image - Delete area image URL
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaName = searchParams.get('areaName');

    if (!areaName) {
      return NextResponse.json(
        { error: 'Area name is required' },
        { status: 400 }
      );
    }

    // Update the record to remove imageUrl
    const existing = await prisma.areaFeaturedPub.findUnique({
      where: { areaName }
    });

    if (!existing || !existing.imageUrl) {
      return NextResponse.json(
        { error: 'Image URL not found for this area' },
        { status: 404 }
      );
    }

    await prisma.areaFeaturedPub.update({
      where: { areaName },
      data: { imageUrl: null }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Image URL deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting area image URL:', error);
    return NextResponse.json(
      { error: 'Failed to delete image URL' },
      { status: 500 }
    );
  }
}

