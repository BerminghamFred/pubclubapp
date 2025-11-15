export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';
import { z } from 'zod';
import { generatePubSlug } from '@/utils/slugUtils';

// Validation schema
const createReviewSchema = z.object({
  pubId: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.union([z.string(), z.literal('')]).optional(),
  body: z.string().min(10).max(2000),
  photos: z.array(z.string().url()).max(5).optional(),
});

// Helper function to ensure pub exists in database
async function ensurePubExists(pubId: string) {
  const pub = pubData.find(p => p.id === pubId);
  if (!pub) {
    throw new Error('Pub not found in static data');
  }

  // Check if pub exists in database, create if not
  await prisma.pub.upsert({
    where: { id: pubId },
    create: {
      id: pub.id,
      name: pub.name,
      slug: generatePubSlug(pub.name, pub.id),
      address: pub.address,
      description: pub.description,
      phone: pub.phone,
      website: pub.website,
      openingHours: pub.openingHours,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
      lat: pub._internal?.lat,
      lng: pub._internal?.lng,
      managerEmail: pub.manager_email,
      managerPassword: pub.manager_password,
      checkinCount: 0,
      wishlistCount: 0,
      userReviewCount: 0,
    },
    update: {}, // Don't update existing pubs
  });
}

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

    // Ensure pub exists in database
    await ensurePubExists(validatedData.pubId);

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
    // Convert empty title string to null/undefined
    const reviewTitle = validatedData.title && validatedData.title.trim() 
      ? validatedData.title.trim() 
      : null;
    
    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        pubId: validatedData.pubId,
        rating: validatedData.rating,
        title: reviewTitle,
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
      console.error('[Review API] Validation error:', error.issues);
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Pub not found in static data') {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      );
    }

    console.error('[Review API] Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review', message: error instanceof Error ? error.message : 'Unknown error' },
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

  // Ensure pub exists before updating
  await ensurePubExists(pubId);

  // Update the pub (guaranteed to exist)
  await prisma.pub.update({
    where: { id: pubId },
    data: {
      userReviewCount,
      userRatingAvg,
    },
  });
}
