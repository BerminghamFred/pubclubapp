'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface HomepageSlot {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  areaSlug: string;
  amenitySlug: string | null;
  pubCount: number;
  score: number;
  isSeasonal: boolean;
  isActive: boolean;
  position: number | null;
  views: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export default function HomepageSlotsPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<HomepageSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const response = await fetch('/api/admin/homepage-slots');
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Error loading homepage slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateSlots = async () => {
    setRegenerating(true);
    try {
      console.log('Sending regenerate request...');
      const response = await fetch('/api/admin/homepage-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'regenerate' }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);

      if (response.ok) {
        await loadSlots(); // Reload the slots
        alert('Homepage slots regenerated successfully!');
      } else {
        alert(`Failed to regenerate homepage slots: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error regenerating homepage slots:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error regenerating homepage slots: ${message}`);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Homepage Trending Slots</h1>
              <p className="text-gray-600 mt-2">
                Manage the trending area × filter tiles displayed on the homepage
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/admin/homepage-slots/select')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Select Slots Manually
              </Button>
              <Button
                onClick={regenerateSlots}
                disabled={regenerating}
                className="bg-[#08d78c] hover:bg-[#06b875] text-black"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate Slots'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-2xl font-bold text-gray-900">{slots.length}</div>
            <div className="text-sm text-gray-600">Active Slots</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-gray-900">
              {slots.reduce((sum, slot) => sum + slot.views, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-gray-900">
              {slots.reduce((sum, slot) => sum + slot.clicks, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Clicks</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-gray-900">
              {slots.length > 0 
                ? (slots.reduce((sum, slot) => sum + slot.clicks, 0) / slots.reduce((sum, slot) => sum + slot.views, 1) * 100).toFixed(1) + '%'
                : '0%'
              }
            </div>
            <div className="text-sm text-gray-600">Avg CTR</div>
          </Card>
        </div>

        {/* Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slots.map((slot) => (
            <Card key={slot.id} className="overflow-hidden">
              <div className="p-6">
                {/* Slot Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{slot.icon}</div>
                  <div className="flex gap-2">
                    {slot.isSeasonal && (
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-semibold">
                        Seasonal
                      </span>
                    )}
                    <span className="bg-[#08d78c] text-black text-xs px-2 py-1 rounded-full font-semibold">
                      #{slot.position}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {slot.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                  {slot.subtitle}
                </p>

                {/* Slot Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Area:</span>
                    <span className="font-medium">{slot.areaSlug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amenity:</span>
                    <span className="font-medium">{slot.amenitySlug || 'All Pubs'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pubs:</span>
                    <span className="font-medium">{slot.pubCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score:</span>
                    <span className="font-medium">{slot.score.toFixed(3)}</span>
                  </div>
                </div>

                {/* Analytics */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Views</div>
                      <div className="font-semibold">{slot.views}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Clicks</div>
                      <div className="font-semibold">{slot.clicks}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-gray-600 text-xs">CTR</div>
                    <div className="font-semibold text-sm">
                      {slot.views > 0 ? ((slot.clicks / slot.views) * 100).toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <a
                    href={slot.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#08d78c] hover:text-[#06b875] text-sm font-medium"
                  >
                    View Page →
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {slots.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No homepage slots found
            </h3>
            <p className="text-gray-600 mb-6">
              Generate trending slots to display on the homepage
            </p>
            <Button
              onClick={regenerateSlots}
              disabled={regenerating}
              className="bg-[#08d78c] hover:bg-[#06b875] text-black"
            >
              {regenerating ? 'Generating...' : 'Generate Initial Slots'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
