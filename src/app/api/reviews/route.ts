export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';
import { z } from 'zod';

// Validation schema
const createReviewSchema = z.object({
  pubId: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  body: z.string().min(10).max(2000),
  photos: z.array(z.string().url()).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);

    // Check if pub exists in your static data
    const pub = pubData.find(p => p.id === validatedData.pubId);
    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      );
    }

    // Check if user already has a review for this pub
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_pubId: {
          userId: session.user.id,
          pubId: validatedData.pubId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this pub' },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        pubId: validatedData.pubId,
        rating: validatedData.rating,
        title: validatedData.title,
        body: validatedData.body,
        photos: validatedData.photos ? JSON.stringify(validatedData.photos) : null,
      },
    });

    // Update pub counters (this should be done in a transaction)
    await updatePubCounters(validatedData.pubId);

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        photos: review.photos ? JSON.parse(review.photos) : [],
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// Helper function to update pub counters
async function updatePubCounters(pubId: string) {
  // Get all visible reviews for this pub
  const reviews = await prisma.review.findMany({
    where: {
      pubId,
      isVisible: true,
    },
    select: {
      rating: true,
    },
  });

  // Calculate new averages and counts
  const userReviewCount = reviews.length;
  const userRatingAvg = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : null;

  // Update the pub
  await prisma.pub.update({
    where: { id: pubId },
    data: {
      userReviewCount,
      userRatingAvg,
    },
  });
}
