export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List all connection requests (pending first)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { type?: string }).type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await prisma.pubManagerConnectionRequest.findMany({
      where: {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const pubIds = [...new Set(requests.map((r) => r.pubId))];
    const pubs = await prisma.pub.findMany({
      where: { id: { in: pubIds } },
      select: { id: true, name: true, slug: true, borough: { select: { name: true } }, city: { select: { name: true } } },
    });
    const pubMap = Object.fromEntries(pubs.map((p) => [p.id, { name: p.name, slug: p.slug, area: p.borough?.name || p.city?.name || '' }]));

    const items = requests.map((r) => ({
      id: r.id,
      email: r.email,
      pubId: r.pubId,
      pubName: pubMap[r.pubId]?.name || r.pubId,
      slug: pubMap[r.pubId]?.slug,
      area: pubMap[r.pubId]?.area,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ success: true, requests: items });
  } catch (error) {
    console.error('Admin connection requests GET:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

// PATCH - Approve or reject a connection request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { type?: string }).type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
    }

    const conn = await prisma.pubManagerConnectionRequest.findUnique({
      where: { id },
    });
    if (!conn) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (conn.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (status === 'approved') {
      const email = conn.email.toLowerCase();
      let manager = await prisma.manager.findUnique({
        where: { email },
      });
      if (!manager) {
        manager = await prisma.manager.create({
          data: { email },
        });
      }
      await prisma.pubManager.upsert({
        where: { pubId_managerId: { pubId: conn.pubId, managerId: manager.id } },
        create: { pubId: conn.pubId, managerId: manager.id, role: 'owner' },
        update: {},
      });
    }

    await prisma.pubManagerConnectionRequest.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Admin connection requests PATCH:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
