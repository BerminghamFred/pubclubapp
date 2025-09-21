'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PubManagerData {
  pubId: string;
  pubName: string;
  email: string;
}

export default function PubManagerDashboard() {
  const [managerData, setManagerData] = useState<PubManagerData | null>(null);
  const [loading, setLoading] = useState(true);
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
        });
      } else {
        // Token invalid, redirect to login
        localStorage.removeItem('pub-manager-token');
        localStorage.removeItem('pub-manager-pub-id');
        localStorage.removeItem('pub-manager-pub-name');
        router.push('/pub-manager/login');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      router.push('/pub-manager/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pub-manager-token');
    localStorage.removeItem('pub-manager-pub-id');
    localStorage.removeItem('pub-manager-pub-name');
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pub Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {managerData.pubName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Pub ID</h3>
              <p className="text-blue-700 text-sm font-mono">{managerData.pubId}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Manager Email</h3>
              <p className="text-green-700 text-sm">{managerData.email}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900">Status</h3>
              <p className="text-purple-700 text-sm">Active</p>
            </div>
          </div>
        </div>

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
              onClick={() => router.push('/pub-manager/edit')}
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
              onClick={() => router.push('/pub-manager/amenities')}
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
            <button className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200">
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
            <button className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200">
              View Analytics
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
            <Link 
              href={`/pubs/${managerData.pubId}`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 inline-block text-center"
            >
              View Pub Page
            </Link>
          </div>
        </div>

        {/* Features Available Notice */}
        <div className="mt-8 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <strong>Available Now:</strong> You can now edit your pub details and manage amenities directly from this dashboard. Photo management and review responses are coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
