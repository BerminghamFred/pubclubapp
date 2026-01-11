'use client';

import Link from 'next/link';
import { Calendar, Sun, Snowflake, Leaf } from 'lucide-react';

interface SeasonalLink {
  label: string;
  href: string;
  icon: string;
  description: string;
}

export default function SeasonalStrip() {
  const getSeasonalLinks = (): SeasonalLink[] => {
    const month = new Date().getMonth() + 1; // 1-12
    
    // Summer (June-August)
    if (month >= 6 && month <= 8) {
      return [
        {
          label: 'Beer Gardens',
          href: '/pubs?amenities=Beer Garden',
          icon: '🌳',
          description: 'Sunny terraces & outdoor drinking'
        },
        {
          label: 'Riverside Pubs',
          href: '/pubs?amenities=Riverside',
          icon: '🌊',
          description: 'Pubs by the water'
        },
        {
          label: 'Rooftop Bars',
          href: '/pubs?amenities=Rooftop',
          icon: '🏢',
          description: 'Drinks with a view'
        },
        {
          label: 'Outdoor Seating',
          href: '/pubs?amenities=Outdoor Seating',
          icon: '☀️',
          description: 'Al fresco dining & drinking'
        }
      ];
    }
    
    // Autumn/Winter (September-February)
    if (month >= 9 || month <= 2) {
      return [
        {
          label: 'Sunday Roast',
          href: '/pubs?amenities=Sunday Roast',
          icon: '🍖',
          description: 'Traditional Sunday dinners'
        },
        {
          label: 'Fireplace Pubs',
          href: '/pubs?amenities=Fireplace',
          icon: '🔥',
          description: 'Cozy spots to warm up'
        },
        {
          label: 'Sports Viewing',
          href: '/pubs?amenities=Sky Sports,TNT Sports,Terrestrial TV',
          icon: '📺',
          description: 'Sky Sports, TNT Sports & Terrestrial TV'
        },
        {
          label: 'Activities',
          href: '/pubs?amenities=Pool Table,Darts,Board Games',
          icon: '🎯',
          description: 'Pool table, darts & board games'
        }
      ];
    }
    
    // Spring (March-May)
    return [
      {
        label: 'Beer Gardens',
        href: '/pubs?amenities=Beer Garden',
        icon: '🌳',
        description: 'Spring outdoor drinking'
      },
      {
        label: 'Riverside Pubs',
        href: '/pubs?amenities=Riverside',
        icon: '🌊',
        description: 'Pubs by the water'
      },
      {
        label: 'Light Meals',
        href: '/pubs?amenities=Light Meals',
        icon: '🥗',
        description: 'Fresh spring dining'
      },
      {
        label: 'Outdoor Seating',
        href: '/pubs?amenities=Outdoor Seating',
        icon: '🌸',
        description: 'Spring outdoor seating'
      }
    ];
  };

  const getSeasonIcon = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 8) return <Sun className="w-5 h-5" />;
    if (month >= 9 || month <= 2) return <Snowflake className="w-5 h-5" />;
    return <Leaf className="w-5 h-5" />;
  };

  const getSeasonName = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 || month <= 2) return 'Winter';
    return 'Spring';
  };

  const seasonalLinks = getSeasonalLinks();

  return (
    <section className="py-12 bg-gradient-to-r from-orange-50 to-amber-50 border-y border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Calendar className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {getSeasonName()} Favourites
            </h2>
            {getSeasonIcon()}
          </div>
          <p className="text-gray-600">
            Perfect pub experiences for {getSeasonName().toLowerCase()}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {seasonalLinks.map((link, index) => (
            <Link
              key={link.label}
              href={link.href}
              className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 text-center border border-orange-100 hover:border-orange-200"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'home_seasonal_click', {
                    event_category: 'homepage',
                    event_label: link.label,
                    season: getSeasonName(),
                    link_index: index
                  });
                }
              }}
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">
                {link.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                {link.label}
              </h3>
              <p className="text-sm text-gray-600">
                {link.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Temporarily hidden - may bring back when we have selected seasonal pub filters */}
        {/* <div className="text-center mt-6">
          <Link
            href="/pubs"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            View seasonal pubs
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div> */}
      </div>
    </section>
  );
}
