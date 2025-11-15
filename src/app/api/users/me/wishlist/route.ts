export const runtime = "nodejs";

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

    // Get user's wishlist (just the IDs)
    const [wishlist, totalCount] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.wishlist.count({
        where: { userId: session.user.id },
      }),
    ]);

    // Transform the data by looking up pub details from static data
    const transformedWishlist = wishlist.map(item => {
      const pub = pubData.find(p => p.id === item.pubId);
      return {
        id: item.id,
        createdAt: item.createdAt,
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
      pubs: transformedWishlist,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + limit < totalCount,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}
