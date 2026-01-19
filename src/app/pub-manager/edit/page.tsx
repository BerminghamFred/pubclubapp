'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllUniqueAmenities } from '@/utils/getAllAmenities';

interface PubData {
  id: string;
  name: string;
  description: string;
  phone: string;
  website: string;
  openingHours: string;
  amenities: string[];
  last_updated?: string;
  updated_by?: string;
}

// Dynamic amenities will be loaded from the data

export default function EditPubPage() {
  const [pubData, setPubData] = useState<PubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [availableAmenities, setAvailableAmenities] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadPubData();
    // Load dynamic amenities
    const amenities = getAllUniqueAmenities();
    setAvailableAmenities(amenities);
  }, []);

  const loadPubData = async () => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }

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
        // Use pubId from verify response or localStorage
        const pubId = data.pubId || localStorage.getItem('pub-manager-pub-id');
        if (!pubId) {
          router.push('/pub-manager/login');
          return;
        }
        
        // Fetch full pub data from database
        const pubResponse = await fetch(`/api/pubs/${pubId}`);
        const pubInfo = await pubResponse.json();
        
        if (pubInfo) {
          setPubData({
            id: pubInfo.id,
            name: pubInfo.name || '',
            description: pubInfo.description || '',
            phone: pubInfo.phone || '',
            website: pubInfo.website || '',
            openingHours: pubInfo.openingHours || '',
            amenities: pubInfo.amenities?.map((a: any) => a.amenity?.key || a.amenity?.label || a) || [],
            last_updated: pubInfo.lastUpdated,
            updated_by: pubInfo.updatedBy
          });
        }
      } else {
        router.push('/pub-manager/login');
      }
    } catch (error) {
      console.error('Failed to load pub data:', error);
      router.push('/pub-manager/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pubData) return;

    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('pub-manager-token');
      const response = await fetch('/api/pub-manager/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pubData.name,
          description: pubData.description,
          phone: pubData.phone,
          website: pubData.website,
          openingHours: pubData.openingHours,
          amenities: pubData.amenities
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Pub details updated successfully!');
        setMessageType('success');
        setPubData({
          ...pubData,
          ...result.pub,
          last_updated: result.pub.lastUpdated,
          updated_by: result.pub.updatedBy
        });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(result.message || 'Failed to update pub details');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('An error occurred while saving. Please try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    if (!pubData) return;
    
    const newAmenities = pubData.amenities.includes(amenity)
      ? pubData.amenities.filter(a => a !== amenity)
      : [...pubData.amenities, amenity];
    
    setPubData({ ...pubData, amenities: newAmenities });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pub data...</p>
        </div>
      </div>
    );
  }

  if (!pubData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/pub-manager/dashboard')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Edit Pub Details</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Pub Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={pubData.name}
                  onChange={(e) => setPubData({ ...pubData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={pubData.phone}
                  onChange={(e) => setPubData({ ...pubData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                  placeholder="020 1234 5678"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                id="website"
                value={pubData.website}
                onChange={(e) => setPubData({ ...pubData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                placeholder="https://yourpub.com"
              />
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={pubData.description}
                onChange={(e) => setPubData({ ...pubData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                placeholder="Describe your pub, its atmosphere, specialties, etc."
              />
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Opening Hours</h2>
            <textarea
              rows={3}
              value={pubData.openingHours}
              onChange={(e) => setPubData({ ...pubData, openingHours: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              placeholder="Monday: 12:00 – 23:00;Tuesday: 12:00 – 23:00;Wednesday: 12:00 – 23:00;Thursday: 12:00 – 23:00;Friday: 12:00 – 00:00;Saturday: 12:00 – 00:00;Sunday: 12:00 – 22:30"
            />
            <p className="text-sm text-gray-500 mt-2">
              Format: Day: Opening Time – Closing Time; (separate days with semicolons)
            </p>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities & Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {availableAmenities.map((amenity) => (
                <label key={amenity} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pubData.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="h-4 w-4 text-[#08d78c] focus:ring-[#08d78c] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Showing {availableAmenities.length} available amenities from your database
            </p>
          </div>

          {/* Last Updated Info */}
          {pubData.last_updated && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Last Updated</h3>
              <p className="text-sm text-gray-600">
                {new Date(pubData.last_updated).toLocaleString()} by {pubData.updated_by || 'unknown'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
