'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';

interface Fixture {
  id: number;
  name: string | null;
  starting_at: string | null;
  starting_at_timestamp: number | null;
  channelSlug: string | null;
  channelName: string;
  channelLink: string;
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

export default function UpcomingFixturesSection() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/fixtures/upcoming')
      .then((res) => res.json())
      .then((json) => {
        setFixtures(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => setFixtures([]))
      .finally(() => setLoading(false));
  }, []);

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
    return null;
  }

  return (
    <section className="py-16 bg-white">
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
          className="md:hidden -mx-4 px-4 overflow-x-auto flex gap-3 snap-x snap-mandatory scroll-p-4 pb-3"
          role="list"
          aria-label="Upcoming sports fixtures"
        >
          {fixtures.map((fixture) => (
            <div key={fixture.id} role="listitem" className="snap-start">
              <Link
                href={fixture.channelLink}
                className="block group w-[240px] min-w-[240px] max-w-[240px] flex-shrink-0"
              >
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-[#08d78c]/20 to-[#06b875]/20 relative flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-[#08d78c]" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#08d78c] transition-colors line-clamp-2 min-h-[3rem]">
                      {fixture.name || 'Fixture'}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {formatFixtureDate(fixture.starting_at)}
                      {fixture.channelName ? ` · ${fixture.channelName}` : ''}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="relative hidden md:block">
          <div className="overflow-hidden">
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
                  className="w-1/4 min-w-0 flex-shrink-0 px-2"
                >
                  <Link href={fixture.channelLink} className="block group">
                    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-[#08d78c]/20 to-[#06b875]/20 relative flex items-center justify-center">
                        <Trophy className="w-12 h-12 text-[#08d78c]" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#08d78c] transition-colors line-clamp-2">
                          {fixture.name || 'Fixture'}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {formatFixtureDate(fixture.starting_at)}
                          {fixture.channelName ? ` · ${fixture.channelName}` : ''}
                        </p>
                      </div>
                    </div>
                  </Link>
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
