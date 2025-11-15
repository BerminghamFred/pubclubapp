export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';
import { z } from 'zod';

const wishlistSchema = z.object({
  pubId: z.string().min(1),
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
    const { pubId } = wishlistSchema.parse(body);

    // Check if pub exists in your static data
    const pub = pubData.find(p => p.id === pubId);
    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      );
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_pubId: {
          userId: session.user.id,
          pubId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Pub is already in your wishlist' },
        { status: 400 }
      );
    }

    // Add to wishlist
    await prisma.wishlist.create({
      data: {
        userId: session.user.id,
        pubId,
      },
    });

    // Update pub counter
    await prisma.pub.update({
      where: { id: pubId },
      data: {
        wishlistCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Try to get pubId from request body first, then fall back to query params
    let pubId: string | null = null;
    try {
      const body = await request.json();
      pubId = body.pubId;
    } catch {
      // If body parsing fails, try query params
      const { searchParams } = new URL(request.url);
      pubId = searchParams.get('pubId');
    }

    if (!pubId) {
      return NextResponse.json(
        { error: 'pubId is required' },
        { status: 400 }
      );
    }

    // Remove from wishlist
    const deleted = await prisma.wishlist.deleteMany({
      where: {
        userId: session.user.id,
        pubId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Pub not found in wishlist' },
        { status: 404 }
      );
    }

    // Update pub counter
    await prisma.pub.update({
      where: { id: pubId },
      data: {
        wishlistCount: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}
