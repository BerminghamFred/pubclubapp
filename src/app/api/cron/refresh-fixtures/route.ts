import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BASE_V2 = 'https://www.thesportsdb.com/api/v2/json';

/** Only store fixtures on these channels (Sky, TNT, Amazon, BBC, ITV, Terrestrial). */
const ALLOWED_CHANNELS = new Set([
  'Sky Sports',
  'TNT Sports',
  'Amazon Prime',
  'BBC',
  'ITV',
  'Terrestrial TV',
]);

/** Only store fixtures broadcast in the UK (strCountry from TV filter). Sky etc. exist in other countries too. */
const ALLOWED_BROADCAST_COUNTRIES = new Set(['United Kingdom', 'UK']);

/** V2 API: GET /filter/tv/day/{date} returns { filter: TVFilterItem[] } */
interface TVFilterItem {
  id?: string;
  idEvent?: string;
  strEvent?: string;
  strEventThumb?: string | null;
  dateEvent?: string;
  strTime?: string;
  strTimeStamp?: string;
  strChannel?: string;
  strCountry?: string;
  strSport?: string;
  strLeague?: string;
}

function channelFromBroadcast(
  strChannel: string | null | undefined,
  strEvent: string | null | undefined
): { channelSlug: string | null; channelName: string } {
  if (!strChannel || !strChannel.trim()) {
    const eventName = (strEvent ?? '').toLowerCase();
    if (eventName.includes('six nations')) return { channelSlug: null, channelName: 'Terrestrial TV' };
    return { channelSlug: null, channelName: 'Other' };
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
  if (channelName === 'Terrestrial TV') return '/vibe/terrestrial-tv';
  return `/pubs?amenities=${encodeURIComponent(channelName)}`;
}

function parseTimestamp(
  dateEvent: string | undefined,
  strTime: string | undefined,
  strTimeStamp: string | undefined
): number | null {
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lookup event response: GET /lookup/event/{idEvent} returns { lookup: EventLookupItem[] } */
interface EventLookupItem {
  idEvent?: string;
  strEvent?: string;
  strLeague?: string | null;
  strSport?: string | null;
  strCountry?: string | null;
}

/** Fetch league, sport, and country for an event via lookup API; TV schedule does not return league/country. */
async function fetchEventDetails(
  apiKey: string,
  idEvent: string
): Promise<{ league: string | null; sport: string | null; country: string | null }> {
  const url = `${BASE_V2}/lookup/event/${idEvent}`;
  try {
    const res = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
    if (!res.ok) return { league: null, sport: null, country: null };
    const text = await res.text();
    let json: { lookup?: EventLookupItem[] } = {};
    try {
      if (text?.trim()) json = JSON.parse(text);
    } catch {
      return { league: null, sport: null, country: null };
    }
    const items = Array.isArray(json.lookup) ? json.lookup : [];
    const first = items[0];
    if (!first) return { league: null, sport: null, country: null };
    const league = first.strLeague?.trim() || null;
    const sport = first.strSport?.trim() || null;
    const country = first.strCountry?.trim() || null;
    return { league, sport, country };
  } catch {
    return { league: null, sport: null, country: null };
  }
}

/** Delay between event lookups to respect API rate limits (ms). */
const LOOKUP_DELAY_MS = 250;

/** Max fixtures to store (by start time). Increase if Premier League etc. are being cut off. */
const MAX_FIXTURES_TO_STORE = 250;

/** Number of days ahead to fetch from TV schedule (more days = more fixtures, including Premier League later in the week). */
const DAYS_TO_FETCH = 14;

/** Cron: pull ALL fixtures from allowed channels (any country), then lookup each event by ID for league/sport/country and save to DB. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.THE_SPORTS_DB_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'THE_SPORTS_DB_API_KEY is required for V2 API (premium)' },
      { status: 400 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const seen = new Set<string>();
  const fixtures: Array<{
    externalId: string;
    eventId: string;
    name: string | null;
    sport: string | null;
    league: string | null;
    imageUrl: string | null;
    startingAt: Date;
    channelSlug: string | null;
    channelName: string;
    channelLink: string;
    country: string | null;
    startingAtTimestamp: number;
  }> = [];

  try {
    for (let i = 0; i < DAYS_TO_FETCH; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const url = `${BASE_V2}/filter/tv/day/${dateStr}`;
      const res = await fetch(url, {
        headers: { 'X-API-KEY': apiKey },
      });
      if (!res.ok) {
        console.warn(`[cron/refresh-fixtures] TheSportsDB V2 ${dateStr} non-ok:`, res.status);
        if (i < DAYS_TO_FETCH - 1) await delay(1_000);
        continue;
      }
      const text = await res.text();
      let json: { filter?: TVFilterItem[] } = {};
      try {
        if (text?.trim()) json = JSON.parse(text);
      } catch {
        console.warn(`[cron/refresh-fixtures] TheSportsDB V2 ${dateStr} invalid or empty JSON, skipping`);
        if (i < DAYS_TO_FETCH - 1) await delay(1_000);
        continue;
      }
      const items: TVFilterItem[] = Array.isArray(json.filter) ? json.filter : [];
      for (const e of items) {
        const broadcastCountry = (e.strCountry ?? '').trim();
        if (!ALLOWED_BROADCAST_COUNTRIES.has(broadcastCountry)) continue;
        const ts = parseTimestamp(e.dateEvent, e.strTime, e.strTimeStamp);
        const eventId = String(e.idEvent ?? e.id ?? `${e.strEvent}-${e.dateEvent}-${e.strTime}`);
        const compositeId = `${eventId}-${e.strChannel ?? ''}-${e.strCountry ?? ''}`;
        if (seen.has(compositeId) || (ts != null && ts < now)) continue;
        seen.add(compositeId);
        const dateEvent = e.dateEvent ?? null;
        const strTime = e.strTime ?? '';
        const startingAt =
          dateEvent && strTime
            ? new Date(`${dateEvent}T${strTime}`)
            : dateEvent
              ? new Date(dateEvent)
              : ts != null
                ? new Date(ts * 1000)
                : new Date();
        const { channelSlug, channelName } = channelFromBroadcast(e.strChannel, e.strEvent);
        if (!ALLOWED_CHANNELS.has(channelName)) continue;
        const channelLink = buildChannelLink(channelSlug, channelName);
        const imageUrl =
          e.strEventThumb && e.strEventThumb.trim() ? e.strEventThumb.trim() : null;
        const sport = e.strSport?.trim() || null;
        const league = e.strLeague?.trim() || null;
        fixtures.push({
          externalId: compositeId,
          eventId,
          name: e.strEvent ?? null,
          sport,
          league,
          imageUrl,
          startingAt,
          channelSlug,
          channelName,
          channelLink,
          country: null, // filled from lookup/event below
          startingAtTimestamp: ts ?? 0,
        });
      }
      if (i < 6) await delay(1_000);
    }

    // Enrich with league, sport, and country from lookup/event (one lookup per unique event)
    const uniqueEventIds = [...new Set(fixtures.map((f) => f.eventId))];
    const detailsByEvent = new Map<string, { league: string | null; sport: string | null; country: string | null }>();
    for (const id of uniqueEventIds) {
      const detail = await fetchEventDetails(apiKey, id);
      detailsByEvent.set(id, detail);
      await delay(LOOKUP_DELAY_MS);
    }
    for (const f of fixtures) {
      const detail = detailsByEvent.get(f.eventId);
      if (detail) {
        if (detail.league != null) f.league = detail.league;
        if (detail.sport != null) f.sport = detail.sport;
        if (detail.country != null) f.country = detail.country;
      }
    }

    fixtures.sort((a, b) => a.startingAtTimestamp - b.startingAtTimestamp);
    const toInsert = fixtures.slice(0, MAX_FIXTURES_TO_STORE);

    await prisma.upcomingFixture.deleteMany({});
    if (toInsert.length > 0) {
      await prisma.upcomingFixture.createMany({
        data: toInsert.map((f) => ({
          externalId: f.externalId,
          eventId: f.eventId,
          name: f.name,
          sport: f.sport,
          league: f.league,
          imageUrl: f.imageUrl,
          startingAt: f.startingAt,
          channelSlug: f.channelSlug,
          channelName: f.channelName,
          channelLink: f.channelLink,
          country: f.country,
        })),
      });
    }

    return NextResponse.json({
      message: 'Fixtures refreshed',
      count: toInsert.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/refresh-fixtures] error:', err);
    return NextResponse.json(
      { error: 'Failed to refresh fixtures', detail: message },
      { status: 500 }
    );
  }
}
