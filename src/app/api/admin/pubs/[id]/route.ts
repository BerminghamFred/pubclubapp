export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPubViews } from '@/lib/analytics'
import { pubData } from '@/data/pubData'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
    
    // Check if it's a Place ID (from pubData.ts) or database ID
    const isPlaceId = pubId.startsWith('ChIJ');
    
    if (isPlaceId) {
      // Find pub in pubData.ts
      const pub = pubData.find(p => p.id === pubId);
      if (!pub) {
        return NextResponse.json(
          { error: 'Pub not found' },
          { status: 404 }
        );
      }
      
      // Transform to match expected format
      return NextResponse.json({
        id: pub.id,
        name: pub.name,
        address: pub.address,
        description: pub.description,
        phone: pub.phone,
        website: pub.website,
        openingHours: pub.openingHours,
        rating: pub.rating,
        reviewCount: pub.reviewCount,
        area: pub.area,
        type: pub.type,
        features: pub.features,
        amenities: pub.amenities || [],
        manager_email: pub.manager_email,
        photoUrl: pub._internal?.photo_url,
        createdAt: pub.last_updated || new Date().toISOString(),
        updatedAt: pub.last_updated || new Date().toISOString(),
      });
    }
    
    // Otherwise, try database
    const pub = await prisma.pub.findUnique({
      where: { id: pubId },
      include: {
        city: true,
        borough: true,
        amenities: {
          include: {
            amenity: true,
          }
        },
        photos: true,
        managers: {
          include: {
            manager: true,
          }
        },
        logins: {
          orderBy: {
            loggedInAt: 'desc',
          },
          take: 10,
        }
      },
    })

    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      )
    }

    // Get analytics data for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const views = await getPubViews(thirtyDaysAgo, new Date(), pubId)
    const monthlyViews = views.find(v => v.pubId === pubId)?._count.pubId || 0

    return NextResponse.json({
      ...pub,
      analytics: {
        monthlyViews,
        last30Days: views,
      }
    })
  } catch (error) {
    console.error('Error fetching pub:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pub' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
    const body = await request.json()
    
    // Get current pub data for audit
    const currentPub = await prisma.pub.findUnique({
      where: { id: pubId },
    })

    if (!currentPub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      )
    }

    const updatedPub = await prisma.pub.update({
      where: { id: pubId },
      data: {
        ...body,
        lastUpdated: new Date(),
        updatedBy: 'admin', // TODO: Get from auth
      },
    })

    // Log audit trail
    await prisma.adminAudit.create({
      data: {
        actorId: 'admin', // TODO: Get from auth
        action: 'update',
        entity: 'pub',
        entityId: pubId,
        diff: {
          before: currentPub,
          after: body,
        },
      }
    })

    return NextResponse.json({ pub: updatedPub })
  } catch (error) {
    console.error('Error updating pub:', error)
    return NextResponse.json(
      { error: 'Failed to update pub' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
    
    // Check if it's a Place ID (from pubData.ts) or database ID
    const isPlaceId = pubId.startsWith('ChIJ');
    
    if (isPlaceId) {
      // Find and remove pub from pubData.ts
      const pubIndex = pubData.findIndex(p => p.id === pubId);
      
      if (pubIndex === -1) {
        return NextResponse.json(
          { error: 'Pub not found' },
          { status: 404 }
        );
      }
      
      // Get current pub data for audit
      const currentPub = pubData[pubIndex];
      
      // Remove the pub from the array
      pubData.splice(pubIndex, 1);
      
      // Write the updated data back to pubData.ts
      const newFileContent = `import { Pub } from './types';

export const pubData: Pub[] = ${JSON.stringify(pubData, null, 2)};
`;
      
      const pubDataPath = path.join(process.cwd(), 'src', 'data', 'pubData.ts');
      
      try {
        await fs.writeFile(pubDataPath, newFileContent, 'utf-8');
      } catch (writeError: any) {
        // Handle serverless environment (read-only filesystem)
        if (writeError.code === 'ENOENT' || writeError.code === 'EACCES' || writeError.code === 'EROFS') {
          return NextResponse.json({
            success: false,
            error: 'Cannot write to filesystem in serverless environment',
            message: 'Please update pubData.ts manually to remove this pub',
            pubToRemove: currentPub,
            newFileContent: newFileContent
          }, { status: 200 });
        }
        throw writeError;
      }
      
      // Log audit trail (if possible)
      try {
        await prisma.adminAudit.create({
          data: {
            actorId: 'admin', // TODO: Get from auth
            action: 'delete',
            entity: 'pub',
            entityId: pubId,
            diff: currentPub,
          }
        });
      } catch (auditError) {
        // Audit logging is optional, don't fail the request
        console.error('Failed to log audit trail:', auditError);
      }
      
      return NextResponse.json({ success: true });
    }
    
    // Otherwise, try database deletion
    const currentPub = await prisma.pub.findUnique({
      where: { id: pubId },
    })

    if (!currentPub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      )
    }

    await prisma.pub.delete({
      where: { id: pubId },
    })

    // Log audit trail
    await prisma.adminAudit.create({
      data: {
        actorId: 'admin', // TODO: Get from auth
        action: 'delete',
        entity: 'pub',
        entityId: pubId,
        diff: currentPub,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pub:', error)
    return NextResponse.json(
      { error: 'Failed to delete pub' },
      { status: 500 }
    )
  }
}
