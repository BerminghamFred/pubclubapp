export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getPubManagerFromRequest } from '@/utils/auth';
import { prisma } from '@/lib/prisma';

// GET - List current manager's connection requests and already linked pubs
export async function GET(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const email = authData.token.email.toLowerCase();
    const linkedPubIds = authData.pubs.map((p: { id: string }) => p.id);

    const requests = await prisma.pubManagerConnectionRequest.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    const pubIds = [...new Set(requests.map((r) => r.pubId))];
    const pubs = await prisma.pub.findMany({
      where: { id: { in: pubIds } },
      select: { id: true, name: true },
    });
    const pubNames: Record<string, string> = Object.fromEntries(pubs.map((p) => [p.id, p.name]));

    const requestsWithNames = requests.map((r) => ({
      id: r.id,
      pubId: r.pubId,
      pubName: pubNames[r.pubId] || r.pubId,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      requests: requestsWithNames,
      linkedPubIds,
    });
  } catch (error) {
    console.error('Connect GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load.' },
      { status: 500 }
    );
  }
}

// POST - Create a connection request (add pub to my chain)
export async function POST(request: NextRequest) {
  try {
    const authData = await getPubManagerFromRequest(request);
    if (!authData) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const pubId = (body.pubId || '').trim();
    if (!pubId) {
      return NextResponse.json(
        { success: false, message: 'pubId is required.' },
        { status: 400 }
      );
    }

    const email = authData.token.email.toLowerCase();
    const linkedPubIds = authData.pubs.map((p: { id: string }) => p.id);

    if (linkedPubIds.includes(pubId)) {
      return NextResponse.json(
        { success: false, message: 'You already manage this pub.' },
        { status: 400 }
      );
    }

    const pub = await prisma.pub.findUnique({
      where: { id: pubId },
      select: { id: true, name: true },
    });
    if (!pub) {
      return NextResponse.json(
        { success: false, message: 'Pub not found.' },
        { status: 404 }
      );
    }

    await prisma.pubManagerConnectionRequest.upsert({
      where: {
        email_pubId: { email, pubId },
      },
      create: {
        email,
        pubId,
        status: 'pending',
      },
      update: {
        status: 'pending',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Request sent – we'll verify and connect you soon.",
    });
  } catch (error) {
    console.error('Connect POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send request.' },
      { status: 500 }
    );
  }
}
