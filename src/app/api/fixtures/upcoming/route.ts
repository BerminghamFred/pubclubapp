export const runtime = 'nodejs';
export const revalidate = 300; // 5 min cache

import { NextResponse } from 'next/server';

// TheSportsDB: https://www.thesportsdb.com/documentation
// TV schedule returns events with broadcast channel (strChannel) - no league mapping.
// Free key: 123. Premium key in env THE_SPORTS_DB_API_KEY for higher limits.

const BASE = 'https://www.thesportsdb.com/api/v1/json';

interface TVEvent {
  id?: string;
  idEvent?: string;
  strEvent?: string;
  dateEvent?: string;
  strTime?: string;
  strTimeStamp?: string;
  strChannel?: string;
  strSport?: string;
  strCountry?: string;
}

interface FixtureWithChannel {
  id: number;
  name: string | null;
  starting_at: string | null;
  starting_at_timestamp: number | null;
  channelSlug: string | null;
  channelName: string;
  channelLink: string;
}

/** Map broadcast channel name from API to our vibe slug and display name. */
function channelFromBroadcast(strChannel: string | null | undefined): {
  channelSlug: string | null;
  channelName: string;
} {
  if (!strChannel || !strChannel.trim()) {
    return { channelSlug: 'sky-sports', channelName: 'Sky Sports' };
  }
  const c = strChannel.toLowerCase();
  if (c.includes('sky')) return { channelSlug: 'sky-sports', channelName: 'Sky Sports' };
  if (c.includes('tnt') || c.includes('bt sport')) return { channelSlug: 'tnt-sports', channelName: 'TNT Sports' };
  if (c.includes('amazon')) return { channelSlug: null, channelName: 'Amazon Prime' };
  if (c.includes('bbc') || c.includes('itv') || c.includes('channel 4') || c.includes('terrestrial')) {
    return { channelSlug: null, channelName: 'Terrestrial TV' };
  }
  return { channelSlug: null, channelName: strChannel.trim() };
}

function buildChannelLink(channelSlug: string | null, channelName: string): string {
  if (channelSlug) return `/vibe/${channelSlug}`;
  return `/pubs?amenities=${encodeURIComponent(channelName)}`;
}

function parseTimestamp(dateEvent: string | undefined, strTime: string | undefined, strTimeStamp: string | undefined): number | null {
  if (strTimeStamp) {
    const t = Date.parse(strTimeStamp.replace(' ', 'T'));
    if (!Number.isNaN(t)) return Math.floor(t / 1000);
  }
  if (dateEvent && strTime) {
    const t = Date.parse(`${dateEvent}T${strTime}`);
    if (!Number.isNaN(t)) return Math.floor(t / 1000);
  }
  if (dateEvent) {
    const t = Date.parse(dateEvent);
    if (!Number.isNaN(t)) return Math.floor(t / 1000);
  }
  return null;
}

export async function GET() {
  const apiKey = process.env.THE_SPORTS_DB_API_KEY || '123';
  const today = new Date();
  const events: TVEvent[] = [];
  const daysToFetch = 7;

  try {
    for (let i = 0; i < daysToFetch; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const url = `${BASE}/${apiKey}/eventstv.php?d=${dateStr}&a=United_Kingdom`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) continue;
      const json = await res.json();
      const list = json.tvevents ?? json.events ?? [];
      if (Array.isArray(list)) events.push(...list);
    }

    const now = Math.floor(Date.now() / 1000);
    const seen = new Set<string>();
    const withChannel: FixtureWithChannel[] = (events as TVEvent[])
      .filter((e) => {
        const ts = parseTimestamp(e.dateEvent, e.strTime, e.strTimeStamp);
        const id = e.idEvent ?? e.id ?? `${e.strEvent}-${e.dateEvent}-${e.strTime}`;
        if (seen.has(String(id)) || (ts != null && ts < now)) return false;
        seen.add(String(id));
        return true;
      })
      .sort((a, b) => {
        const ta = parseTimestamp(a.dateEvent, a.strTime, a.strTimeStamp) ?? 0;
        const tb = parseTimestamp(b.dateEvent, b.strTime, b.strTimeStamp) ?? 0;
        return ta - tb;
      })
      .slice(0, 50)
      .map((e) => {
        const id = parseInt(e.idEvent ?? e.id ?? '0', 10) || 0;
        const name = e.strEvent ?? null;
        const dateEvent = e.dateEvent ?? null;
        const strTime = e.strTime ?? '';
        const iso = dateEvent && strTime ? `${dateEvent}T${strTime}` : dateEvent;
        const ts = parseTimestamp(e.dateEvent, e.strTime, e.strTimeStamp);
        const { channelSlug, channelName } = channelFromBroadcast(e.strChannel);
        const channelLink = buildChannelLink(channelSlug, channelName);
        return {
          id,
          name,
          starting_at: iso,
          starting_at_timestamp: ts,
          channelSlug,
          channelName,
          channelLink,
        };
      });

    return NextResponse.json(
      { data: withChannel },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('[fixtures/upcoming] TheSportsDB error:', err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
