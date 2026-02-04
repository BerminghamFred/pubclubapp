import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const managers = await prisma.manager.findMany({
      include: {
        pubs: {
          include: {
            pub: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        logins: {
          orderBy: { loggedInAt: 'desc' },
          take: 1,
          include: {
            pub: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { logins: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = managers.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name ?? undefined,
      createdAt: m.createdAt.toISOString(),
      pubs: m.pubs.map((pm) => ({
        pub: pm.pub,
        role: pm.role,
      })),
      lastLogin: m.logins[0]
        ? {
            loggedInAt: m.logins[0].loggedInAt.toISOString(),
            pub: m.logins[0].pub
              ? { id: m.logins[0].pub.id, name: m.logins[0].pub.name }
              : { id: '', name: 'Unknown' },
          }
        : undefined,
      loginCount: m._count.logins,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch managers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    );
  }
}
