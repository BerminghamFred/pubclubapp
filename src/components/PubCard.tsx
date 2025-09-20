'use client';

import { useState } from 'react';

interface PubCardProps {
  pub: {
    id: string;
    name: string;
    borough: string;
    lat: number;
    lng: number;
    rating: number;
    type: string;
    features: string[];
    amenities?: string[];
    address: string;
    description: string;
    reviewCount: number;
    phone?: string;
    website?: string;
    openingHours: string;
    photoUrl?: string;
  };
  onPubClick?: (pub: any) => void;
}

export default function PubCard({ pub, onPubClick }: PubCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Pub Image */}
      <div className="h-48 relative overflow-hidden">
        {pub.photoUrl ? (
          <img
            src={pub.photoUrl}
            alt={`${pub.name} pub`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Fallback placeholder */}
        <div 
          className={`w-full h-full flex items-center justify-center ${
            pub.photoUrl ? 'hidden' : 'flex'
          } bg-[#08d78c]/20`}
        >
          <div className="text-[#08d78c] text-4xl">🍺</div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-1 bg-[#08d78c]/10 text-[#08d78c] text-xs rounded-full font-medium">
            {pub.type}
          </span>
          <span className="text-sm text-gray-500">{pub.borough}</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {pub.name}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-3">
          {pub.description}
        </p>
        <div className="flex flex-wrap gap-1 mb-4">
          {pub.features.map((feature) => (
            <span 
              key={feature} 
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Amenities */}
        {pub.amenities && pub.amenities.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities:</h4>
            <div className="flex flex-wrap gap-1">
              {pub.amenities.map((amenity) => (
                <span 
                  key={amenity} 
                  className="px-2 py-1 bg-[#08d78c]/20 text-[#08d78c] text-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <span className="mr-2">⭐</span>
            <span>{pub.rating}</span>
            {pub.reviewCount && (
              <>
                <span className="mx-1">•</span>
                <span>{pub.reviewCount} reviews</span>
              </>
            )}
          </div>
          <button 
            onClick={handleExpand}
            className="text-[#08d78c] hover:text-[#06b875] font-semibold text-sm"
          >
            {isExpanded ? 'Show Less' : 'View Details →'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Opening Hours:</span>
                <p className="text-gray-700">{pub.openingHours}</p>
              </div>
              
              {pub.phone && (
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <p className="text-gray-700">{pub.phone}</p>
                </div>
              )}
              
              {pub.website && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Website:</span>
                  <a 
                    href={pub.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#08d78c] hover:underline block truncate"
                  >
                    {pub.website}
                  </a>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {pub.photoUrl && <span>📷 Photos</span>}
              {pub.website && <span>🌐 Website</span>}
              {pub.phone && <span>📞 Phone</span>}
            </div>

            {onPubClick && (
              <button
                onClick={() => onPubClick(pub)}
                className="w-full px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                View on Map
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 