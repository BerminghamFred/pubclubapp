'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Hourglass } from 'lucide-react';
import { generatePubSlug } from '@/utils/slugUtils';

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
              <h1 className="text-2xl font-bold text-gray-900">
                🍺 {currentPub?.name || managerData.pubName || (typeof window !== 'undefined' ? localStorage.getItem('pub-manager-pub-name') : null) || 'Pub'} Dashboard
              </h1>
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

      {/* Main Content - 7 cards (equal height, buttons at bottom) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Manage pub details - with optional Six Nations highlight above card */}
          {(() => {
            const showSixNationsHighlight = new Date() < new Date('2026-03-01');
            const card = (
              <div className="relative">
                {showSixNationsHighlight && (
                  <div className="absolute -top-12 left-0 right-0 flex justify-center z-10">
                    <div className="relative bg-red-500 text-white text-sm font-medium px-5 py-3.5 rounded-lg shadow-md">
                      <span>Add Six Nations filter here</span>
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-red-500" aria-hidden="true" />
                    </div>
                  </div>
                )}
                <div
                  className={`bg-white rounded-lg shadow-md p-6 flex flex-col min-h-[220px] ${showSixNationsHighlight ? 'border-2 border-red-500' : ''}`}
                >
                <div className="flex items-center mb-2">
                  <div className="text-2xl mr-3">✏️</div>
                  <h3 className="text-lg font-semibold text-gray-900">Manage pub details</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 flex-1">
                  Edit name, contact information, hours, and amenities.
                </p>
                <button
                  onClick={() => {
                    if (selectedPubId && selectedPubId !== 'all') {
                      localStorage.setItem('pub-manager-pub-id', selectedPubId);
                    }
                    router.push('/pub-manager/edit');
                  }}
                  disabled={selectedPubId === 'all'}
                  className="w-full mt-auto bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Edit details
                </button>
                </div>
              </div>
            );
            return card;
          })()}

          {/* 2. Analytics - Coming soon */}
          <div className="bg-white rounded-lg shadow-md p-6 opacity-75 cursor-default flex flex-col min-h-[220px]">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 flex-1 flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-gray-500 flex-shrink-0" />
              Coming soon
            </p>
            <div className="h-10" aria-hidden="true" />
          </div>

          {/* 3. Request help */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-[220px]">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-3">📝</div>
              <h3 className="text-lg font-semibold text-gray-900">Request help</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 flex-1">
              Submit requests for updates, fixes, or assistance.
            </p>
            <button
              onClick={() => router.push('/pub-manager/request')}
              className="w-full mt-auto bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Submit Request
            </button>
          </div>

          {/* 4. Reviews - Coming soon */}
          <div className="bg-white rounded-lg shadow-md p-6 opacity-75 cursor-default flex flex-col min-h-[220px]">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-3">⭐</div>
              <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 flex-1 flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-gray-500 flex-shrink-0" />
              Coming soon
            </p>
            <div className="h-10" aria-hidden="true" />
          </div>

          {/* 5. Connect your other pubs */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-[220px]">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-3">🔗</div>
              <h3 className="text-lg font-semibold text-gray-900">Connect your other pubs</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 flex-1">
              For chains: search and add your other pubs. We verify before you can manage them.
            </p>
            <button
              onClick={() => router.push('/pub-manager/connect')}
              className="w-full mt-auto bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Connect pubs
            </button>
          </div>

          {/* 6. Get monthly user insights */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-[220px]">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-3">📬</div>
              <h3 className="text-lg font-semibold text-gray-900">Get monthly user insights</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 flex-1">
              Sign up for our newsletter: popular searches, competitor insights, and tips to drive traffic.
            </p>
            <button
              onClick={() => router.push('/pub-manager/insights')}
              className="w-full mt-auto bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Sign up
            </button>
          </div>

          {/* 7. View pub page */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-[220px]">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-3">🌐</div>
              <h3 className="text-lg font-semibold text-gray-900">View pub page</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 flex-1">
              See how your pub appears to customers on Pub Club.
            </p>
            {currentPub && currentPub.id ? (
              <Link
                href={`/pubs/${generatePubSlug(currentPub.name || 'pub', currentPub.id)}`}
                className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 inline-block text-center"
              >
                View pub page
              </Link>
            ) : (
              <span className="text-sm text-gray-500 mt-auto block">Select a pub above</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
