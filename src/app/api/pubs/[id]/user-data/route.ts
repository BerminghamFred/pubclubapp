import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;

    // Get user-generated content data from database
    const [userReviewCount, wishlistCount, checkinCount, userRatingResult] = await Promise.all([
      prisma.review.count({
        where: { pubId, isVisible: true }
      }),
      prisma.wishlist.count({
        where: { pubId }
      }),
      prisma.checkin.count({
        where: { pubId }
      }),
      prisma.review.aggregate({
        where: { pubId, isVisible: true },
        _avg: { rating: true }
      })
    ]);

    const userRatingAvg = userRatingResult._avg.rating || 0;

    const response = NextResponse.json({
      userReviewCount,
      userRatingAvg,
      wishlistCount,
      checkinCount,
    });

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    
    return response;

  } catch (error: any) {
    console.error('User data error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch user data' 
    }, { status: 500 });
  }
}
