export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Use UPSERT to save the image URL - this is purely about the area image, not pubs
    // pubId is required by schema but we'll use a placeholder since this is just for area images
    console.log(`[Upload Image] Saving/updating area image URL...`);
    
    try {
      // Try Prisma upsert first - update imageUrl, create with placeholder pubId if needed
      await prisma.areaFeaturedPub.upsert({
        where: { areaName },
        update: { 
          imageUrl: imageUrl
        } as any,
        create: {
          areaName,
          pubId: 'area-image-only', // Placeholder - not actually used, just satisfies schema requirement
          imageUrl
        } as any
      });
      console.log(`[Upload Image] Successfully saved using Prisma upsert`);
    } catch (prismaError: any) {
      console.error(`[Upload Image] Prisma upsert failed:`, {
        message: prismaError?.message,
        code: prismaError?.code
      });
      
      // Fallback: Use raw SQL UPSERT - works even if Prisma client doesn't recognize imageUrl
      console.log(`[Upload Image] Trying raw SQL UPSERT as fallback...`);
      try {
        await prisma.$executeRaw`
          INSERT INTO area_featured_pubs ("areaName", "pubId", "imageUrl", "createdAt", "updatedAt")
          VALUES (${areaName}, 'area-image-only', ${imageUrl}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("areaName") 
          DO UPDATE SET "imageUrl" = EXCLUDED."imageUrl", "updatedAt" = CURRENT_TIMESTAMP
        `;
        console.log(`[Upload Image] Successfully saved using raw SQL`);
      } catch (sqlError: any) {
        console.error(`[Upload Image] Raw SQL also failed:`, {
          message: sqlError?.message,
          code: sqlError?.code
        });
        throw sqlError;
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

    // Use raw SQL to delete imageUrl (works even if Prisma client doesn't recognize the field)
    try {
      await prisma.$executeRaw`
        UPDATE area_featured_pubs 
        SET "imageUrl" = NULL, "updatedAt" = CURRENT_TIMESTAMP 
        WHERE "areaName" = ${areaName}
      `;
    } catch (sqlError: any) {
      // If column doesn't exist, there's nothing to delete
      if (sqlError?.message?.includes('column "imageUrl"') || sqlError?.code === '42703') {
        return NextResponse.json(
          { error: 'Image URL column does not exist in database' },
          { status: 404 }
        );
      }
      // Fallback to Prisma update
      await prisma.areaFeaturedPub.update({
        where: { areaName },
        data: { imageUrl: null } as any
      });
    }

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

