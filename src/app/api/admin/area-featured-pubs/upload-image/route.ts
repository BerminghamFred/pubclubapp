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
      // Update existing record with imageUrl using raw SQL
      // This bypasses Prisma client type checking and works even if client is outdated
      console.log(`[Upload Image] Updating existing record using raw SQL...`);
      try {
        // Try raw SQL first (works even if Prisma client doesn't recognize the field)
        await prisma.$executeRaw`
          UPDATE area_featured_pubs 
          SET "imageUrl" = ${imageUrl}, "updatedAt" = CURRENT_TIMESTAMP 
          WHERE "areaName" = ${areaName}
        `;
        console.log(`[Upload Image] Successfully updated record using raw SQL`);
      } catch (sqlError: any) {
        console.error(`[Upload Image] Raw SQL update failed:`, {
          message: sqlError?.message,
          code: sqlError?.code,
          meta: sqlError?.meta
        });
        
        // Check if it's a column doesn't exist error
        if (sqlError?.message?.includes('column "imageUrl"') || sqlError?.code === '42703') {
          // Column doesn't exist - need to add it first
          console.log(`[Upload Image] Column doesn't exist, attempting to add it...`);
          try {
            await prisma.$executeRawUnsafe(
              `ALTER TABLE area_featured_pubs ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
            );
            console.log(`[Upload Image] Column added successfully, retrying update...`);
            // Retry the update
            await prisma.$executeRaw`
              UPDATE area_featured_pubs 
              SET "imageUrl" = ${imageUrl}, "updatedAt" = CURRENT_TIMESTAMP 
              WHERE "areaName" = ${areaName}
            `;
            console.log(`[Upload Image] Successfully updated after adding column`);
          } catch (alterError: any) {
            console.error(`[Upload Image] Could not add column:`, alterError);
            return NextResponse.json(
              { 
                error: 'Database schema is not up to date. Please run: npx prisma db push',
                details: process.env.NODE_ENV === 'development' ? alterError?.message : undefined
              },
              { status: 500 }
            );
          }
        } else {
          // Some other error - try Prisma update as fallback
          console.log(`[Upload Image] Trying Prisma update as fallback...`);
          try {
            await prisma.areaFeaturedPub.update({
              where: { areaName },
              data: { imageUrl } as any
            });
            console.log(`[Upload Image] Successfully updated using Prisma update`);
          } catch (prismaError) {
            console.error(`[Upload Image] Prisma update also failed:`, prismaError);
            throw prismaError;
          }
        }
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
      } else {
        console.log(`[Upload Image] Pub already exists in database`);
      }

      // Create new record using raw SQL with UPSERT
      // This ensures it works even if Prisma client doesn't recognize imageUrl yet
      console.log(`[Upload Image] Creating/updating AreaFeaturedPub record using raw SQL...`);
      try {
        // Generate a simple unique ID (Prisma uses cuid format)
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const simpleId = `c${timestamp}${random}`;
        
        // Use raw SQL with UPSERT pattern - this works directly with the database
        await prisma.$executeRaw`
          INSERT INTO area_featured_pubs (id, "areaName", "pubId", "imageUrl", "createdAt", "updatedAt")
          VALUES (${simpleId}, ${areaName}, ${placeholderPub.id}, ${imageUrl}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("areaName") 
          DO UPDATE SET "imageUrl" = EXCLUDED."imageUrl", "updatedAt" = CURRENT_TIMESTAMP
        `;
        console.log(`[Upload Image] Record created/updated successfully using raw SQL`);
        
        // Fetch the created record
        existing = await prisma.areaFeaturedPub.findUnique({
          where: { areaName }
        });
      } catch (sqlError: any) {
        console.error(`[Upload Image] Raw SQL failed:`, {
          message: sqlError?.message,
          code: sqlError?.code,
          meta: sqlError?.meta
        });
        
        // If column doesn't exist, try to add it and retry
        if (sqlError?.message?.includes('column "imageUrl"') || sqlError?.code === '42703') {
          console.log(`[Upload Image] Column doesn't exist, attempting to add it...`);
          try {
            // Try to add the column (might fail with pooler connection, that's OK)
            await prisma.$executeRawUnsafe(
              `ALTER TABLE area_featured_pubs ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
            );
            console.log(`[Upload Image] Column added, retrying insert...`);
            
            // Retry the insert
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const simpleId = `c${timestamp}${random}`;
            
            await prisma.$executeRaw`
              INSERT INTO area_featured_pubs (id, "areaName", "pubId", "imageUrl", "createdAt", "updatedAt")
              VALUES (${simpleId}, ${areaName}, ${placeholderPub.id}, ${imageUrl}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT ("areaName") 
              DO UPDATE SET "imageUrl" = EXCLUDED."imageUrl", "updatedAt" = CURRENT_TIMESTAMP
            `;
            existing = await prisma.areaFeaturedPub.findUnique({
              where: { areaName }
            });
            console.log(`[Upload Image] Successfully created/updated after adding column`);
          } catch (alterError: any) {
            console.error(`[Upload Image] Could not add column or retry failed:`, alterError);
            return NextResponse.json(
              { 
                error: 'Database column "imageUrl" does not exist. Please run: npx prisma db push',
                details: process.env.NODE_ENV === 'development' ? alterError?.message : undefined
              },
              { status: 500 }
            );
          }
        } else {
          // Some other error - try Prisma upsert as final fallback
          console.log(`[Upload Image] Trying Prisma upsert as final fallback...`);
          try {
            existing = await prisma.areaFeaturedPub.upsert({
              where: { areaName },
              update: { 
                imageUrl: imageUrl,
                pubId: placeholderPub.id
              } as any,
              create: {
                areaName,
                pubId: placeholderPub.id,
                imageUrl
              } as any
            });
            console.log(`[Upload Image] Successfully created/updated using Prisma upsert`);
          } catch (prismaError) {
            console.error(`[Upload Image] Prisma upsert also failed:`, prismaError);
            throw prismaError;
          }
        }
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

