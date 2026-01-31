export const runtime = 'nodejs';
export const revalidate = 60;

import { NextResponse } from 'next/server';

const BASE_V2 = 'https://www.thesportsdb.com/api/v2/json';

interface LiveEvent {
  idEvent?: string;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  strProgress?: string | null;
}

/** Returns live scores keyed by idEvent for merging with upcoming fixtures. Poll every 60s when showing fixtures. */
export async function GET() {
  const apiKey = process.env.THE_SPORTS_DB_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ scores: {} }, { status: 200 });
  }

  try {
    const res = await fetch(`${BASE_V2}/livescore/soccer`, {
      headers: { 'X-API-KEY': apiKey },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ scores: {} }, { status: 200 });
    }
    const text = await res.text();
    let json: { events?: LiveEvent[]; livescores?: LiveEvent[] } = {};
    try {
      if (text?.trim()) json = JSON.parse(text);
    } catch {
      return NextResponse.json({ scores: {} }, { status: 200 });
    }
    const events = Array.isArray(json.events)
      ? json.events
      : Array.isArray(json.livescores)
        ? json.livescores
        : [];
    const scores: Record<
      string,
      { homeScore: number | null; awayScore: number | null; progress: string | null }
    > = {};
    for (const e of events) {
      const id = e.idEvent != null ? String(e.idEvent) : null;
      if (!id) continue;
      const homeRaw =
        e.intHomeScore != null && e.intHomeScore !== ''
          ? Number(e.intHomeScore)
          : NaN;
      const awayRaw =
        e.intAwayScore != null && e.intAwayScore !== ''
          ? Number(e.intAwayScore)
          : NaN;
      scores[id] = {
        homeScore: Number.isNaN(homeRaw) ? null : homeRaw,
        awayScore: Number.isNaN(awayRaw) ? null : awayRaw,
        progress: e.strProgress ?? null,
      };
    }
    return NextResponse.json(
      { scores },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
    );
  } catch {
    return NextResponse.json({ scores: {} }, { status: 200 });
  }
}
