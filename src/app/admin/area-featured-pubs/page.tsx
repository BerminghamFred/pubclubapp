'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Users, Settings, Plus, Edit } from 'lucide-react';

interface Pub {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  address: string;
  photoUrl?: string;
  amenities: string[];
}

interface FeaturedPub {
  id: string;
  areaName: string;
  pubId: string;
  pub: Pub;
}

interface AreaPubsResponse {
  areaName: string;
  pubs: Pub[];
  total: number;
}

export default function AreaFeaturedPubsPage() {
  const router = useRouter();
  const [featuredPubs, setFeaturedPubs] = useState<FeaturedPub[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaPubs, setAreaPubs] = useState<Pub[]>([]);
  const [loadingPubs, setLoadingPubs] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get list of all areas from pub data
  const [allAreas, setAllAreas] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchFeaturedPubs(),
          fetchAllAreas()
        ]);
      } catch (err) {
        setError('Failed to load data');
        console.error('Error loading page data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const fetchFeaturedPubs = async () => {
    try {
      const response = await fetch('/api/admin/area-featured-pubs');
      if (response.ok) {
        const data = await response.json();
        setFeaturedPubs(data.featuredPubs);
      }
    } catch (error) {
      console.error('Error fetching featured pubs:', error);
    }
  };

  const fetchAllAreas = async () => {
    try {
      // Try to get areas from a dedicated admin endpoint first, then fallback to pub data
      const response = await fetch('/api/admin/areas');
      if (response.ok) {
        const data = await response.json();
        console.log('Admin areas response:', data);
        setAllAreas(data.areas || []);
      } else {
        // Fallback: try homepage areas API
        const fallbackResponse = await fetch('/api/homepage/areas');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          console.log('Homepage areas API response:', data);
          const areas = data.areas?.map((area: any) => area.name) || [];
          console.log('Extracted areas:', areas);
          setAllAreas(areas.sort());
        } else {
          console.error('Failed to fetch areas from both endpoints');
          setError('Failed to load areas data');
        }
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      setError('Failed to load areas data');
    }
  };

  const fetchAreaPubs = async (areaName: string) => {
    setLoadingPubs(true);
    try {
      const response = await fetch(`/api/admin/areas/${encodeURIComponent(areaName)}/pubs`);
      if (response.ok) {
        const data: AreaPubsResponse = await response.json();
        console.log('Fetched area pubs:', data);
        console.log('Pubs with photos:', data.pubs.filter(pub => pub.photoUrl).length);
        setAreaPubs(data.pubs);
        setSelectedArea(areaName);
      }
    } catch (error) {
      console.error('Error fetching area pubs:', error);
    } finally {
      setLoadingPubs(false);
    }
  };

  const setFeaturedPub = async (areaName: string, pubId: string) => {
    setSaving(pubId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/area-featured-pubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ areaName, pubId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Featured pub for ${areaName} updated successfully!`);
        await fetchFeaturedPubs(); // Refresh the list
        setTimeout(() => {
          setSelectedArea(null); // Close the modal
          setAreaPubs([]);
          setSuccess(null);
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Failed to set featured pub (${response.status})`);
        console.error('Error setting featured pub:', errorData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      setError(errorMessage);
      console.error('Error setting featured pub:', error);
    } finally {
      setSaving(null);
    }
  };

  const getFeaturedPubForArea = (areaName: string) => {
    return featuredPubs.find(fp => fp.areaName === areaName)?.pub;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Area Featured Pubs</h1>
              <p className="text-gray-600 mt-2">
                Select which pub represents each area on the homepage carousel
              </p>
            </div>
            <Button
              onClick={() => router.back()}
              variant="outline"
            >
              Back to Admin
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading areas...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                window.location.reload();
              }} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Areas Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allAreas.length > 0 ? (
              allAreas.map((areaName) => {
            const featuredPub = getFeaturedPubForArea(areaName);
            return (
              <Card key={areaName} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#08d78c]" />
                    <CardTitle className="text-lg">{areaName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {featuredPub ? (
                    <div className="space-y-3">
                      {/* Featured Pub Display */}
                      <div className="flex items-start gap-3">
                        {featuredPub.photoUrl && (
                          <img
                            src={featuredPub.photoUrl}
                            alt={featuredPub.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {featuredPub.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{featuredPub.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{featuredPub.reviewCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => fetchAreaPubs(areaName)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Change Pub
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-3">No featured pub selected</p>
                      <Button
                        onClick={() => fetchAreaPubs(areaName)}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Select Pub
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No areas found. Please check the console for errors.</p>
              </div>
            )}
          </div>
        )}

        {/* Pub Selection Modal */}
        {selectedArea && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  Select Featured Pub for {selectedArea}
                </h2>
                <p className="text-gray-600 mt-1">
                  Choose the pub that best represents this area
                </p>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                {loadingPubs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c]"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {areaPubs.map((pub) => (
                      <button
                        key={pub.id}
                        onClick={() => setFeaturedPub(selectedArea, pub.id)}
                        disabled={saving === pub.id}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#08d78c] hover:bg-green-50 transition-colors text-left disabled:opacity-50"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {pub.photoUrl ? (
                              <img
                                src={pub.photoUrl}
                                alt={pub.name}
                                className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                loading="lazy"
                                onError={(e) => {
                                  // Hide the image and show fallback if it fails to load
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
                              style={{ display: pub.photoUrl ? 'none' : 'flex' }}
                            >
                              <span className="text-2xl">🍺</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {pub.name}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {pub.address}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>{pub.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{pub.reviewCount || 0}</span>
                              </div>
                            </div>
                            {pub.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pub.amenities.slice(0, 3).map((amenity) => (
                                  <span
                                    key={amenity}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                  >
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {saving === pub.id && (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#08d78c]"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t flex justify-end gap-2">
                {error && (
                  <div className="flex-1 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <Button
                  onClick={() => {
                    setSelectedArea(null);
                    setAreaPubs([]);
                    setError(null);
                    setSuccess(null);
                  }}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
