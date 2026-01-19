'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Pub {
  id: string;
  name: string;
  slug: string;
}

interface PubManagerData {
  pubId: string;
  pubName: string;
  email: string;
  pubs: Pub[];
}

interface AnalyticsOverview {
  totalViews: number;
  uniqueVisitors: number;
  avgViewsPerDay: number;
  totalCtaClicks: number;
}

export default function PubManagerDashboard() {
  const [managerData, setManagerData] = useState<PubManagerData | null>(null);
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [pubStats, setPubStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('pub-manager-token');
    const pubId = localStorage.getItem('pub-manager-pub-id');
    const pubName = localStorage.getItem('pub-manager-pub-name');

    if (!token || !pubId || !pubName) {
      router.push('/pub-manager/login');
      return;
    }

    // Verify token with server
    verifyToken(token, pubId);
  }, [router]);

  useEffect(() => {
    // Set selected pub from localStorage or default to first pub
    if (managerData && managerData.pubs.length > 0) {
      const storedPubId = localStorage.getItem('selected-pub-id');
      const pubToSelect = storedPubId && managerData.pubs.find(p => p.id === storedPubId)
        ? storedPubId
        : managerData.pubId;
      setSelectedPubId(pubToSelect);
      localStorage.setItem('selected-pub-id', pubToSelect);
      if (pubToSelect !== 'all') {
        loadDashboardData(pubToSelect);
      }
    }
  }, [managerData, selectedPubId]);

  const loadDashboardData = async (pubId: string) => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) return;

    try {
      // Load analytics
      const analyticsResponse = await fetch(`/api/pub-manager/analytics?pubId=${pubId}&period=30`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const analyticsData = await analyticsResponse.json();
      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics.overview);
      }

      // Load pub stats
      const pubResponse = await fetch(`/api/pubs/${pubId}`);
      const pubData = await pubResponse.json();
      if (pubData) {
        setPubStats({
          rating: pubData.rating || 0,
          reviewCount: pubData.reviewCount || 0,
          photoCount: pubData.photos?.length || 0,
          amenityCount: pubData.amenities?.length || 0,
          lastUpdated: pubData.lastUpdated
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const verifyToken = async (token: string, pubId: string) => {
    try {
      const response = await fetch('/api/pub-manager/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setManagerData({
          pubId: data.pubId,
          pubName: data.pubName,
          email: data.email,
          pubs: data.pubs || [{ id: data.pubId, name: data.pubName, slug: '' }],
        });
        // Load analytics and pub stats
        loadDashboardData(data.pubId);
      } else {
        // Token invalid, redirect to login
        localStorage.removeItem('pub-manager-token');
        localStorage.removeItem('pub-manager-pub-id');
        localStorage.removeItem('pub-manager-pub-name');
        localStorage.removeItem('selected-pub-id');
        router.push('/pub-manager/login');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      router.push('/pub-manager/login');
    } finally {
      setLoading(false);
    }
  };

  const handlePubChange = (pubId: string) => {
    setSelectedPubId(pubId);
    localStorage.setItem('selected-pub-id', pubId);
    // Update localStorage with new pub info
    const selectedPub = managerData?.pubs.find(p => p.id === pubId);
    if (selectedPub) {
      localStorage.setItem('pub-manager-pub-id', pubId);
      localStorage.setItem('pub-manager-pub-name', selectedPub.name);
    }
  };

  const currentPub = managerData?.pubs.find(p => p.id === selectedPubId) || managerData?.pubs[0];

  const handleLogout = () => {
    localStorage.removeItem('pub-manager-token');
    localStorage.removeItem('pub-manager-pub-id');
    localStorage.removeItem('pub-manager-pub-name');
    localStorage.removeItem('selected-pub-id');
    router.push('/pub-manager/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!managerData) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🍺 Pub Manager Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {managerData.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Multi-Pub Selector Tabs */}
          {managerData.pubs.length > 1 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex space-x-1 overflow-x-auto">
                <button
                  onClick={() => handlePubChange('all')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 ${
                    selectedPubId === 'all'
                      ? 'bg-[#08d78c] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Pubs
                </button>
                {managerData.pubs.map((pub) => (
                  <button
                    key={pub.id}
                    onClick={() => handlePubChange(pub.id)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                      selectedPubId === pub.id
                        ? 'bg-[#08d78c] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pub.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        {selectedPubId !== 'all' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Views</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </div>
                <div className="text-3xl">👁️</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.uniqueVisitors.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg Views/Day</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.avgViewsPerDay.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </div>
                <div className="text-3xl">📈</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Rating</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {pubStats?.rating ? pubStats.rating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{pubStats?.reviewCount || 0} reviews</p>
                </div>
                <div className="text-3xl">⭐</div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {selectedPubId !== 'all' && pubStats && (
          <div className="mb-8 space-y-3">
            {pubStats.photoCount === 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>No photos uploaded.</strong> Add photos to make your pub more attractive to customers.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {pubStats.photoCount > 0 && pubStats.photoCount < 3 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Low photo count.</strong> Consider adding more photos to showcase your pub better.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {pubStats.lastUpdated && (new Date().getTime() - new Date(pubStats.lastUpdated).getTime()) > 90 * 24 * 60 * 60 * 1000 && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-orange-400">📅</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      <strong>Information may be outdated.</strong> Consider updating your pub details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pub Info Card */}
        {currentPub && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedPubId === 'all' ? 'All Your Pubs' : currentPub.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">Pub ID</h3>
                <p className="text-blue-700 text-sm font-mono">{selectedPubId === 'all' ? 'Multiple' : currentPub.id}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900">Manager Email</h3>
                <p className="text-green-700 text-sm">{managerData.email}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900">Status</h3>
                <p className="text-purple-700 text-sm">Active</p>
              </div>
              {managerData.pubs.length > 1 && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-medium text-amber-900">Total Pubs</h3>
                  <p className="text-amber-700 text-sm font-semibold">{managerData.pubs.length}</p>
                </div>
              )}
              {selectedPubId !== 'all' && pubStats && (
                <>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="font-medium text-indigo-900">Photos</h3>
                    <p className="text-indigo-700 text-sm font-semibold">{pubStats.photoCount}</p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <h3 className="font-medium text-pink-900">Amenities</h3>
                    <p className="text-pink-700 text-sm font-semibold">{pubStats.amenityCount}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Management Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Edit Pub Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">✏️</div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Pub Details</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Update your pub's name, description, opening hours, and contact information.
            </p>
            <button 
              onClick={() => {
                if (selectedPubId && selectedPubId !== 'all') {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId);
                }
                router.push('/pub-manager/edit');
              }}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Edit Details
            </button>
          </div>

          {/* Manage Amenities */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">🍽️</div>
              <h3 className="text-lg font-semibold text-gray-900">Manage Amenities</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Add or remove amenities like beer garden, live music, food options, etc.
            </p>
            <button 
              onClick={() => {
                if (selectedPubId && selectedPubId !== 'all') {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId);
                }
                router.push('/pub-manager/amenities');
              }}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Manage Amenities
            </button>
          </div>

          {/* Photo Gallery */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">📸</div>
              <h3 className="text-lg font-semibold text-gray-900">Photo Gallery</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Upload, organize, and manage photos of your pub.
            </p>
            {selectedPubId !== 'all' && pubStats && (
              <p className="text-xs text-gray-500 mb-4">
                {pubStats.photoCount} photo{pubStats.photoCount !== 1 ? 's' : ''} uploaded
              </p>
            )}
            <button 
              onClick={() => {
                if (selectedPubId && selectedPubId !== 'all') {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId);
                }
                router.push('/pub-manager/photos');
              }}
              disabled={selectedPubId === 'all'}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Manage Photos
            </button>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">⭐</div>
              <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              View and respond to customer reviews and ratings.
            </p>
            <button className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200">
              View Reviews
            </button>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              View page views, popular times, and visitor insights.
            </p>
            {selectedPubId !== 'all' && analytics && (
              <p className="text-xs text-gray-500 mb-4">
                {analytics.totalViews} views in last 30 days
              </p>
            )}
            <button 
              onClick={() => {
                if (selectedPubId && selectedPubId !== 'all') {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId);
                }
                router.push('/pub-manager/analytics');
              }}
              disabled={selectedPubId === 'all'}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              View Analytics
            </button>
          </div>

          {/* Benchmarking */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">📈</div>
              <h3 className="text-lg font-semibold text-gray-900">Benchmarking</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Compare your pub against all pubs and nearby competitors.
            </p>
            <button 
              onClick={() => {
                if (selectedPubId && selectedPubId !== 'all') {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId);
                }
                router.push('/pub-manager/benchmark');
              }}
              disabled={selectedPubId === 'all'}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              View Benchmarking
            </button>
          </div>

          {/* Request Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">📝</div>
              <h3 className="text-lg font-semibold text-gray-900">Request Help</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Submit requests for updates, fixes, or assistance.
            </p>
            <button 
              onClick={() => router.push('/pub-manager/request')}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Submit Request
            </button>
          </div>

          {/* Pub Page */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">🔗</div>
              <h3 className="text-lg font-semibold text-gray-900">View Pub Page</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              See how your pub appears to customers on Pub Club.
            </p>
            {currentPub && currentPub.slug && (
              <Link 
                href={`/pubs/${currentPub.slug}`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 inline-block text-center"
              >
                View Pub Page
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {selectedPubId !== 'all' && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId!);
                  router.push('/pub-manager/edit');
                }}
                className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-left transition-colors duration-200"
              >
                <div className="text-2xl mb-2">✏️</div>
                <p className="font-medium text-gray-900">Update Hours</p>
                <p className="text-sm text-gray-500">Edit opening hours</p>
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId!);
                  router.push('/pub-manager/photos');
                }}
                className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-left transition-colors duration-200"
              >
                <div className="text-2xl mb-2">📸</div>
                <p className="font-medium text-gray-900">Add Photos</p>
                <p className="text-sm text-gray-500">Upload new photos</p>
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('pub-manager-pub-id', selectedPubId!);
                  router.push('/pub-manager/analytics');
                }}
                className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-left transition-colors duration-200"
              >
                <div className="text-2xl mb-2">📊</div>
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">See performance</p>
              </button>
              <button
                onClick={() => router.push('/pub-manager/request')}
                className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg text-left transition-colors duration-200"
              >
                <div className="text-2xl mb-2">📝</div>
                <p className="font-medium text-gray-900">Request Help</p>
                <p className="text-sm text-gray-500">Get assistance</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
