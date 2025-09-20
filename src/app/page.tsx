import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Discover London's
                <span className="text-[#08d78c] block">Best Pubs</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-lg">
                Find traditional pubs, modern bars, and everything in between with Pub Club. 
                Your ultimate guide to London's vibrant pub scene.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/download" 
                  className="bg-[#08d78c] hover:bg-[#06b875] text-black px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Download for iOS
                </Link>
                <Link 
                  href="/download" 
                  className="bg-[#08d78c] hover:bg-[#06b875] text-black px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  Download for Android
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
                <div className="bg-black rounded-xl p-4 mb-4">
                  <div className="bg-[#08d78c] h-2 w-16 rounded mb-2"></div>
                  <div className="space-y-2">
                    <div className="bg-[#08d78c] h-4 w-3/4 rounded"></div>
                    <div className="bg-[#08d78c] h-4 w-1/2 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#08d78c] rounded-lg p-4">
                    <div className="bg-white h-3 w-12 rounded mb-2"></div>
                    <div className="bg-white h-2 w-8 rounded"></div>
                  </div>
                  <div className="bg-[#08d78c] rounded-lg p-4">
                    <div className="bg-white h-3 w-10 rounded mb-2"></div>
                    <div className="bg-white h-2 w-6 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <Link 
              href="/download" 
              className="bg-[#08d78c] hover:bg-[#06b875] text-black px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Download Now
            </Link>
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
