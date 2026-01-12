'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, MapPin } from 'lucide-react';
import { useAnalytics } from '@/lib/analytics-client';

interface TrendingTile {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  icon: string;
  city: string;
  amenity: string;
  pubCount: number;
  score: number;
  isSeasonal?: boolean;
}

export default function TrendingTiles() {
  const [tiles, setTiles] = useState<TrendingTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleTiles, setVisibleTiles] = useState(6);
  const { trackHomepageTile, flush } = useAnalytics();
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadTrendingTiles();
  }, []);

  const loadTrendingTiles = async () => {
    try {
      const response = await fetch('/api/homepage/slots');
      if (response.ok) {
        const data = await response.json();
        console.log('Homepage slots API response:', data);
        setTiles(data.tiles || []);
      } else {
        console.log('API response not ok, using fallback tiles');
        // Fallback to static tiles
        setTiles(getFallbackTiles());
      }
    } catch (error) {
      console.error('Error loading trending tiles:', error);
      setTiles(getFallbackTiles());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackTiles = (): TrendingTile[] => [
    {
      id: '1',
      title: 'Dog Friendly Pubs in Wandsworth',
      subtitle: 'Pubs where your furry friend is welcome',
      href: '/area/wandsworth/dog-friendly',
      icon: '🐕',
      city: 'London',
      amenity: 'Dog Friendly',
      pubCount: 12,
      score: 0.95
    },
    {
      id: '2',
      title: 'Cocktails in Sutton',
      subtitle: 'Creative drinks & mixology',
      href: '/area/sutton/cocktails',
      icon: '🍸',
      city: 'London',
      amenity: 'Cocktails',
      pubCount: 12,
      score: 0.92
    },
    {
      id: '3',
      title: 'Real Ale & Craft Beer in Croydon',
      subtitle: 'Local brews & independent taps',
      href: '/area/croydon/real-ale-craft-beer',
      icon: '🍺',
      city: 'London',
      amenity: 'Real Ale & Craft Beer',
      pubCount: 15,
      score: 0.89
    },
    {
      id: '4',
      title: 'Great Food in Bromley',
      subtitle: 'Delicious meals & pub classics',
      href: '/area/bromley/food-served',
      icon: '🍽️',
      city: 'London',
      amenity: 'Food Served',
      pubCount: 18,
      score: 0.87
    },
    {
      id: '5',
      title: 'Cocktails in Kingston upon Thames',
      subtitle: 'Creative drinks & mixology',
      href: '/area/kingston-upon-thames/cocktails',
      icon: '🍸',
      city: 'London',
      amenity: 'Cocktails',
      pubCount: 6,
      score: 0.85
    },
    {
      id: '6',
      title: 'Live Music in Sutton',
      subtitle: 'Bands, DJs & acoustic nights',
      href: '/area/sutton/live-music',
      icon: '🎵',
      city: 'London',
      amenity: 'Live Music',
      pubCount: 10,
      score: 0.83
    }
  ];

  const handleTileClick = (tile: TrendingTile) => {
    // Track click using analytics client
    trackHomepageTile({
      slotId: tile.id,
      type: 'click',
      title: tile.title,
      amenity: tile.amenity,
      city: tile.city,
      href: tile.href,
    });
    
    // Also track with gtag for backward compatibility
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'home_tile_click', {
        event_category: 'homepage',
        event_label: tile.title,
        slot_id: tile.id,
        amenity: tile.amenity,
        city: tile.city,
        pub_count: tile.pubCount
      });
    }
    
    // Flush analytics after a short delay
    setTimeout(() => {
      flush();
    }, 500);
  };

  // Set up IntersectionObserver for impression tracking
  useEffect(() => {
    if (tiles.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tileId = entry.target.getAttribute('data-tile-id');
            if (tileId && !trackedImpressions.current.has(tileId)) {
              trackedImpressions.current.add(tileId);
              
              const tile = tiles.find(t => t.id === tileId);
              if (tile) {
                trackHomepageTile({
                  slotId: tile.id,
                  type: 'impression',
                  title: tile.title,
                  amenity: tile.amenity,
                  city: tile.city,
                  href: tile.href,
                });
                
                // Also track with gtag for backward compatibility
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'home_tile_view', {
                    event_category: 'homepage',
                    event_label: tile.title,
                    slot_id: tile.id,
                    amenity: tile.amenity,
                    city: tile.city
                  });
                }
              }
            }
          }
        });
      },
      {
        threshold: 0.5, // Track when 50% of tile is visible
        rootMargin: '0px',
      }
    );

    // Observe all visible tiles
    tileRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [tiles, trackHomepageTile]);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trending Now</h2>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-8 h-8 text-[#08d78c]" />
            <h2 className="text-3xl font-bold text-gray-900">Trending Now</h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the most popular pub experiences across the UK. 
            These trending combinations are based on what people are searching for right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.slice(0, visibleTiles).map((tile) => (
            <Link
              key={tile.id}
              href={tile.href}
              className="block group"
              onClick={() => handleTileClick(tile)}
            >
              <div
                ref={(el) => {
                  if (el) {
                    tileRefs.current.set(tile.id, el);
                  } else {
                    tileRefs.current.delete(tile.id);
                  }
                }}
                data-tile-id={tile.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden h-full flex flex-col"
              >
                {/* Tile Header */}
                <div className="p-6 pb-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{tile.icon}</div>
                    {tile.isSeasonal && (
                      <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-semibold">
                        Seasonal
                      </div>
                    )}
                  </div>
                  
                  {/* Fixed height title area - can accommodate 2 lines */}
                  <div className="h-14 mb-2 flex items-start">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#08d78c] transition-colors leading-tight">
                      {tile.title}
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                    {tile.subtitle}
                  </p>
                </div>

                {/* Tile Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{tile.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {tile.pubCount} pubs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Show More Button */}
        {tiles.length > visibleTiles && (
          <div className="text-center mt-8">
            <button
              onClick={() => setVisibleTiles(prev => Math.min(prev + 6, tiles.length))}
              className="bg-white hover:bg-gray-50 border-2 border-[#08d78c] text-[#08d78c] hover:text-[#06b875] px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Show More Trending Pubs
            </button>
          </div>
        )}
      </div>
    </section>
  );
}