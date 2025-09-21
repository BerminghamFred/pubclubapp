'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { generatePubSlug } from '@/utils/slugUtils';
import { Heart, CheckCircle } from 'lucide-react';
import LoginModal from './LoginModal';

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
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userStateLoaded, setUserStateLoaded] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginAction, setLoginAction] = useState<'save' | 'checkin'>('save');

  // Load user state only when user hovers over the action buttons
  // Remove automatic loading to prevent excessive API calls

  const loadUserState = async () => {
    if (userStateLoaded) return;
    
    console.log(`Loading user state for pub ${pub.name}`);
    
    try {
      const [wishlistResponse, checkinsResponse] = await Promise.all([
        fetch(`/api/users/me/wishlist`),
        fetch(`/api/users/me/checkins`)
      ]);

      if (wishlistResponse.ok) {
        const wishlistData = await wishlistResponse.json();
        setIsWishlisted(wishlistData.pubs.some((p: any) => p.id === pub.id));
      }

      if (checkinsResponse.ok) {
        const checkinsData = await checkinsResponse.json();
        setHasCheckedIn(checkinsData.pubs.some((p: any) => p.id === pub.id));
      }
      
      setUserStateLoaded(true);
    } catch (error) {
      console.error('Error loading user state:', error);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!session?.user) {
      setLoginAction('save');
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const method = isWishlisted ? 'DELETE' : 'POST';
      const response = await fetch('/api/wishlist', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
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

  const toggleCheckin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!session?.user) {
      setLoginAction('checkin');
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const method = hasCheckedIn ? 'DELETE' : 'POST';
      const response = await fetch('/api/checkins', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pubId: pub.id }),
      });

      if (response.ok) {
        setHasCheckedIn(!hasCheckedIn);
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Generate the pub URL
  const pubUrl = `/pubs/${generatePubSlug(pub.name, pub.id)}`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {/* Pub Image - Clickable */}
      <a href={pubUrl}>
        <div className="h-48 relative overflow-hidden cursor-pointer">
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
      </a>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-1 bg-[#08d78c]/10 text-[#08d78c] text-xs rounded-full font-medium">
            {pub.type}
          </span>
          <span className="text-sm text-gray-500">{pub.borough}</span>
        </div>
        <a href={pubUrl}>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-[#08d78c] transition-colors cursor-pointer">
            {pub.name}
          </h3>
        </a>
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

        {/* User Action Buttons */}
        {session?.user && (
          <div 
            className="mt-4 flex gap-2"
            onMouseEnter={loadUserState}
          >
            <button
              onClick={toggleWishlist}
              disabled={loading}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isWishlisted
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-current' : ''}`} />
              {isWishlisted ? 'Saved' : 'Save'}
            </button>
            
            <button
              onClick={toggleCheckin}
              disabled={loading}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                hasCheckedIn
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className={`w-3 h-3 ${hasCheckedIn ? 'fill-current' : ''}`} />
              {hasCheckedIn ? 'Visited' : 'Check In'}
            </button>
          </div>
        )}
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

      {/* Bottom section with rating and quick details */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-3">
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
            className="text-gray-500 hover:text-gray-700 font-semibold text-sm"
          >
            {isExpanded ? 'Show Less' : 'Quick Details'}
          </button>
        </div>
      </div>

      {/* View Page Button - Always at bottom */}
      <a 
        href={pubUrl}
        className="block w-full px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold text-sm transition-colors duration-200 text-center"
        title={`Navigate to ${pub.name} page`}
      >
        View Page
      </a>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        action={loginAction}
      />
    </div>
  );
} 