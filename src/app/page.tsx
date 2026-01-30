import Link from 'next/link';
import HeroSection from '@/components/homepage/HeroSection';
import NearYouCarousel from '@/components/homepage/NearYouCarousel';
import UpcomingFixturesSection from '@/components/homepage/UpcomingFixturesSection';
import TrendingTiles from '@/components/homepage/TrendingTiles';
import SeasonalStrip from '@/components/homepage/SeasonalStrip';
import SpinWheelTeaser from '@/components/homepage/SpinWheelTeaser';
import DownloadButton from '@/components/DownloadButton';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Search and Quick Chips */}
      <HeroSection />

      {/* Near You Areas Carousel */}
      <NearYouCarousel />

      {/* Upcoming sports fixtures (TheSportsDB broadcast data) */}
      <UpcomingFixturesSection />

      {/* Trending Area & Filter Tiles */}
      <TrendingTiles />

      {/* Seasonal Strip */}
      <SeasonalStrip />

      {/* Spin the Wheel Teaser */}
      <SpinWheelTeaser />

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Find the Perfect Pub
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From traditional ale houses to modern craft beer bars, discover London's diverse pub scene with powerful search and filtering tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-[#08d78c]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#08d78c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Search</h3>
              <p className="text-gray-600">
                Find pubs by location, type, features, and more. Filter by traditional, modern, sports bars, or craft beer specialists.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-[#08d78c]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#08d78c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Save Favorites</h3>
              <p className="text-gray-600">
                Create your personal pub list. Save your favorite spots and get quick access to your go-to places.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-[#08d78c]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#08d78c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Info</h3>
              <p className="text-gray-600">
                Get comprehensive pub details including opening hours, food menus, drink selections, and customer reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Discover London's Best Pubs?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Download Pub Club today and start exploring London's vibrant pub scene. 
            Available on iOS and Android devices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <DownloadButton 
              className="bg-[#08d78c] hover:bg-[#06b875] text-black px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            />
            <Link 
              href="/pubs" 
              className="border-2 border-[#08d78c] text-[#08d78c] hover:bg-[#08d78c] hover:text-black px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Browse Pubs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
