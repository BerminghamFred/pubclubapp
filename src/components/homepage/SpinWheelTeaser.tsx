'use client';

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

export default function SpinWheelTeaser() {
  const handleSpinClick = () => {
    // Track analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'home_spin_open', {
        event_category: 'homepage',
        event_label: 'spin_wheel_teaser',
        source: 'homepage_teaser'
      });
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#08d78c] to-[#06b875] rounded-2xl p-8 text-white">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <RotateCcw className="w-8 h-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Can't decide where to go?
              </h2>
              <p className="text-lg text-white/90 mb-6">
                Let our spinning wheel pick the perfect pub for you. 
                Just set your preferences and spin to discover your next favorite spot!
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/random"
                onClick={handleSpinClick}
                className="inline-flex items-center gap-2 bg-white text-[#08d78c] hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                <RotateCcw className="w-5 h-5" />
                🎡 Spin the Wheel
              </Link>
              <Link
                href="/pubs"
                className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-[#08d78c] px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Browse All Pubs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
