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

    console.log(`[Upload Image] Attempting to save image URL for area: "${areaName}"`);
    console.log(`[Upload Image] Image URL: ${imageUrl}`);

    // Check if area featured pub exists
    let existing = await prisma.areaFeaturedPub.findUnique({
      where: { areaName }
    });

    console.log(`[Upload Image] Existing record found: ${!!existing}`);

    if (existing) {
      // Update existing record with imageUrl
      console.log(`[Upload Image] Updating existing record...`);
      try {
        await prisma.areaFeaturedPub.update({
          where: { areaName },
          data: { imageUrl } as any
        });
        console.log(`[Upload Image] Successfully updated record`);
      } catch (updateError) {
        console.error(`[Upload Image] Error updating record:`, updateError);
        throw updateError;
      }
    } else {
      // Create new record - find first pub in this area as placeholder
      console.log(`[Upload Image] Creating new record, finding pubs for area...`);
      const areaPubs = pubData.filter(pub => pub.area === areaName);
      
      console.log(`[Upload Image] Found ${areaPubs.length} pubs in area "${areaName}"`);
      
      if (areaPubs.length === 0) {
        return NextResponse.json(
          { error: `No pubs found in area "${areaName}". Please ensure the area exists and has pubs.` },
          { status: 404 }
        );
      }

      // Use the first pub (sorted by rating) as placeholder
      const placeholderPub = areaPubs.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      console.log(`[Upload Image] Using placeholder pub: ${placeholderPub.id} (${placeholderPub.name})`);
      
      // Ensure pub exists in database
      let dbPub = await prisma.pub.findUnique({
        where: { id: placeholderPub.id },
      });

      if (!dbPub) {
        console.log(`[Upload Image] Creating pub in database...`);
        try {
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
          console.log(`[Upload Image] Pub created successfully`);
        } catch (pubError) {
          console.error(`[Upload Image] Error creating pub:`, pubError);
          throw pubError;
        }
      } else {
        console.log(`[Upload Image] Pub already exists in database`);
      }

      // Create new record with imageUrl
      console.log(`[Upload Image] Creating AreaFeaturedPub record...`);
      try {
        existing = await prisma.areaFeaturedPub.create({
          data: {
            areaName,
            pubId: placeholderPub.id,
            imageUrl
          } as any
        });
        console.log(`[Upload Image] Record created successfully`);
      } catch (createError) {
        console.error(`[Upload Image] Error creating record:`, createError);
        throw createError;
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Image URL saved successfully',
      imageUrl: imageUrl,
      areaName: areaName
    });

  } catch (error) {
    console.error('Error saving area image URL:', error);
    
    // Handle Prisma-specific errors
    let errorMessage = 'Unknown error';
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      
      // Check for Prisma error codes
      if ((error as any).code) {
        errorDetails.code = (error as any).code;
      }
      if ((error as any).meta) {
        errorDetails.meta = (error as any).meta;
      }
    }
    
    console.error('Error details:', errorDetails);
    
    // Check if it's a Prisma client issue
    if (errorMessage.includes('Unknown argument') || errorMessage.includes('imageUrl')) {
      errorMessage = 'Database schema may not be up to date. Please restart your dev server and try again.';
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to save image URL',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
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

    // Use type assertion to check imageUrl
    const existingImageUrl = (existing as any)?.imageUrl;
    if (!existing || !existingImageUrl) {
      return NextResponse.json(
        { error: 'Image URL not found for this area' },
        { status: 404 }
      );
    }

    // Use type assertion since Prisma types may not be updated yet
    await prisma.areaFeaturedPub.update({
      where: { areaName },
      data: { imageUrl: null } as any
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

