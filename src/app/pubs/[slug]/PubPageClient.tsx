'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Heart, MapPin, Star, MessageSquare, CheckCircle, Plus, Minus } from 'lucide-react';
import LoginModal from '@/components/LoginModal';
import PubPhoto from '@/components/PubPhoto';

interface Pub {
  id: string;
  name: string;
  description: string;
  area: string;
  type: string;
  features?: string[];
  rating: number;
  reviewCount: number;
  address: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  amenities?: string[];
  _internal?: {
    place_id?: string;
    photo_url?: string;
    photo_reference?: string; // Old format
    photo_name?: string; // New format
    lat?: number;
    lng?: number;
  };
}

interface UserReview {
  id: string;
  rating: number;
  title?: string;
  body: string;
  photos: string[];
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
}

interface UserState {
  isWishlisted: boolean;
  hasCheckedIn: boolean;
  userReview?: UserReview;
}

interface PubPageClientProps {
  pub: Pub;
}

export default function PubPageClient({ pub }: PubPageClientProps) {
  const { data: session } = useSession();
  const [userState, setUserState] = useState<UserState>({
    isWishlisted: false,
    hasCheckedIn: false,
  });

  // Debug: Log the pub data being received
  useEffect(() => {
    console.log('[PubPageClient] Received pub data:', {
      name: pub.name,
      hasInternal: !!pub._internal,
      photoName: pub._internal?.photo_name ? 'exists' : 'missing',
      placeId: pub._internal?.place_id ? 'exists' : 'missing',
      internalKeys: pub._internal ? Object.keys(pub._internal) : 'no _internal'
    });
  }, [pub]);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [userData, setUserData] = useState({
    userReviewCount: 0,
    userRatingAvg: 0,
    wishlistCount: 0,
    checkinCount: 0,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [userStateLoaded, setUserStateLoaded] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginAction, setLoginAction] = useState<'save' | 'checkin' | 'review'>('save');

  // Define functions first to avoid reference errors
  const loadUserState = useCallback(async () => {
    if (userStateLoaded) return;
    
    try {
      const [wishlistResponse, checkinsResponse] = await Promise.all([
        fetch(`/api/users/me/wishlist`, {
          headers: { 'Cache-Control': 'max-age=60' }
        }),
        fetch(`/api/users/me/checkins`, {
          headers: { 'Cache-Control': 'max-age=60' }
        })
      ]);

      if (wishlistResponse.ok) {
        const wishlistData = await wishlistResponse.json();
        const isWishlisted = wishlistData.pubs.some((p: any) => p.id === pub.id);
        setUserState(prev => ({ ...prev, isWishlisted }));
      }

      if (checkinsResponse.ok) {
        const checkinsData = await checkinsResponse.json();
        const hasCheckedIn = checkinsData.pubs.some((p: any) => p.id === pub.id);
        setUserState(prev => ({ ...prev, hasCheckedIn }));
      }
      
      setUserStateLoaded(true);
    } catch (error) {
      console.error('Error loading user state:', error);
    }
  }, [pub.id, userStateLoaded]);

  const loadUserData = useCallback(async () => {
    if (userDataLoaded) return;
    
    try {
      const response = await fetch(`/api/pubs/${pub.id}/user-data`, {
        headers: { 'Cache-Control': 'max-age=300' }
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setUserDataLoaded(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [pub.id, userDataLoaded]);

  const loadUserReviews = useCallback(async () => {
    if (reviewsLoading) return;
    
    setReviewsLoading(true);
    try {
      const response = await fetch(`/api/pubs/${pub.id}/reviews`, {
        headers: { 'Cache-Control': 'max-age=120' }
      });
      if (response.ok) {
        const data = await response.json();
        setUserReviews(data.reviews || []);
        
        // Check if current user has a review
        if (session?.user) {
          const userReview = data.reviews?.find((review: UserReview) => review.user.id === session.user?.id);
          setUserState(prev => ({ ...prev, userReview }));
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  }, [pub.id, session?.user, reviewsLoading]);

  // Load user state only when user interacts with action buttons
  const loadUserStateOnDemand = () => {
    if (!session?.user || userStateLoaded) return;
    loadUserState();
  };

  // Memoize rating calculations to prevent unnecessary re-renders
  const ratingData = useMemo(() => {
    const googleRating = pub.rating;
    const googleReviewCount = pub.reviewCount;
    
    // Use user data if loaded, otherwise fall back to individual reviews
    const userRatingAvg = userDataLoaded ? userData.userRatingAvg : 
      (userReviews.length > 0 ? userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length : 0);
    
    const totalReviews = googleReviewCount + (userDataLoaded ? userData.userReviewCount : userReviews.length);
    const combinedRating = userDataLoaded && totalReviews > 0
      ? (googleRating * googleReviewCount + userData.userRatingAvg * userData.userReviewCount) / totalReviews
      : (userReviews.length > 0 && totalReviews > 0
        ? (googleRating * googleReviewCount + userRatingAvg * userReviews.length) / totalReviews
        : googleRating);

    return {
      googleRating,
      googleReviewCount,
      userRatingAvg,
      totalReviews,
      combinedRating
    };
  }, [pub.rating, pub.reviewCount, userDataLoaded, userData.userRatingAvg, userData.userReviewCount, userReviews]);

  // Load user data and reviews only when user scrolls or interacts (more deferred)
  useEffect(() => {
    if (session?.user && !userDataLoaded && !reviewsLoading) {
      // Load user data and reviews after user scrolls or after longer delay
      const handleScroll = () => {
        if (!userDataLoaded) loadUserData();
        if (!reviewsLoading) loadUserReviews();
        window.removeEventListener('scroll', handleScroll);
      };
      
      // Load after 3 seconds OR when user scrolls (increased delay)
      const timer = setTimeout(() => {
        if (!userDataLoaded) loadUserData();
        if (!reviewsLoading) loadUserReviews();
      }, 3000);
      
      window.addEventListener('scroll', handleScroll, { once: true });
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [session, pub.id, userDataLoaded, reviewsLoading, loadUserData, loadUserReviews]);

  const toggleWishlist = async () => {
    if (!session?.user) {
      setLoginAction('save');
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const method = userState.isWishlisted ? 'DELETE' : 'POST';
      const response = await fetch('/api/wishlist', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pubId: pub.id }),
      });

      if (response.ok) {
        setUserState(prev => ({ ...prev, isWishlisted: !prev.isWishlisted }));
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckin = async () => {
    if (!session?.user) {
      setLoginAction('checkin');
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const method = userState.hasCheckedIn ? 'DELETE' : 'POST';
      const response = await fetch('/api/checkins', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pubId: pub.id }),
      });

      if (response.ok) {
        setUserState(prev => ({ ...prev, hasCheckedIn: !prev.hasCheckedIn }));
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/pubs" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              ← Back to Pubs
            </Link>
            <span className="text-gray-400">|</span>
            <Link 
              href="/map-live" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors"
            >
              View on Map
            </Link>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{pub.name}</h1>
          <div className="flex items-center gap-4 text-lg text-gray-300">
            <span>{pub.type}</span>
            <span>•</span>
            <span>{pub.area}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span>{ratingData.combinedRating.toFixed(1)}</span>
              <span className="text-gray-400">({ratingData.totalReviews} reviews)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Photo */}
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
              <PubPhoto
                photoName={pub._internal?.photo_name}
                placeId={pub._internal?.place_id}
                alt={`${pub.name} pub`}
                width={480}
                height={360}
                className="w-full h-full"
                priority={true}
                fallbackIcon="🍺"
              />
            </div>
            
            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About {pub.name}</h2>
              <p className="text-lg text-gray-600 leading-relaxed">{pub.description}</p>
            </div>
            
            {/* Features & Amenities */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Features & Amenities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pub.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-[#08d78c] rounded-full"></div>
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* User Reviews Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
                {!userState.userReview && (
                  <button
                    onClick={() => {
                      if (!session?.user) {
                        setLoginAction('review');
                        setShowLoginModal(true);
                      } else {
                        setShowReviewForm(!showReviewForm);
                      }
                    }}
                    className="bg-[#08d78c] hover:bg-[#06b875] text-black px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <ReviewForm 
                  pubId={pub.id} 
                  onReviewSubmitted={() => {
                    setShowReviewForm(false);
                    loadUserReviews();
                  }}
                  existingReview={userState.userReview}
                />
              )}

              {/* User Reviews */}
              {reviewsLoading ? (
                <div className="space-y-4">
                  {/* Skeleton loading for reviews */}
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userReviews.length > 0 ? (
                <div className="space-y-4">
                  {userReviews.map((review) => (
                    <UserReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No user reviews yet. Be the first to review this pub!</p>
                </div>
              )}

              {/* Google Reviews Note */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Google Reviews:</strong> This pub also has {ratingData.googleReviewCount} Google reviews 
                  with an average rating of {ratingData.googleRating.toFixed(1)} stars.
                </p>
              </div>
            </div>
            
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Address:</span>
                  <p className="text-gray-600">{pub.address}</p>
                </div>
                {pub.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-600">{pub.phone}</p>
                  </div>
                )}
                {pub.website && (
                  <div>
                    <span className="font-medium text-gray-700">Website:</span>
                    <a 
                      href={pub.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#08d78c] hover:text-[#06b875] transition-colors"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Rating */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Overall Rating</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#08d78c] mb-2">{ratingData.combinedRating.toFixed(1)}</div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span 
                      key={i} 
                      className={`text-2xl ${i < Math.floor(ratingData.combinedRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-600 mb-2">{ratingData.totalReviews} total reviews</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>{ratingData.googleReviewCount} Google reviews ({ratingData.googleRating.toFixed(1)}★)</p>
                  <p>{userReviews.length} user reviews ({userReviews.length > 0 ? ratingData.userRatingAvg.toFixed(1) : '0.0'}★)</p>
                </div>
              </div>
            </div>

            {/* User Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={(e) => {
                    loadUserStateOnDemand();
                    toggleWishlist();
                  }}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                    userState.isWishlisted
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${userState.isWishlisted ? 'fill-current' : ''}`} />
                  {userState.isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                </button>
                
                <button
                  onClick={(e) => {
                    loadUserStateOnDemand();
                    toggleCheckin();
                  }}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                    userState.hasCheckedIn
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 ${userState.hasCheckedIn ? 'fill-current' : ''}`} />
                  {userState.hasCheckedIn ? 'Undo Check-in' : 'Check In'}
                </button>

                {!session?.user && (
                  <div className="text-center text-sm text-gray-500 pt-2">
                    <Link href="/login" className="text-[#08d78c] hover:underline">
                      Sign in to save and check in
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/map-live" 
                  className="w-full bg-[#08d78c] hover:bg-[#06b875] text-black py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-center block"
                >
                  <MapPin className="w-5 h-5 inline mr-2" />
                  View on Map
                </Link>
                {pub._internal?.lat && pub._internal?.lng && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${pub._internal.lat},${pub._internal.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-center block"
                  >
                    Get Directions
                  </a>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        action={loginAction}
      />
    </div>
  );
}

// Review Form Component
function ReviewForm({ pubId, onReviewSubmitted, existingReview }: { 
  pubId: string; 
  onReviewSubmitted: () => void;
  existingReview?: UserReview;
}) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [body, setBody] = useState(existingReview?.body || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || rating === 0 || body.length < 10) return;

    setLoading(true);
    try {
      const method = existingReview ? 'PATCH' : 'POST';
      const url = existingReview ? `/api/reviews/${existingReview.id}` : '/api/reviews';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pubId,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });

      if (response.ok) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief headline for your review"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            maxLength={100}
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review *
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience (minimum 10 characters)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            rows={4}
            minLength={10}
            maxLength={2000}
          />
          <p className="text-sm text-gray-500 mt-1">
            {body.length}/2000 characters
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || rating === 0 || body.length < 10}
            className="bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-300 text-black px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Submitting...' : (existingReview ? 'Update Review' : 'Submit Review')}
          </button>
          <button
            type="button"
            onClick={() => {
              setRating(existingReview?.rating || 0);
              setTitle(existingReview?.title || '');
              setBody(existingReview?.body || '');
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

// User Review Card Component
function UserReviewCard({ review }: { review: UserReview }) {
  const { data: session } = useSession();
  const isOwnReview = session?.user?.id === review.user.id;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {review.user.image ? (
              <img 
                src={review.user.image} 
                alt={review.user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-semibold">
                {review.user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{review.user.name}</p>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
              {review.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
          </div>
        </div>
        
        {isOwnReview && (
          <div className="flex gap-2">
            <button className="text-sm text-[#08d78c] hover:underline">
              Edit
            </button>
            <button className="text-sm text-red-600 hover:underline">
              Delete
            </button>
          </div>
        )}
      </div>

      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}
      
      <p className="text-gray-700 leading-relaxed">{review.body}</p>

      {review.photos && review.photos.length > 0 && (
        <div className="mt-4 flex gap-2">
          {review.photos.map((photo, index) => (
            <img 
              key={index}
              src={photo} 
              alt={`Review photo ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}
