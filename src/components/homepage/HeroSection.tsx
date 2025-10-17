'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { SearchSuggestion } from '@/utils/searchUtils';

export default function HeroSection() {
  const [searchSelections, setSearchSelections] = useState<SearchSuggestion[]>([]);

  const handleSearch = (selections: SearchSuggestion[]) => {
    setSearchSelections(selections);
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'home_search', {
        event_category: 'homepage',
        event_label: 'search_bar',
        selections_count: selections.length,
        selection_types: selections.map(s => s.type).join(',')
      });
    }
  };

  const quickChips = [
    { label: 'Dog Friendly', href: '/vibe/dog-friendly', icon: '🐕' },
    { label: 'Beer Garden', href: '/vibe/beer-garden', icon: '🌳' },
    { label: 'Sunday Roast', href: '/vibe/sunday-roast', icon: '🍖' },
    { label: 'Sky Sports', href: '/vibe/sky-sports', icon: '📺' },
    { label: 'Pub Quiz', href: '/vibe/pub-quiz', icon: '🧠' },
    { label: 'Live Music', href: '/vibe/live-music', icon: '🎵' },
    { label: 'Craft Beer', href: '/vibe/real-ale-craft-beer', icon: '🍺' },
    { label: 'Cocktails', href: '/vibe/cocktails', icon: '🍸' }
  ];

  return (
    <section className="bg-gradient-to-br from-[#08d78c] to-[#06b875] text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Find Your Perfect Pub
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Discover London's best pubs with our smart search. From traditional ale houses to modern craft beer bars.
          </p>
        </div>

        {/* Main Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <SearchBar
            placeholder="Search by pub name, area, or features..."
            onSearch={handleSearch}
            variant="hero"
          />
        </div>

        {/* Quick Chips */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-white/90 mb-2">Explore by vibe →</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {quickChips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full font-medium transition-all duration-200 hover:scale-105"
                onClick={() => {
                  // Track analytics
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'home_quick_chip_click', {
                      event_category: 'homepage',
                      event_label: chip.label,
                      chip_type: 'amenity'
                    });
                  }
                }}
              >
                <span className="text-lg">{chip.icon}</span>
                <span>{chip.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pubs?open_now=true"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'home_quick_chip_click', {
                    event_category: 'homepage',
                    event_label: 'open_now',
                    chip_type: 'action'
                  });
                }
              }}
            >
              <Clock className="w-5 h-5" />
              Open now near you →
            </Link>
            <Link
              href="/map-live"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
            >
              <MapPin className="w-5 h-5" />
              View on Map
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}