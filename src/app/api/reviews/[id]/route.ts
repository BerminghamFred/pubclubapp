export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { pubData } from '@/data/pubData';
import { generatePubSlug } from '@/utils/slugUtils';

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().optional(),
  body: z.string().min(10).max(2000).optional(),
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to edit this review' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateReviewSchema.parse(body);

    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        ...validatedData,
        isEdited: true,
      },
    });

    // Update pub counters
    await updatePubCounters(review.pubId);

    return NextResponse.json({
      success: true,
      review: {
        id: updatedReview.id,
        rating: updatedReview.rating,
        title: updatedReview.title,
        body: updatedReview.body,
        photos: updatedReview.photos ? JSON.parse(updatedReview.photos) : [],
        isEdited: updatedReview.isEdited,
        createdAt: updatedReview.createdAt,
        updatedAt: updatedReview.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// Helper function to update pub counters
async function updatePubCounters(pubId: string) {
  // Ensure pub exists before updating
  await ensurePubExists(pubId);

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

  // Update the pub (guaranteed to exist)
  await prisma.pub.update({
    where: { id: pubId },
    data: {
      userReviewCount,
      userRatingAvg,
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this review' }, { status: 403 });
    }

    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Review deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
