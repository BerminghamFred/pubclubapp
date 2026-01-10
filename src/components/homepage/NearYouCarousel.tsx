'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface Area {
  slug: string;
  name: string;
  pubCount: number;
  image?: string;
  isNearby?: boolean;
  distance?: number; // Distance in km from user location
}

export default function NearYouCarousel() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      // Try to get user location first
      let location = null;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            location = `${latitude},${longitude}`;
            setUserLocation(location);
            fetchAreas(location);
          },
          () => {
            // Fallback to IP-based location or top cities
            fetchAreas();
          },
          { timeout: 5000 }
        );
      } else {
        fetchAreas();
      }
    } catch (error) {
      console.error('Error loading areas:', error);
      fetchAreas();
    }
  };

  const fetchAreas = async (location?: string) => {
    try {
      // Add cache-busting timestamp in development
      const cacheBuster = process.env.NODE_ENV === 'development' ? `&_t=${Date.now()}` : '';
      const url = location 
        ? `/api/homepage/areas?location=${encodeURIComponent(location)}${cacheBuster}`
        : `/api/homepage/areas${cacheBuster ? '?' + cacheBuster.substring(1) : ''}`;
      
      const response = await fetch(url, {
        cache: 'no-store' // Prevent browser caching in development
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[NearYouCarousel] Received areas data:', data.areas?.map((a: Area) => ({ name: a.name, image: a.image })));
        
        // Log which areas have images
        const areasWithImages = data.areas?.filter((a: Area) => a.image) || [];
        console.log(`[NearYouCarousel] Areas with images: ${areasWithImages.length}`);
        areasWithImages.forEach((area: Area) => {
          console.log(`  - ${area.name}: ${area.image}`);
        });
        
        setAreas(data.areas || []);
      } else {
        console.error('[NearYouCarousel] Failed to fetch areas:', response.status, response.statusText);
        // Fallback to static top cities
        setAreas(getTopCities());
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      setAreas(getTopCities());
    } finally {
      setLoading(false);
    }
  };

  const getTopCities = (): Area[] => [
    { slug: 'london', name: 'London', pubCount: 2500, isNearby: false },
    { slug: 'manchester', name: 'Manchester', pubCount: 450, isNearby: false },
    { slug: 'birmingham', name: 'Birmingham', pubCount: 380, isNearby: false },
    { slug: 'bristol', name: 'Bristol', pubCount: 320, isNearby: false },
    { slug: 'leeds', name: 'Leeds', pubCount: 280, isNearby: false },
    { slug: 'liverpool', name: 'Liverpool', pubCount: 250, isNearby: false },
    { slug: 'edinburgh', name: 'Edinburgh', pubCount: 220, isNearby: false },
    { slug: 'glasgow', name: 'Glasgow', pubCount: 200, isNearby: false }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, areas.length - 3));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, areas.length - 3)) % Math.max(1, areas.length - 3));
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Areas Near You</h2>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-8"></div>
              <div className="flex gap-4 justify-center">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-64 h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {userLocation ? 'Areas Near You' : 'Top Cities'}
          </h2>
          <p className="text-lg text-gray-600">
            {userLocation 
              ? 'Discover great pubs in nearby areas' 
              : 'Explore pubs across the UK\'s best cities'
            }
          </p>
        </div>

        {/* Mobile: horizontal scroll with fixed card width (match desktop) */}
        {areas.length > 0 && (
          <div className="md:hidden -mx-4 px-4 overflow-x-auto flex gap-3 snap-x snap-mandatory scroll-p-4 pb-3" role="list" aria-label="Areas near you">
            {areas.map((area) => (
              <div key={area.slug} role="listitem" className="snap-start">
                <Link
                  href={`/area/${area.slug}`}
                  className="block group w-[240px] min-w-[240px] max-w-[240px] flex-shrink-0"
                >
                  <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-[#08d78c]/20 to-[#06b875]/20 relative">
                      {area.image ? (
                        <img
                          src={area.image}
                          alt={area.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.error(`[NearYouCarousel] Failed to load image for ${area.name}: ${area.image}`);
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                          onLoad={() => {
                            console.log(`[NearYouCarousel] Successfully loaded image for ${area.name}: ${area.image}`);
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full flex items-center justify-center absolute inset-0"
                        style={{ display: area.image ? 'none' : 'flex' }}
                      >
                        <MapPin className="w-12 h-12 text-[#08d78c]" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#08d78c] transition-colors line-clamp-2 min-h-[3rem]">
                        {area.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {area.pubCount} {area.pubCount === 1 ? 'pub' : 'pubs'}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Desktop: original carousel preserved */}
        {areas.length > 0 && (
          <div className="relative hidden md:block">
            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * (100 / Math.min(4, areas.length))}%)` }}
              >
                {areas.map((area, index) => (
                  <div key={area.slug} className="w-1/4 min-w-0 flex-shrink-0 px-2">
                    <Link
                      href={`/area/${area.slug}`}
                      className="block group"
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).gtag) {
                          (window as any).gtag('event', 'home_area_click', {
                            event_category: 'homepage',
                            event_label: area.name,
                            area_slug: area.slug,
                            pub_count: area.pubCount
                          });
                        }
                      }}
                    >
                      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                        {/* Area Image */}
                        <div className="aspect-video bg-gradient-to-br from-[#08d78c]/20 to-[#06b875]/20 relative">
                          {area.image ? (
                            <img
                              src={area.image}
                              alt={area.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // Hide the image and show fallback if it fails to load
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ display: area.image ? 'none' : 'flex' }}
                          >
                              <MapPin className="w-12 h-12 text-[#08d78c]" />
                            </div>
                          {area.isNearby && (
                            <div className="absolute top-2 right-2 bg-[#08d78c] text-black text-xs px-2 py-1 rounded-full font-semibold">
                              Nearby
                            </div>
                          )}
                        </div>
                        
                        {/* Area Info */}
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#08d78c] transition-colors">
                            {area.name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {area.pubCount} {area.pubCount === 1 ? 'pub' : 'pubs'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            {areas.length > 4 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
                  aria-label="Previous areas"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
                  aria-label="Next areas"
                >
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {areas.length > 4 && (
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: Math.ceil(areas.length / 4) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === Math.floor(currentIndex / 4) ? 'bg-[#08d78c]' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}