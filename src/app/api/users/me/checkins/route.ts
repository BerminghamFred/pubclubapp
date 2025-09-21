import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Get user's check-ins (just the IDs)
    const [checkins, totalCount] = await Promise.all([
      prisma.checkin.findMany({
        where: { userId: session.user.id },
        orderBy: { visitedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.checkin.count({
        where: { userId: session.user.id },
      }),
    ]);

    // Transform the data by looking up pub details from static data
    const transformedCheckins = checkins.map(checkin => {
      const pub = pubData.find(p => p.id === checkin.pubId);
      return {
        id: checkin.id,
        note: checkin.note,
        visitedAt: checkin.visitedAt,
        pub: pub ? {
          id: pub.id,
          name: pub.name,
          rating: pub.rating,
          reviewCount: pub.reviewCount,
          photoUrl: pub._internal?.photo_url || null,
        } : null,
      };
    }).filter(item => item.pub); // Filter out any items where pub wasn't found

    return NextResponse.json({
      pubs: transformedCheckins,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + limit < totalCount,
    });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}
