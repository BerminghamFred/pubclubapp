'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RandomPicker from '@/components/RandomPicker';
import { Pub } from '@/data/types';
import { generatePubSlug } from '@/utils/slugUtils';

function RandomPageContent() {
  const searchParams = useSearchParams();
  const [showRandomPicker, setShowRandomPicker] = useState(false);

  // Parse query parameters
  const area = searchParams.get('area') || undefined;
  const amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];
  const openNow = searchParams.get('open_now') === '1';
  const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : 3.5;
  const auto = searchParams.get('auto') === '1';

  // Auto-spin on first load if auto=1
  useEffect(() => {
    if (auto) {
      setShowRandomPicker(true);
    }
  }, [auto]);

  const handleViewPub = (pub: Pub) => {
    window.open(`/pubs/${generatePubSlug(pub.name, pub.id)}`, '_blank');
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🎡 Random Pub Picker
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Let us surprise you with a random pub from London's best selection!
            </p>
            
            {/* Filter Summary */}
            {(area || amenities.length > 0 || openNow || minRating > 0) && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg max-w-2xl mx-auto">
                <p className="text-sm text-gray-300 mb-2">Current filters:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {area && (
                    <span className="px-3 py-1 bg-[#08d78c] text-black text-sm rounded-full">
                      Area: {area}
                    </span>
                  )}
                  {amenities.map(amenity => (
                    <span key={amenity} className="px-3 py-1 bg-[#08d78c] text-black text-sm rounded-full">
                      {amenity}
                    </span>
                  ))}
                  {openNow && (
                    <span className="px-3 py-1 bg-[#08d78c] text-black text-sm rounded-full">
                      Open Now
                    </span>
                  )}
                  {minRating > 0 && (
                    <span className="px-3 py-1 bg-[#08d78c] text-black text-sm rounded-full">
                      {minRating}+ Stars
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Spin Button */}
            <div className="mt-8">
              <button
                onClick={() => setShowRandomPicker(true)}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#08d78c] to-[#06b875] hover:from-[#06b875] hover:to-[#05a066] text-black font-bold text-xl rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                🎡 Spin the Wheel
              </button>
              <p className="text-sm text-gray-400 mt-3">
                Get a random pub recommendation based on your preferences
              </p>
            </div>

            {/* Back to Find Pubs */}
            <div className="mt-6">
              <a
                href="/pubs"
                className="text-[#08d78c] hover:text-[#06b875] text-sm font-medium"
              >
                ← Back to Find Pubs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              How it Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Smart Filtering
                </h3>
                <p className="text-gray-600">
                  We respect your area, amenity, and rating preferences to find the perfect match.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Fair Selection
                </h3>
                <p className="text-gray-600">
                  Higher-rated pubs get a slight boost, but every pub has a fair chance to be selected.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Repeats
                </h3>
                <p className="text-gray-600">
                  We avoid showing the same pub multiple times in your current session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Random Picker Modal */}
      <RandomPicker
        isOpen={showRandomPicker}
        onClose={() => setShowRandomPicker(false)}
        filters={{
          area,
          amenities,
          openNow,
          minRating,
        }}
        onViewPub={handleViewPub}
      />
    </div>
  );
}

export default function RandomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <div className="text-gray-600">Loading random pub picker...</div>
        </div>
      </div>
    }>
      <RandomPageContent />
    </Suspense>
  );
}
