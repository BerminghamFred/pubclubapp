import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Cron: clear all upcoming fixtures (e.g. before re-running refresh-fixtures for a clean slate). */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.upcomingFixture.deleteMany({});
    return NextResponse.json({
      message: 'Fixtures cleared',
      count: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/clear-fixtures] error:', err);
    return NextResponse.json(
      { error: 'Failed to clear fixtures' },
      { status: 500 }
    );
  }
}
