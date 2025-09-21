import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPubViews } from '@/lib/analytics'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
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
