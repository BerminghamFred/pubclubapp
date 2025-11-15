export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pubData } from '@/data/pubData';
import { z } from 'zod';

const checkinSchema = z.object({
  pubId: z.string().min(1),
  note: z.string().max(500).optional(),
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
    const { pubId, note } = checkinSchema.parse(body);

    // Check if pub exists in your static data
    const pub = pubData.find(p => p.id === pubId);
    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      );
    }

    // Check if already checked in
    const existing = await prisma.checkin.findUnique({
      where: {
        userId_pubId: {
          userId: session.user.id,
          pubId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already checked in to this pub' },
        { status: 400 }
      );
    }

    // Create check-in
    const checkin = await prisma.checkin.create({
      data: {
        userId: session.user.id,
        pubId,
        note,
      },
    });

    // Update pub counter
    await prisma.pub.update({
      where: { id: pubId },
      data: {
        checkinCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      checkin: {
        id: checkin.id,
        pubId: checkin.pubId,
        note: checkin.note,
        visitedAt: checkin.visitedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating check-in:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in' },
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

    const { searchParams } = new URL(request.url);
    const pubId = searchParams.get('pubId');

    if (!pubId) {
      return NextResponse.json(
        { error: 'pubId is required' },
        { status: 400 }
      );
    }

    // Remove check-in
    const deleted = await prisma.checkin.deleteMany({
      where: {
        userId: session.user.id,
        pubId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      );
    }

    // Update pub counter
    await prisma.pub.update({
      where: { id: pubId },
      data: {
        checkinCount: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to remove check-in' },
      { status: 500 }
    );
  }
}
