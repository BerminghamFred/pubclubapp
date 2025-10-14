'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { generatePubSlug } from '@/utils/slugUtils';
import PubPhoto from './PubPhoto';
import LoginModal from './LoginModal';

interface PubResultCardProps {
  pub: {
    id: string;
    name: string;
    area: string;
    rating: number;
    reviewCount: number;
    type: string;
    amenities?: string[];
    address: string;
    description: string;
    _internal?: {
      place_id?: string;
      photo_name?: string;
      photo_reference?: string;
      lat?: number;
      lng?: number;
    };
  };
}

export default function PubResultCard({ pub }: PubResultCardProps) {
  const { data: session } = useSession();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userStateLoaded, setUserStateLoaded] = useState(false);

  const pubUrl = `/pubs/${generatePubSlug(pub.name, pub.id)}`;

  const loadUserState = useCallback(async () => {
    if (userStateLoaded || !session) return;
    
    try {
      const wishlistResponse = await fetch(`/api/users/me/wishlist`);
      if (wishlistResponse.ok) {
        const wishlistData = await wishlistResponse.json();
        setIsWishlisted(wishlistData.pubs.some((p: any) => p.id === pub.id));
      }
      setUserStateLoaded(true);
    } catch (error) {
      console.error('Error loading user state:', error);
    }
  }, [userStateLoaded, session, pub.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!session?.user) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const method = isWishlisted ? 'DELETE' : 'POST';
      const response = await fetch('/api/wishlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubId: pub.id }),
      });

      if (response.ok) {
        setIsWishlisted(!isWishlisted);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full group"
        onMouseEnter={loadUserState}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <a href={pubUrl} className="block h-full">
            <div className="h-full transform group-hover:scale-105 transition-transform duration-300">
              <PubPhoto
                photoName={pub._internal?.photo_name}
                placeId={pub._internal?.place_id}
                alt={pub.name}
                width={480}
                height={320}
                className="w-full h-full"
                fallbackIcon="🍺"
              />
            </div>
          </a>
          
          {/* Wishlist Button */}
          <button
            onClick={toggleWishlist}
            disabled={loading}
            className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            <Heart 
              className={`w-5 h-5 transition-colors ${
                isWishlisted 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-600 hover:text-red-500'
              }`}
            />
          </button>

          {/* Pub Type Badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-full">
            {pub.type}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          {/* Header */}
          <div className="mb-3">
            <a href={pubUrl} className="group/link">
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover/link:text-[#08d78c] transition-colors line-clamp-2">
                {pub.name}
              </h3>
            </a>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{pub.area}</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 rounded-lg">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900">{pub.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-500">
              {pub.reviewCount} reviews
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
            {pub.description}
          </p>

          {/* Amenities */}
          {pub.amenities && pub.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {pub.amenities.slice(0, 3).map((amenity) => (
                <span
                  key={amenity}
                  className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {pub.amenities.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                  +{pub.amenities.length - 3}
                </span>
              )}
            </div>
          )}

          {/* View Button */}
          <a
            href={pubUrl}
            className="w-full py-3 px-4 bg-[#08d78c] hover:bg-[#06b875] text-white text-center font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            View Details
          </a>
        </div>
      </motion.div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        action="save"
      />
    </>
  );
}

