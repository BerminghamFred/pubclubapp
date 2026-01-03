'use client';

import { useState } from 'react';
import Link from 'next/link';
import PubPhoto from './PubPhoto';
import { getPhotoRefFromPub } from '@/utils/photoUtils';

interface Pub {
  id: string;
  name: string;
  url: string;
  image?: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  badges: string[];
  _internal?: {
    place_id?: string;
    photo_name?: string;
    photo_reference?: string;
  };
}

interface AreaPubsGridWithPaginationProps {
  pubs: Pub[];
  initialLimit?: number;
}

export default function AreaPubsGridWithPagination({ 
  pubs, 
  initialLimit = 12 
}: AreaPubsGridWithPaginationProps) {
  const [visibleCount, setVisibleCount] = useState(initialLimit);
  const [isLoading, setIsLoading] = useState(false);
  
  const visiblePubs = pubs.slice(0, visibleCount);
  const hasMore = visibleCount < pubs.length;
  const remainingCount = pubs.length - visibleCount;
  
  const handleLoadMore = async () => {
    setIsLoading(true);
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setVisibleCount(prev => Math.min(prev + 12, pubs.length));
    setIsLoading(false);
  };
  
  if (pubs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🍺</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No pubs found
        </h3>
        <p className="text-gray-600">
          We couldn't find any pubs matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Pubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {visiblePubs.map((pub, index) => (
          <article 
            key={pub.id} 
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Pub Image */}
            <div className="h-48 relative overflow-hidden">
              <PubPhoto
                photoRef={getPhotoRefFromPub(pub._internal)}
                photoName={pub._internal?.photo_name}
                placeId={pub._internal?.place_id}
                src={pub._internal?.photo_url}
                alt={pub.name}
                width={480}
                height={320}
                className="w-full h-full"
                fallbackIcon="🍺"
              />
              
              {/* Rank Badge */}
              <div className="absolute top-3 left-3 bg-black/80 text-white text-sm font-bold px-2 py-1 rounded-full">
                #{index + 1}
              </div>
              
              {/* Rating Badge */}
              <div className="absolute top-3 right-3 bg-[#08d78c] text-black text-sm font-bold px-2 py-1 rounded-full">
                {pub.rating.toFixed(1)}★
              </div>
            </div>
            
            {/* Pub Content */}
            <div className="p-6">
              <div className="mb-3">
                <h3 className="text-xl font-semibold text-gray-900 mb-1 line-clamp-2">
                  {pub.name}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span>{pub.rating.toFixed(1)}</span>
                  </span>
                  <span>•</span>
                  <span>{pub.reviewCount} reviews</span>
                  <span>•</span>
                  <span>{pub.priceRange}</span>
                </div>
              </div>
              
              {/* Amenity Badges */}
              {pub.badges.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {pub.badges.slice(0, 3).map((badge) => (
                      <span 
                        key={badge} 
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {badge}
                      </span>
                    ))}
                    {pub.badges.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        +{pub.badges.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* CTA Button */}
              <Link 
                href={pub.url}
                className="w-full bg-[#08d78c] hover:bg-[#06b875] text-black py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-center block"
              >
                View Pub Details
              </Link>
            </div>
          </article>
        ))}
      </div>
      
      {/* Load More Section */}
      {hasMore && (
        <div className="text-center">
          <div className="mb-4">
            <p className="text-gray-600">
              Showing {visibleCount} of {pubs.length} pubs
              {remainingCount > 0 && (
                <span className="ml-1">
                  ({remainingCount} more available)
                </span>
              )}
            </p>
          </div>
          
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                Load More Pubs
                <span className="text-sm opacity-75">({Math.min(12, remainingCount)} more)</span>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Results Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-gray-600">
          Found {pubs.length} {pubs.length === 1 ? 'pub' : 'pubs'} total
        </p>
      </div>
    </div>
  );
}
