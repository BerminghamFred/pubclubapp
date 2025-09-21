import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Get user's reviews (just the IDs)
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: {
          userId: session.user.id,
          isVisible: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: {
          userId: session.user.id,
          isVisible: true,
        },
      }),
    ]);

    // Transform the data by looking up pub details from static data
    const transformedReviews = reviews.map(review => {
      const pub = pubData.find(p => p.id === review.pubId);
      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt,
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
      reviews: transformedReviews,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + limit < totalCount,
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
