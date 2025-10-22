'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Star, 
  Heart, 
  CheckCircle, 
  MapPin, 
  Calendar,
  Edit3,
  LogOut,
  Settings,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  reviewsCount: number;
  wishlistCount: number;
  checkinCount: number;
}

interface UserReview {
  id: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
  pub: {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    photoUrl?: string;
  };
}

interface WishlistItem {
  id: string;
  createdAt: string;
  pub: {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    photoUrl?: string;
  };
}

interface CheckinItem {
  id: string;
  note?: string;
  visitedAt: string;
  pub: {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    photoUrl?: string;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'reviews' | 'wishlist' | 'checkins'>('reviews');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/login');
      return;
    }

    fetchUserData();
  }, [session, status, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [profileRes, reviewsRes, wishlistRes, checkinsRes] = await Promise.all([
        fetch('/api/users/me'),
        fetch('/api/users/me/reviews'),
        fetch('/api/users/me/wishlist'),
        fetch('/api/users/me/checkins')
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
      }

      if (wishlistRes.ok) {
        const wishlistData = await wishlistRes.json();
        setWishlist(wishlistData.pubs || []);
      }

      if (checkinsRes.ok) {
        const checkinsData = await checkinsRes.json();
        setCheckins(checkinsData.pubs || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReviews(reviews.filter(review => review.id !== reviewId));
        if (profile) {
          setProfile({ ...profile, reviewsCount: profile.reviewsCount - 1 });
        }
      } else {
        console.error('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleDeleteCheckin = async (checkinId: string) => {
    try {
      const response = await fetch(`/api/checkins/${checkinId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCheckins(checkins.filter(checkin => checkin.id !== checkinId));
        if (profile) {
          setProfile({ ...profile, checkinCount: profile.checkinCount - 1 });
        }
      } else {
        console.error('Failed to delete check-in');
      }
    } catch (error) {
      console.error('Error deleting check-in:', error);
    }
  };

  const handleDeleteWishlist = async (wishlistId: string) => {
    try {
      const response = await fetch(`/api/wishlist/${wishlistId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWishlist(wishlist.filter(item => item.id !== wishlistId));
        if (profile) {
          setProfile({ ...profile, wishlistCount: profile.wishlistCount - 1 });
        }
      } else {
        console.error('Failed to delete wishlist item');
      }
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#08d78c] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.name || session.user.name || 'Your Profile'}
                </h1>
                <p className="text-gray-600">{session.user.email}</p>
                <p className="text-sm text-gray-500">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{profile?.reviewsCount || 0}</div>
            <div className="text-gray-600">Reviews</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{profile?.wishlistCount || 0}</div>
            <div className="text-gray-600">Saved Pubs</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{profile?.checkinCount || 0}</div>
            <div className="text-gray-600">Check-ins</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reviews'
                    ? 'border-[#08d78c] text-[#08d78c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reviews ({reviews.length})
              </button>
              <button
                onClick={() => setActiveTab('wishlist')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'wishlist'
                    ? 'border-[#08d78c] text-[#08d78c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Saved Pubs ({wishlist.length})
              </button>
              <button
                onClick={() => setActiveTab('checkins')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'checkins'
                    ? 'border-[#08d78c] text-[#08d78c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Check-ins ({checkins.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'reviews' && <ReviewsTab reviews={reviews} onDeleteReview={handleDeleteReview} />}
            {activeTab === 'wishlist' && <WishlistTab wishlist={wishlist} onDeleteWishlist={handleDeleteWishlist} />}
            {activeTab === 'checkins' && <CheckinsTab checkins={checkins} onDeleteCheckin={handleDeleteCheckin} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsTab({ reviews, onDeleteReview }: { reviews: UserReview[], onDeleteReview: (id: string) => void }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
        <p className="text-gray-600 mb-4">Start exploring pubs and share your experiences!</p>
        <Link
          href="/pubs"
          className="inline-flex items-center px-4 py-2 bg-[#08d78c] text-black rounded-lg hover:bg-[#06b875] transition-colors"
        >
          Find Pubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button
              onClick={() => onDeleteReview(review.id)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete review"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          {review.title && (
            <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
          )}
          
          <p className="text-gray-700 mb-3">{review.body}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin size={14} />
              <span>{review.pub.name}</span>
            </div>
            <Link
              href={`/pubs/${review.pub.id}`}
              className="text-[#08d78c] hover:text-[#06b875] text-sm flex items-center"
            >
              View Pub
              <ExternalLink size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function WishlistTab({ wishlist, onDeleteWishlist }: { wishlist: WishlistItem[], onDeleteWishlist: (id: string) => void }) {
  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved pubs yet</h3>
        <p className="text-gray-600 mb-4">Start exploring and save pubs you'd like to visit!</p>
        <Link
          href="/pubs"
          className="inline-flex items-center px-4 py-2 bg-[#08d78c] text-black rounded-lg hover:bg-[#06b875] transition-colors"
        >
          Find Pubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {wishlist.map((item) => (
        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                <MapPin size={14} />
                <span>{item.pub.name}</span>
              </div>
              <p className="text-sm text-gray-500">
                Saved on {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/pubs/${item.pub.id}`}
                className="text-[#08d78c] hover:text-[#06b875] text-sm flex items-center"
              >
                View Pub
                <ExternalLink size={14} className="ml-1" />
              </Link>
              <button
                onClick={() => onDeleteWishlist(item.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove from wishlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckinsTab({ checkins, onDeleteCheckin }: { checkins: CheckinItem[], onDeleteCheckin: (id: string) => void }) {
  if (checkins.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No check-ins yet</h3>
        <p className="text-gray-600 mb-4">Start visiting pubs and check in to track your visits!</p>
        <Link
          href="/pubs"
          className="inline-flex items-center px-4 py-2 bg-[#08d78c] text-black rounded-lg hover:bg-[#06b875] transition-colors"
        >
          Find Pubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checkins.map((checkin) => (
        <div key={checkin.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                <MapPin size={14} />
                <span>{checkin.pub.name}</span>
              </div>
              {checkin.note && (
                <p className="text-gray-700 mb-1">{checkin.note}</p>
              )}
              <p className="text-sm text-gray-500">
                Visited on {new Date(checkin.visitedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/pubs/${checkin.pub.id}`}
                className="text-[#08d78c] hover:text-[#06b875] text-sm flex items-center"
              >
                View Pub
                <ExternalLink size={14} className="ml-1" />
              </Link>
              <button
                onClick={() => onDeleteCheckin(checkin.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove check-in"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}