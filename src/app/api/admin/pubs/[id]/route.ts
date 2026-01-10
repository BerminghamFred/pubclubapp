export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPubViews } from '@/lib/analytics'
import { updatePub } from '@/lib/services/pubService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
    
    // Try to find by Place ID first, then by database ID
    let pub = await prisma.pub.findUnique({
      where: { placeId: pubId },
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

    // If not found by Place ID, try by database ID
    if (!pub) {
      pub = await prisma.pub.findUnique({
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
      });
    }

    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      )
    }

    // Get analytics data for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const views = await getPubViews(thirtyDaysAgo, new Date(), pub.id)
    const monthlyViews = views.find(v => v.pubId === pub!.id)?._count.pubId || 0

    // Transform to match frontend expectations
    const transformedPub = {
      id: pub.placeId || pub.id,
      name: pub.name,
      slug: pub.slug,
      address: pub.address,
      description: pub.description,
      phone: pub.phone,
      website: pub.website,
      openingHours: pub.openingHours,
      type: pub.type,
      lat: pub.lat,
      lng: pub.lng,
      photoUrl: pub.photoUrl,
      city: pub.city ? { id: pub.city.id, name: pub.city.name } : null,
      borough: pub.borough ? { id: pub.borough.id, name: pub.borough.name } : null,
      amenities: pub.amenities.map(pa => ({
        amenity: {
          id: pa.amenity.id,
          key: pa.amenity.key,
          label: pa.amenity.label,
        }
      })),
      managers: pub.managers.map(pm => ({
        id: pm.manager.id,
        email: pm.manager.email,
        name: pm.manager.name,
        role: pm.role,
        managerId: pm.managerId,
      })),
      managerStatus: pub.managers.length > 0 ? (pub.logins.length > 0 ? 'active' : 'dormant') : 'never_logged_in',
      lastLoginAt: pub.logins[0]?.loggedInAt || null,
      views: monthlyViews,
      createdAt: pub.createdAt,
      updatedAt: pub.updatedAt,
      analytics: {
        monthlyViews,
        last30Days: views,
      }
    };
    
    return NextResponse.json(transformedPub)
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
    
    // Find pub by Place ID or database ID
    let currentPub = await prisma.pub.findUnique({
      where: { placeId: pubId },
    });

    if (!currentPub) {
      currentPub = await prisma.pub.findUnique({
        where: { id: pubId },
      });
    }

    if (!currentPub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      )
    }

    // Use pubService to update (handles amenities properly)
    // Filter out undefined/null values and fields that aren't part of updatePub
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.openingHours !== undefined) updateData.openingHours = body.openingHours;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.cityId !== undefined) updateData.cityId = body.cityId;
    if (body.boroughId !== undefined) updateData.boroughId = body.boroughId;
    if (body.lat !== undefined) updateData.lat = body.lat;
    if (body.lng !== undefined) updateData.lng = body.lng;
    if (body.amenities !== undefined) updateData.amenities = body.amenities;
    
    const updatedPub = await updatePub(pubId, updateData);
    
    // Update lastUpdated and updatedBy directly
    await prisma.pub.update({
      where: { id: currentPub.id },
      data: {
        lastUpdated: new Date(),
        updatedBy: 'admin', // TODO: Get from auth
      }
    });

    // Log audit trail
    await prisma.adminAudit.create({
      data: {
        actorId: 'admin', // TODO: Get from auth
        action: 'update',
        entity: 'pub',
        entityId: currentPub.id,
        diff: JSON.parse(JSON.stringify({
          before: currentPub,
          after: body,
        })),
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
    
    // Find pub by Place ID or database ID
    let currentPub = await prisma.pub.findUnique({
      where: { placeId: pubId },
    });

    if (!currentPub) {
      currentPub = await prisma.pub.findUnique({
        where: { id: pubId },
      });
    }

    if (!currentPub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      )
    }

    await prisma.pub.delete({
      where: { id: currentPub.id },
    })

    // Log audit trail
    await prisma.adminAudit.create({
      data: {
        actorId: 'admin', // TODO: Get from auth
        action: 'delete',
        entity: 'pub',
        entityId: currentPub.id,
        diff: JSON.parse(JSON.stringify(currentPub)),
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
