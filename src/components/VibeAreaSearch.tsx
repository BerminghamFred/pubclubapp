'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Area {
  slug: string;
  name: string;
  summary: string;
  pubCount: number;
  matchingCount: number;
  hasAmenity: boolean;
}

interface VibeAreaSearchProps {
  areas: Area[];
  amenitySlug: string;
}

export default function VibeAreaSearch({ areas, amenitySlug }: VibeAreaSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAreas = useMemo(() => {
    if (!searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    return areas.filter(area => 
      area.name.toLowerCase().includes(term)
    );
  }, [areas, searchTerm]);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for your borough..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent text-base text-gray-900"
        />
      </div>

      {/* Search Results Dropdown */}
      {searchTerm && filteredAreas.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {filteredAreas.map((area) => (
            <Link
              key={area.slug}
              href={`/area/${area.slug}/${amenitySlug}`}
              className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              onClick={() => setSearchTerm('')}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">{area.name}</div>
                <div className="ml-4">
                  <div className="bg-[#08d78c] text-black text-xs px-2 py-1 rounded-full font-semibold">
                    {area.matchingCount} pubs
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {searchTerm && filteredAreas.length === 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-600">
          No areas found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}

