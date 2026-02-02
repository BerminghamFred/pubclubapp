'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAmenitiesByCategory } from '@/utils/getAllAmenities';

interface PubData {
  id: string;
  name: string;
  amenities: string[];
  last_updated?: string;
  updated_by?: string;
}

// Dynamic amenities will be loaded from the data

export default function ManageAmenitiesPage() {
  const [pubData, setPubData] = useState<PubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [amenityCategories, setAmenityCategories] = useState<Record<string, string[]>>({});
  const router = useRouter();

  useEffect(() => {
    loadPubData();
    // Load dynamic amenities
    const categories = getAmenitiesByCategory();
    setAmenityCategories(categories);
    
    // Set first category as default
    const firstCategory = Object.keys(categories)[0];
    if (firstCategory) {
      setSelectedCategory(firstCategory);
    }
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
        const pubId = data.pubId || localStorage.getItem('pub-manager-pub-id');
        if (!pubId) {
          router.push('/pub-manager/login');
          return;
        }
        
        const pubResponse = await fetch(`/api/pubs/${pubId}`);
        const pubInfo = await pubResponse.json();
        
        if (pubInfo) {
          setPubData({
            id: pubInfo.id,
            name: pubInfo.name || '',
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
          amenities: pubData.amenities
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Amenities updated successfully!');
        setMessageType('success');
        setPubData({
          ...pubData,
          amenities: result.pub.amenities || [],
          last_updated: result.pub.lastUpdated,
          updated_by: result.pub.updatedBy
        });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(result.message || 'Failed to update amenities');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Update error:', error);
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
          <p className="text-gray-600">Loading amenities...</p>
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
                className="inline-flex items-center gap-2 bg-[#08d78c] hover:bg-[#06b875] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Manage Amenities</h1>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Current Amenities Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Current Amenities ({pubData.amenities.length})
          </h2>
          {pubData.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pubData.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="px-3 py-1 bg-[#08d78c] text-white text-sm rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No amenities selected</p>
          )}
        </div>

        {/* Category Tabs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Amenities by Category</h3>
            <nav className="-mb-px flex space-x-2 overflow-x-auto pb-4">
              {Object.keys(amenityCategories).map((category) => {
                const selectedCount = amenityCategories[category].filter(amenity => 
                  pubData.amenities.includes(amenity)
                ).length;
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap rounded-t-lg transition-all duration-200 ${
                      selectedCategory === category
                        ? 'border-[#08d78c] text-[#08d78c] bg-[#08d78c]/5'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-base">{category}</span>
                      <span className="text-xs mt-1">
                        {selectedCount > 0 && (
                          <span className="bg-[#08d78c] text-white px-2 py-0.5 rounded-full text-xs">
                            {selectedCount}
                          </span>
                        )}
                        <span className="ml-1 text-gray-400">
                          ({amenityCategories[category].length})
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search amenities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            />
          </div>

          {/* Category Description */}
          {selectedCategory && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{selectedCategory}</h4>
              <p className="text-sm text-gray-600">
                {selectedCategory === '🍺 Beer & Drinks' && 'Alcoholic beverages, craft beers, and specialty drinks available at your pub.'}
                {selectedCategory === '🍽️ Food & Dining' && 'Food options, menus, and dining experiences you offer to customers.'}
                {selectedCategory === '🎵 Entertainment' && 'Live music, DJs, karaoke, and other entertainment features.'}
                {selectedCategory === '🎮 Games & Activities' && 'Games, sports viewing, and interactive activities for customers.'}
                {selectedCategory === '🌿 Outdoor & Atmosphere' && 'Outdoor spaces, gardens, and atmospheric features of your pub.'}
                {selectedCategory === '👥 Family & Accessibility' && 'Family-friendly features and accessibility options for all customers.'}
                {selectedCategory === '⚡ Services & Features' && 'Additional services like WiFi, sports viewing, and modern conveniences.'}
                {selectedCategory === '🏠 Facilities' && 'Physical facilities and amenities available at your location.'}
              </p>
            </div>
          )}

          {/* Amenities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {selectedCategory && amenityCategories[selectedCategory]?.filter((amenity) => 
              searchQuery === '' || amenity.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((amenity) => (
              <label key={amenity} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                pubData.amenities.includes(amenity)
                  ? 'border-[#08d78c] bg-[#08d78c]/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={pubData.amenities.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="h-4 w-4 text-[#08d78c] focus:ring-[#08d78c] border-gray-300 rounded"
                />
                <span className={`ml-3 text-sm font-medium ${
                  pubData.amenities.includes(amenity) ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {amenity}
                </span>
              </label>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (!pubData) return;
                const currentCategoryAmenities = amenityCategories[selectedCategory] || [];
                const allSelected = currentCategoryAmenities.every(amenity => 
                  pubData.amenities.includes(amenity)
                );
                
                if (allSelected) {
                  // Deselect all in current category
                  const newAmenities = pubData.amenities.filter(amenity => 
                    !currentCategoryAmenities.includes(amenity)
                  );
                  setPubData({ ...pubData, amenities: newAmenities });
                } else {
                  // Select all in current category
                  const newAmenities = [...new Set([...pubData.amenities, ...currentCategoryAmenities])];
                  setPubData({ ...pubData, amenities: newAmenities });
                }
              }}
              className="px-4 py-2 text-sm font-medium text-[#08d78c] hover:text-[#06b875] border border-[#08d78c] hover:border-[#06b875] rounded-md transition-colors duration-200"
            >
              {selectedCategory && amenityCategories[selectedCategory]?.every(amenity => 
                pubData.amenities.includes(amenity)
              ) ? 'Deselect All' : 'Select All'}
            </button>
            
            <button
              onClick={() => setPubData({ ...pubData, amenities: [] })}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-md transition-colors duration-200"
            >
              Clear All
            </button>
          </div>

          {pubData.last_updated && (
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
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
