export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    // Verify pub manager authentication
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { pub, token } = authData;
    const updates = await request.json();

    // Validate updateable fields
    const allowedFields = [
      'name',
      'description', 
      'phone',
      'website',
      'openingHours',
      'amenities'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Update pub in database
    const updatedPub = await prisma.pub.update({
      where: { id: pub.id },
      data: {
        name: updateData.name,
        description: updateData.description,
        phone: updateData.phone,
        website: updateData.website,
        openingHours: updateData.openingHours,
        lastUpdated: new Date(),
        updatedBy: token.email,
      },
      include: {
        amenities: {
          include: {
            amenity: true
          }
        }
      }
    });

    // Update amenities if provided
    if (updates.amenities && Array.isArray(updates.amenities)) {
      // Get all amenities
      const allAmenities = await prisma.amenity.findMany();
      const amenityMap = new Map(allAmenities.map(a => [a.key.toLowerCase(), a.id]));

      // Delete existing pub amenities
      await prisma.pubAmenity.deleteMany({
        where: { pubId: pub.id }
      });

      // Create new pub amenities
      const amenityIds = updates.amenities
        .map((amenityKey: string) => {
          const key = amenityKey.toLowerCase().replace(/\s+/g, '-');
          return amenityMap.get(key);
        })
        .filter((id): id is number => id !== undefined);

      if (amenityIds.length > 0) {
        await prisma.pubAmenity.createMany({
          data: amenityIds.map(amenityId => ({
            pubId: pub.id,
            amenityId,
            value: true
          }))
        });
      }
    }

    // Log audit trail
    try {
      await prisma.adminAudit.create({
        data: {
          actorId: token.email,
          action: 'update',
          entity: 'pub',
          entityId: pub.id,
          diff: updateData,
        }
      });
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
    }

    // Fetch updated pub with amenities
    const finalPub = await prisma.pub.findUnique({
      where: { id: pub.id },
      include: {
        amenities: {
          include: {
            amenity: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Pub data updated successfully',
      pub: {
        id: finalPub!.id,
        name: finalPub!.name,
        description: finalPub!.description,
        phone: finalPub!.phone,
        website: finalPub!.website,
        openingHours: finalPub!.openingHours,
        amenities: finalPub!.amenities.map(pa => pa.amenity.key),
        lastUpdated: finalPub!.lastUpdated,
        updatedBy: finalPub!.updatedBy
      }
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
