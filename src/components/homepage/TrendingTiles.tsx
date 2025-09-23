'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, MapPin } from 'lucide-react';

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

  useEffect(() => {
    loadTrendingTiles();
  }, []);

  const loadTrendingTiles = async () => {
    try {
      const response = await fetch('/api/homepage/slots');
      if (response.ok) {
        const data = await response.json();
        setTiles(data.tiles || []);
      } else {
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
      title: 'Best Dog-Friendly Pubs in Brixton',
      subtitle: 'Pubs where your furry friend is welcome',
      href: '/area/brixton?amenities=Dog Friendly',
      icon: '🐕',
      city: 'London',
      amenity: 'Dog Friendly',
      pubCount: 12,
      score: 0.95
    },
    {
      id: '2',
      title: 'Beer Gardens in Manchester',
      subtitle: 'Sunny terraces & cold pints',
      href: '/area/manchester?amenities=Beer Garden',
      icon: '🌳',
      city: 'Manchester',
      amenity: 'Beer Garden',
      pubCount: 18,
      score: 0.92
    },
    {
      id: '3',
      title: 'Sunday Roast in Edinburgh',
      subtitle: 'Traditional Sunday dinners',
      href: '/area/edinburgh?amenities=Sunday Roast',
      icon: '🍖',
      city: 'Edinburgh',
      amenity: 'Sunday Roast',
      pubCount: 15,
      score: 0.89
    },
    {
      id: '4',
      title: 'Sky Sports in Birmingham',
      subtitle: 'Watch the game with great atmosphere',
      href: '/area/birmingham?amenities=Sky Sports',
      icon: '📺',
      city: 'Birmingham',
      amenity: 'Sky Sports',
      pubCount: 22,
      score: 0.87
    },
    {
      id: '5',
      title: 'Pub Quiz in Bristol',
      subtitle: 'Test your knowledge & win prizes',
      href: '/area/bristol?amenities=Pub Quiz',
      icon: '🧠',
      city: 'Bristol',
      amenity: 'Pub Quiz',
      pubCount: 14,
      score: 0.85
    },
    {
      id: '6',
      title: 'Live Music in Camden',
      subtitle: 'Bands, DJs & acoustic nights',
      href: '/area/camden?amenities=Live Music',
      icon: '🎵',
      city: 'London',
      amenity: 'Live Music',
      pubCount: 20,
      score: 0.83
    },
    {
      id: '7',
      title: 'Craft Beer in Leeds',
      subtitle: 'Local brews & independent taps',
      href: '/area/leeds?amenities=Craft Beer',
      icon: '🍺',
      city: 'Leeds',
      amenity: 'Craft Beer',
      pubCount: 16,
      score: 0.81
    },
    {
      id: '8',
      title: 'WiFi-Friendly in Liverpool',
      subtitle: 'Work-friendly pubs with good internet',
      href: '/area/liverpool?amenities=WiFi',
      icon: '📶',
      city: 'Liverpool',
      amenity: 'WiFi',
      pubCount: 19,
      score: 0.79
    }
  ];

  const handleTileClick = (tile: TrendingTile) => {
    // Track analytics
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
  };

  const handleTileView = (tile: TrendingTile) => {
    // Track impression
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'home_tile_view', {
        event_category: 'homepage',
        event_label: tile.title,
        slot_id: tile.id,
        amenity: tile.amenity,
        city: tile.city
      });
    }
  };

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
              onMouseEnter={() => handleTileView(tile)}
            >
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden h-full">
                {/* Tile Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{tile.icon}</div>
                    {tile.isSeasonal && (
                      <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-semibold">
                        Seasonal
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#08d78c] transition-colors line-clamp-2">
                    {tile.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {tile.subtitle}
                  </p>
                </div>

                {/* Tile Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
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