export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Debug: see what TheSportsDB API returns and what we have in DB.
 * GET /api/fixtures/debug — inspect API response shape and DB league/sport values.
 */
export async function GET() {
  const apiKey = process.env.THE_SPORTS_DB_API_KEY?.trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  const url = `https://www.thesportsdb.com/api/v2/json/filter/tv/day/${dateStr}`;

  let apiSample: Record<string, unknown>[] = [];
  let apiError: string | null = null;

  if (apiKey) {
    try {
      const res = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
      const json = (await res.json()) as { filter?: Record<string, unknown>[] };
      const items = Array.isArray(json.filter) ? json.filter : [];
      apiSample = items.slice(0, 5).map((item) => ({ ...item }));
    } catch (e) {
      apiError = e instanceof Error ? e.message : String(e);
    }
  }

  let dbSample: { name: string | null; sport: string | null; league: string | null }[] = [];
  let dbAll: Array<{ externalId: string; name: string | null; league: string | null; sport: string | null; country: string | null; channelName: string; startingAt: string }> = [];
  try {
    const rows = await prisma.upcomingFixture.findMany({
      orderBy: { startingAt: 'asc' },
      take: 10,
      select: { name: true, sport: true, league: true },
    });
    dbSample = rows;
    const allRows = await prisma.upcomingFixture.findMany({
      orderBy: { startingAt: 'asc' },
      select: {
        externalId: true,
        name: true,
        league: true,
        sport: true,
        country: true,
        channelName: true,
        startingAt: true,
      },
    });
    dbAll = allRows.map((r) => ({
      externalId: r.externalId,
      name: r.name,
      league: r.league,
      sport: r.sport,
      country: r.country,
      channelName: r.channelName,
      startingAt: r.startingAt.toISOString(),
    }));
  } catch (e) {
    // ignore
  }

  return NextResponse.json({
    api: {
      url,
      hasKey: !!apiKey,
      error: apiError,
      sampleItemKeys: apiSample[0] ? Object.keys(apiSample[0]) : [],
      sampleItems: apiSample,
    },
    db: {
      sample: dbSample,
      withLeague: dbSample.filter((r) => r.league != null && r.league !== '').length,
      withSport: dbSample.filter((r) => r.sport != null && r.sport !== '').length,
      /** All fixture rows: open /api/fixtures/debug and inspect db.all to see name, league, sport, country for each row. */
      all: dbAll,
      total: dbAll.length,
    },
  });
}
