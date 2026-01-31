'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';

interface Fixture {
  id: string | number;
  name: string | null;
  sport: string | null;
  league: string | null;
  imageUrl: string | null;
  starting_at: string | null;
  starting_at_timestamp: number | null;
  channelSlug: string | null;
  channelName: string;
  channelLink: string;
  country: string | null;
}

interface LiveScore {
  homeScore: number | null;
  awayScore: number | null;
  progress: string | null;
}

/** Leagues we show: Premier League, Champions League, and selected rugby leagues only. */
const ALLOWED_LEAGUES = [
  'premier league',
  'champions league',
  'europa league',
  'conference league',
  'efl cup',
  'fa cup',
  'six nations',
  'nrl ',
  'super league',
  'challenge cup',
];

function isExcludedLeague(text: string): boolean {
  const s = text.toLowerCase();
  if (s.includes('six nations')) return false;
  return (
    s.includes('championship') ||
    s.includes('league one') ||
    s.includes('league two')
  );
}

function isAllowedLeague(leagueOrName: string): boolean {
  const s = leagueOrName.toLowerCase();
  if (s.includes('championship') && !s.includes('champions league')) return false;
  return ALLOWED_LEAGUES.some((allowed) => s.includes(allowed));
}

/**
 * Frontend filter: show only fixtures whose league or name matches ALLOWED_LEAGUES (no country gate).
 */
function filterFixturesForHomepage(fixtures: Fixture[]): Fixture[] {
  return fixtures.filter((f) => {
    const league = (f.league ?? '').trim();
    const name = (f.name ?? '').trim();
    const sport = (f.sport ?? '').toLowerCase();
    const text = `${league} ${name}`.toLowerCase();

    if (isExcludedLeague(text)) return false;

    if (league || name) {
      if (isAllowedLeague(league || name)) return true;
    }

    if (sport === 'soccer' || sport === 'football') {
      return (
        text.includes('premier league') ||
        (text.includes('champions league') && !text.includes('championship'))
      );
    }
    if (sport.includes('rugby') || text.includes('rugby') || text.includes('six nations')) return true;

    return false;
  });
}

function formatFixtureDate(startingAt: string | null): string {
  if (!startingAt) return '';
  try {
    const d = new Date(startingAt);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function FixtureCard({
  fixture,
  liveScore,
  className = '',
}: {
  fixture: Fixture;
  liveScore: LiveScore | undefined;
  className?: string;
}) {
  const idStr = String(fixture.id);
  const hasScore =
    liveScore &&
    (liveScore.homeScore !== null || liveScore.awayScore !== null);
  const scoreText =
    hasScore && liveScore
      ? `${liveScore.homeScore ?? '-'} – ${liveScore.awayScore ?? '-'}`
      : null;

  return (
    <Link href={fixture.channelLink} className={`block group ${className}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col h-full min-h-[260px]">
        <div className="aspect-video bg-gradient-to-br from-[#08d78c]/20 to-[#06b875]/20 relative flex items-center justify-center flex-shrink-0 overflow-hidden">
          {fixture.imageUrl ? (
            <Image
              src={fixture.imageUrl}
              alt={fixture.name ?? 'Fixture'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 240px, 25vw"
            />
          ) : (
            <Trophy className="w-12 h-12 text-[#08d78c] relative z-10" />
          )}
          {hasScore && (
            <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded z-10">
              LIVE
            </span>
          )}
        </div>
        <div className="p-4 pb-5 flex flex-col flex-1 min-h-0">
          <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#08d78c] transition-colors line-clamp-2 min-h-[3.5rem]">
            {fixture.name || 'Fixture'}
          </h3>
          <div className="mt-auto pt-2 border-t border-gray-100">
            {scoreText != null && (
              <p className="text-gray-900 font-semibold text-sm mb-0.5">
                {scoreText}
                {liveScore?.progress ? ` · ${liveScore.progress}` : ''}
              </p>
            )}
            <p className="text-gray-600 text-sm leading-relaxed">
              {formatFixtureDate(fixture.starting_at)}
              {fixture.channelName ? ` · ${fixture.channelName}` : ''}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

const POLL_LIVESCORES_MS = 60_000;
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours after kick-off

/** True if the fixture could be live (between start and start + 2 hours). */
function isInLiveWindow(fixture: Fixture): boolean {
  const ts = fixture.starting_at_timestamp;
  if (ts == null) return false;
  const startMs = ts * 1000;
  const now = Date.now();
  return now >= startMs && now <= startMs + LIVE_WINDOW_MS;
}

export default function UpcomingFixturesSection() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, LiveScore>>({});

  useEffect(() => {
    fetch('/api/fixtures/upcoming')
      .then((res) => res.json())
      .then((json) => {
        const all = Array.isArray(json.data) ? json.data : [];
        setFixtures(filterFixturesForHomepage(all));
      })
      .catch(() => setFixtures([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (fixtures.length === 0) return;
    const fetchScoresIfLive = () => {
      if (!fixtures.some(isInLiveWindow)) return;
      fetch('/api/fixtures/livescores')
        .then((res) => res.json())
        .then((json) => setScores(json.scores ?? {}))
        .catch(() => {});
    };
    fetchScoresIfLive();
    const interval = setInterval(fetchScoresIfLive, POLL_LIVESCORES_MS);
    return () => clearInterval(interval);
  }, [fixtures]);

  const maxCarouselIndex = Math.max(0, fixtures.length - 4);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % (maxCarouselIndex + 1 || 1));
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + (maxCarouselIndex + 1 || 1)) % (maxCarouselIndex + 1 || 1)
    );
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Upcoming sports fixtures</h2>
            <p className="text-lg text-gray-600">Find pubs showing the game</p>
          </div>
          <div className="animate-pulse flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[240px] md:w-1/4">
                <div className="bg-gray-200 rounded-lg aspect-video mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (fixtures.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Upcoming sports fixtures</h2>
            <p className="text-lg text-gray-600">
              Find pubs showing the game. Check back soon for upcoming matches.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Upcoming sports fixtures
          </h2>
          <p className="text-lg text-gray-600">
            Find pubs showing the game
          </p>
        </div>

        <div
          className="md:hidden -mx-4 px-4 overflow-x-auto flex gap-3 snap-x snap-mandatory scroll-p-4 pb-4"
          role="list"
          aria-label="Upcoming sports fixtures"
        >
          {fixtures.map((fixture) => (
            <div
              key={fixture.id}
              role="listitem"
              className="snap-start w-[240px] min-w-[240px] max-w-[240px] flex-shrink-0"
            >
              <FixtureCard
                fixture={fixture}
                liveScore={scores[String(fixture.id)]}
              />
            </div>
          ))}
        </div>

        <div className="relative hidden md:block pb-4">
          <div className="overflow-hidden pb-4">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / Math.min(4, fixtures.length))}%)`,
              }}
              role="list"
              aria-label="Upcoming sports fixtures"
            >
              {fixtures.map((fixture) => (
                <div
                  key={fixture.id}
                  className="w-1/4 min-w-0 flex-shrink-0 px-2 flex"
                >
                  <FixtureCard
                    fixture={fixture}
                    liveScore={scores[String(fixture.id)]}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {fixtures.length > 4 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
                aria-label="Previous fixtures"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
                aria-label="Next fixtures"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: maxCarouselIndex + 1 }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-[#08d78c]' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
