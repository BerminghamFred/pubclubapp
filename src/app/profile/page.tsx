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
  Settings
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
    area: string;
    photoUrl?: string;
  };
}

interface WishlistItem {
  id: string;
  createdAt: string;
  pub: {
    id: string;
    name: string;
    area: string;
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
    area: string;
    rating: number;
    reviewCount: number;
    photoUrl?: string;
  };
}

type TabType = 'reviews' | 'wishlist' | 'checkins';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('reviews');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Load profile if authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [session, status]);

  // Load data when tab changes
  useEffect(() => {
    if (session?.user && activeTab) {
      loadTabData();
    }
  }, [activeTab, session]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    setTabLoading(true);
    try {
      switch (activeTab) {
        case 'reviews':
          // Load reviews from user's wishlist and checkins (we'll need to create this endpoint)
          await loadReviews();
          break;
        case 'wishlist':
          await loadWishlist();
          break;
        case 'checkins':
          await loadCheckins();
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    } finally {
      setTabLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const response = await fetch(`/api/users/me/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadWishlist = async () => {
    try {
      const response = await fetch('/api/users/me/wishlist');
      if (response.ok) {
        const data = await response.json();
        setWishlist(data.pubs || []);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const loadCheckins = async () => {
    try {
      const response = await fetch('/api/users/me/checkins');
      if (response.ok) {
        const data = await response.json();
        setCheckins(data.pubs || []);
      }
    } catch (error) {
      console.error('Error loading checkins:', error);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c]"></div>
      </div>
    );
  }

  // Show login portal if not authenticated
  if (!session?.user) {
    return <LoginPortal />;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {profile.image ? (
                <img 
                  src={profile.image} 
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{profile.name || 'User'}</h1>
              <p className="text-gray-300 mb-4">{profile.email}</p>
              <div className="flex items-center gap-6 text-sm text-gray-300">
                <span>Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                <Settings className="w-4 h-4 mr-2 inline" />
                Settings
              </button>
              <button 
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2 inline" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#08d78c]">{profile.reviewsCount}</div>
              <div className="text-sm text-gray-600">Reviews Written</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#08d78c]">{profile.wishlistCount}</div>
              <div className="text-sm text-gray-600">Saved Pubs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#08d78c]">{profile.checkinCount}</div>
              <div className="text-sm text-gray-600">Pubs Visited</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reviews'
                    ? 'border-[#08d78c] text-[#08d78c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Star className="w-4 h-4 mr-2 inline" />
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('wishlist')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'wishlist'
                    ? 'border-[#08d78c] text-[#08d78c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Heart className="w-4 h-4 mr-2 inline" />
                Wishlist
              </button>
              <button
                onClick={() => setActiveTab('checkins')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'checkins'
                    ? 'border-[#08d78c] text-[#08d78c]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CheckCircle className="w-4 h-4 mr-2 inline" />
                Check-ins
              </button>
            </nav>
          </div>
        </div>
      </section>

      {/* Tab Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tabLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'reviews' && <ReviewsTab reviews={reviews} />}
            {activeTab === 'wishlist' && <WishlistTab wishlist={wishlist} />}
            {activeTab === 'checkins' && <CheckinsTab checkins={checkins} />}
          </>
        )}
      </section>
    </div>
  );
}

// Reviews Tab Component
function ReviewsTab({ reviews }: { reviews: UserReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
        <p className="text-gray-600 mb-6">Start exploring pubs and share your experiences!</p>
        <Link 
          href="/pubs" 
          className="bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Browse Pubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Your Reviews</h2>
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                {review.pub.photoUrl ? (
                  <img 
                    src={review.pub.photoUrl} 
                    alt={review.pub.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#08d78c]/20 flex items-center justify-center">
                    <span className="text-[#08d78c] text-lg">🍺</span>
                  </div>
                )}
              </div>
              <div>
                <Link 
                  href={`/pubs/${review.pub.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-[#08d78c] transition-colors"
                >
                  {review.pub.name}
                </Link>
                <p className="text-sm text-gray-500">{review.pub.area}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-lg ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          
          {review.title && (
            <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
          )}
          <p className="text-gray-700 mb-4">{review.body}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
            <div className="flex gap-3">
              <button className="text-[#08d78c] hover:underline">Edit</button>
              <button className="text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Wishlist Tab Component
function WishlistTab({ wishlist }: { wishlist: WishlistItem[] }) {
  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
        <p className="text-gray-600 mb-6">Save pubs you want to visit!</p>
        <Link 
          href="/pubs" 
          className="bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Browse Pubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Saved Pubs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {wishlist.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <Link href={`/pubs/${item.pub.id}`}>
              <div className="h-48 bg-gray-200 overflow-hidden">
                {item.pub.photoUrl ? (
                  <img 
                    src={item.pub.photoUrl} 
                    alt={item.pub.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-[#08d78c]/20 flex items-center justify-center">
                    <span className="text-[#08d78c] text-4xl">🍺</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="p-4">
              <Link 
                href={`/pubs/${item.pub.id}`}
                className="text-lg font-semibold text-gray-900 hover:text-[#08d78c] transition-colors"
              >
                {item.pub.name}
              </Link>
              <p className="text-sm text-gray-500 mb-2">{item.pub.area}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span>{item.pub.rating}</span>
                </div>
                <span>•</span>
                <span>{item.pub.reviewCount} reviews</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">
                  Saved {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <button className="text-red-600 hover:underline text-sm">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Check-ins Tab Component
function CheckinsTab({ checkins }: { checkins: CheckinItem[] }) {
  if (checkins.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No check-ins yet</h3>
        <p className="text-gray-600 mb-6">Check in to pubs you've visited!</p>
        <Link 
          href="/pubs" 
          className="bg-[#08d78c] hover:bg-[#06b875] text-black px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Browse Pubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pubs You've Visited</h2>
      <div className="space-y-4">
        {checkins.map((checkin) => (
          <div key={checkin.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {checkin.pub.photoUrl ? (
                  <img 
                    src={checkin.pub.photoUrl} 
                    alt={checkin.pub.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#08d78c]/20 flex items-center justify-center">
                    <span className="text-[#08d78c] text-lg">🍺</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Link 
                  href={`/pubs/${checkin.pub.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-[#08d78c] transition-colors"
                >
                  {checkin.pub.name}
                </Link>
                <p className="text-sm text-gray-500 mb-2">{checkin.pub.area}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span>{checkin.pub.rating}</span>
                  </div>
                  <span>•</span>
                  <span>{checkin.pub.reviewCount} reviews</span>
                </div>
                {checkin.note && (
                  <p className="text-sm text-gray-700 italic">"{checkin.note}"</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-600 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Visited</span>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(checkin.visitedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Login Portal Component
function LoginPortal() {

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    if (email) {
      await signIn('email', { email, redirect: false });
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/profile' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-black text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome to Pub Club</h1>
            <p className="text-xl text-gray-300">Sign in to access your profile and manage your pub experiences</p>
          </div>
        </div>
      </section>

      {/* Login Portal */}
      <section className="py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In to Your Account</h2>
            
            {/* Email Sign In */}
            <form onSubmit={handleEmailSignIn} className="mb-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#08d78c] hover:bg-[#06b875] text-black py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Send Magic Link
              </button>
            </form>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Benefits */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What you can do with an account:</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-[#08d78c]" />
                  Write and manage reviews
                </li>
                <li className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-[#08d78c]" />
                  Save pubs to your wishlist
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-[#08d78c]" />
                  Check in to pubs you've visited
                </li>
                <li className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#08d78c]" />
                  Track your pub experiences
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
