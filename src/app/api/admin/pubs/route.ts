export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPubViews } from '@/lib/analytics';
import { createPub } from '@/lib/services/pubService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const cityId = searchParams.get('cityId');
    const boroughId = searchParams.get('boroughId');
    const managerStatus = searchParams.get('managerStatus');

    // Build where clause for Prisma query
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // City filter
    if (cityId && cityId !== '0') {
      where.cityId = parseInt(cityId);
    }

    // Borough filter
    if (boroughId && boroughId !== '0') {
      where.boroughId = parseInt(boroughId);
    }

    // Manager status filter
    if (managerStatus) {
      if (managerStatus === 'has_manager') {
        where.OR = [
          ...(where.OR || []),
          { managerEmail: { not: null } },
          { managers: { some: {} } }
        ];
      } else if (managerStatus === 'no_manager') {
        where.AND = [
          ...(where.AND || []),
          { managerEmail: null },
          { managers: { none: {} } }
        ];
      }
    }

    // Get total count
    const totalCount = await prisma.pub.count({ where });

    // Get paginated pubs
    const skip = (page - 1) * limit;
    const dbPubs = await prisma.pub.findMany({
      where,
      skip,
      take: limit,
      include: {
        city: true,
        borough: true,
        amenities: {
          include: {
            amenity: true
          }
        },
        managers: {
          include: {
            manager: true
          }
        },
        logins: {
          orderBy: {
            loggedInAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get views for each pub - call getPubViews for each pub
    const viewsMap = new Map<string, number>();
    for (const pub of dbPubs) {
      const viewsData = await getPubViews(new Date(0), new Date(), pub.id);
      const count = viewsData.find(v => v.pubId === pub.id)?._count.pubId || 0;
      viewsMap.set(pub.id, count);
    }

    // Transform to expected format
    const transformedPubs = dbPubs.map((pub) => {
      // Determine manager status
      let managerStatusValue = 'no_manager';
      let lastLoginAt = null;

      if (pub.managerEmail || pub.managers.length > 0) {
        managerStatusValue = 'has_manager';
        if (pub.logins.length > 0) {
          lastLoginAt = pub.logins[0].loggedInAt;
          managerStatusValue = 'active';
        }
      }

      return {
        id: pub.placeId || pub.id, // Use placeId as primary identifier
        name: pub.name,
        slug: pub.slug,
        address: pub.address,
        postcode: pub.postcode,
        phone: pub.phone,
        website: pub.website,
        description: pub.description,
        rating: pub.rating,
        reviewCount: pub.reviewCount,
        openingHours: pub.openingHours,
        photoUrl: pub.photoUrl,
        city: pub.city ? { id: pub.city.id, name: pub.city.name } : null,
        borough: pub.borough ? { id: pub.borough.id, name: pub.borough.name } : null,
        amenities: pub.amenities.map(pa => ({
          amenity: {
            label: pa.amenity.label,
            key: pa.amenity.key,
          },
        })),
        managerStatus: managerStatusValue,
        lastLoginAt,
        views: viewsMap.get(pub.id) || 0,
        createdAt: pub.createdAt,
        updatedAt: pub.updatedAt,
      };
    });

    // Apply manager status filter after transformation (if needed for client-side filtering)
    let finalPubs = transformedPubs;
    if (managerStatus && managerStatus !== 'has_manager' && managerStatus !== 'no_manager') {
      finalPubs = transformedPubs.filter(pub => pub.managerStatus === managerStatus);
    }

    return NextResponse.json({
      pubs: finalPubs,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate placeId if not provided
    const placeId = body.placeId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create pub using pubService
    const newPub = await createPub({
      name: body.name,
      address: body.address,
      description: body.description,
      phone: body.phone,
      website: body.website,
      openingHours: body.openingHours,
      type: body.type,
      placeId: placeId,
      lat: body.lat,
      lng: body.lng,
      photoUrl: body.photoUrl,
      photoName: body.photoName,
      cityId: body.cityId ? parseInt(body.cityId) : undefined,
      boroughId: body.boroughId ? parseInt(body.boroughId) : undefined,
      features: body.features || [],
      amenities: body.amenities || [],
      managerEmail: body.managerEmail,
      managerPassword: body.managerPassword, // Should be hashed on frontend or here
    });

    // Log audit trail
    try {
      await prisma.adminAudit.create({
        data: {
          actorId: 'admin', // TODO: Get from auth
          action: 'create',
          entity: 'pub',
          entityId: newPub.id,
          diff: JSON.parse(JSON.stringify(newPub)),
        }
      });
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
    }

    return NextResponse.json({ 
      success: true,
      pub: newPub 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating pub:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pub' },
      { status: 500 }
    );
  }
}