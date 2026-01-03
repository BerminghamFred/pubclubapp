'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import PubPhoto from './PubPhoto';
import { extractPhotoReference } from '@/utils/photoUtils';

interface PubPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  photo?: string | null;
  photoName?: string | null;
  photoRef?: string | null;
  placeId?: string | null;
}

interface ResultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pubs: PubPin[];
  total: number;
}

export function ResultDrawer({ isOpen, onClose, pubs, total }: ResultDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Desktop overlay */}
      <div 
        className="hidden lg:block fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`
        fixed lg:relative top-0 right-0 h-full w-full lg:w-[420px] 
        bg-white shadow-xl lg:shadow-none z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Title Bar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pub Results
            </h2>
            <p className="text-sm text-gray-500">
              {pubs.length} of {total} pubs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto h-[calc(100%-80px)]">
          {pubs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-4xl mb-2">🍺</div>
              <p className="font-medium">No pubs found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {pubs.map((pub) => (
                <Link
                  key={pub.id}
                  href={`/pubs/${pub.id}`}
                  className="block group"
                >
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                    {/* 16:9 Image */}
                    <div className="aspect-video bg-gray-100">
                      <PubPhoto
                        photoRef={pub.photo ? extractPhotoReference(pub.photo) : undefined}
                        photoName={pub.photoName ?? undefined}
                        placeId={(pub.placeId ?? pub.id) || undefined}
                        src={pub.photo ?? undefined}
                        alt={pub.name}
                        width={400}
                        height={225}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        fallbackIcon="🍺"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      {/* Pub name and location */}
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#08d78c] transition-colors mb-1">
                        {pub.name}
                      </h3>
                      
                      {/* Rating row */}
                      <div className="flex items-center gap-1 mb-3">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm font-medium text-gray-700">
                          {pub.rating || '—'}
                        </span>
                        {pub.reviewCount > 0 && (
                          <span className="text-xs text-gray-500">
                            ({pub.reviewCount} reviews)
                          </span>
                        )}
                      </div>
                      
                      {/* Amenity chips */}
                      {pub.amenities && pub.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {pub.amenities.slice(0, 3).map((amenity) => (
                            <span
                              key={amenity}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full border border-gray-200"
                            >
                              {amenity.replace(/-/g, ' ')}
                            </span>
                          ))}
                          {pub.amenities.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                              +{pub.amenities.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* View button */}
                      <div className="flex justify-end">
                        <span className="text-sm font-medium text-[#08d78c] group-hover:text-[#07c47a] transition-colors">
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
