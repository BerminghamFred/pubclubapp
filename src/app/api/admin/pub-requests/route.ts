export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/pub-requests - Get all pub requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'all' ? { status } : {};

    const pubRequests = await prisma.pubRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ pubRequests });
  } catch (error) {
    console.error('Error fetching pub requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pub requests' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/pub-requests - Update pub request status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'reviewed', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const pubRequest = await prisma.pubRequest.update({
      where: { id },
      data: {
        status,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      pubRequest,
    });
  } catch (error) {
    console.error('Error updating pub request:', error);
    return NextResponse.json(
      { error: 'Failed to update pub request' },
      { status: 500 }
    );
  }
}

