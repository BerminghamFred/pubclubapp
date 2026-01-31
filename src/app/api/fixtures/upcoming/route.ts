export const runtime = 'nodejs';
export const revalidate = 60; // 1 min cache; data is refreshed daily by cron

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Group key for same event (e.g. Sky + Terrestrial showing same game = one card). */
function eventKey(row: { eventId: string | null; name: string | null; startingAt: Date }): string {
  if (row.eventId?.trim()) return row.eventId.trim();
  return `${row.name ?? ''}|${row.startingAt.getTime()}`;
}

/** Build link to pubs with any of the given channel names (OR). */
function buildMultiChannelLink(channelNames: string[]): string {
  const unique = [...new Set(channelNames.filter(Boolean))];
  if (unique.length === 0) return '/pubs';
  if (unique.length === 1) return `/pubs?amenities=${encodeURIComponent(unique[0])}`;
  return `/pubs?amenities=${encodeURIComponent(unique.join(','))}`;
}

/** Serves cached upcoming fixtures from DB, deduplicated by event (one card per match; merged channels). */
export async function GET() {
  try {
    const now = new Date();
    const rows = await prisma.upcomingFixture.findMany({
      where: { startingAt: { gte: now } },
      orderBy: { startingAt: 'asc' },
      take: 200,
    });

    const byEvent = new Map<
      string,
      {
        eventId: string | null;
        externalId: string;
        name: string | null;
        sport: string | null;
        league: string | null;
        imageUrl: string | null;
        startingAt: Date;
        country: string | null;
        channelNames: string[];
        channelLinks: string[];
      }
    >();

    for (const f of rows) {
      const key = eventKey({
        eventId: f.eventId ?? null,
        name: f.name,
        startingAt: f.startingAt,
      });
      const existing = byEvent.get(key);
      if (existing) {
        if (!existing.channelNames.includes(f.channelName)) existing.channelNames.push(f.channelName);
        if (!existing.channelLinks.includes(f.channelLink)) existing.channelLinks.push(f.channelLink);
        continue;
      }
      byEvent.set(key, {
        eventId: f.eventId ?? null,
        externalId: f.externalId,
        name: f.name,
        sport: f.sport ?? null,
        league: f.league ?? null,
        imageUrl: f.imageUrl ?? null,
        startingAt: f.startingAt,
        country: f.country ?? null,
        channelNames: [f.channelName],
        channelLinks: [f.channelLink],
      });
    }

    const data = Array.from(byEvent.values()).map((f) => {
      const channelName = f.channelNames.length === 1 ? f.channelNames[0]! : f.channelNames.join(' & ');
      const channelLink = f.channelNames.length === 1 ? f.channelLinks[0]! : buildMultiChannelLink(f.channelNames);
      const id = f.eventId ?? f.externalId;
      return {
        id,
        name: f.name,
        sport: f.sport,
        league: f.league,
        imageUrl: f.imageUrl,
        starting_at: f.startingAt.toISOString(),
        starting_at_timestamp: Math.floor(f.startingAt.getTime() / 1000),
        channelSlug: null as string | null,
        channelName,
        channelLink,
        country: f.country,
        eventId: f.eventId,
      };
    });

    const sorted = data
      .sort((a, b) => a.starting_at_timestamp - b.starting_at_timestamp)
      .slice(0, 50);

    return NextResponse.json(
      { data: sorted },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err) {
    console.error('[fixtures/upcoming] DB error:', err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
