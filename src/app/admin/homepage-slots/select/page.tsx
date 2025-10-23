'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Candidate {
  areaSlug: string;
  amenitySlug: string;
  areaName: string;
  amenityTitle: string;
  amenityDescription: string;
  pubCount: number;
  href: string;
  icon: string;
}

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

export default function SelectHomepageSlotsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentSlots, setCurrentSlots] = useState<HomepageSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [candidatesResponse, slotsResponse] = await Promise.all([
        fetch('/api/admin/homepage-slots/candidates'),
        fetch('/api/admin/homepage-slots')
      ]);

      if (candidatesResponse.ok) {
        const candidatesData = await candidatesResponse.json();
        setCandidates(candidatesData.candidates || []);
      }

      if (slotsResponse.ok) {
        const slotsData = await slotsResponse.json();
        setCurrentSlots(slotsData.slots || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (candidate: Candidate) => {
    setSelectedSlots(prev => {
      const isSelected = prev.some(slot => 
        slot.areaSlug === candidate.areaSlug && slot.amenitySlug === candidate.amenitySlug
      );
      
      if (isSelected) {
        return prev.filter(slot => 
          !(slot.areaSlug === candidate.areaSlug && slot.amenitySlug === candidate.amenitySlug)
        );
      } else {
        return [...prev, candidate];
      }
    });
  };

  const saveSlots = async () => {
    if (selectedSlots.length === 0) {
      alert('Please select at least one slot');
      return;
    }

    if (selectedSlots.length > 6) {
      alert('Please select no more than 6 slots');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/homepage-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'set_slots',
          slots: selectedSlots.map((slot, index) => ({
            areaSlug: slot.areaSlug,
            amenitySlug: slot.amenitySlug,
            title: `${slot.amenityTitle} in ${slot.areaName}`,
            subtitle: slot.amenityDescription,
            href: slot.href,
            icon: slot.icon,
            pubCount: slot.pubCount,
            score: 0.9 - (index * 0.1), // Simple scoring based on position
            isSeasonal: false,
            position: index + 1
          }))
        }),
      });

      if (response.ok) {
        alert('Homepage slots updated successfully!');
        await loadData(); // Reload current slots
      } else {
        const result = await response.json();
        alert(`Failed to update homepage slots: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving slots:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving homepage slots: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const isSelected = (candidate: Candidate) => {
    return selectedSlots.some(slot => 
      slot.areaSlug === candidate.areaSlug && slot.amenitySlug === candidate.amenitySlug
    );
  };

  const isCurrentlyActive = (candidate: Candidate) => {
    return currentSlots.some(slot => 
      slot.areaSlug === candidate.areaSlug && slot.amenitySlug === candidate.amenitySlug && slot.isActive
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(12)].map((_, i) => (
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
              <h1 className="text-3xl font-bold text-gray-900">Select Homepage Trending Slots</h1>
              <p className="text-gray-600 mt-2">
                Choose which area × amenity combinations to feature on the homepage (max 6)
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-sm text-gray-600">
                {selectedSlots.length} of 6 selected
              </div>
              <Button
                onClick={saveSlots}
                disabled={saving || selectedSlots.length === 0}
                className="bg-[#08d78c] hover:bg-[#06b875] text-black"
              >
                {saving ? 'Saving...' : 'Save Selection'}
              </Button>
            </div>
          </div>
        </div>

        {/* Current Active Slots */}
        {currentSlots.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Currently Active</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSlots.filter(slot => slot.isActive).map((slot) => (
                <Card key={slot.id} className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{slot.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{slot.title}</h3>
                      <p className="text-sm text-gray-600">{slot.pubCount} pubs</p>
                    </div>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      #{slot.position}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Candidates */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Available Combinations ({candidates.length} total)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate) => {
              const selected = isSelected(candidate);
              const currentlyActive = isCurrentlyActive(candidate);
              
              return (
                <Card 
                  key={`${candidate.areaSlug}-${candidate.amenitySlug}`}
                  className={`p-4 cursor-pointer transition-all ${
                    selected 
                      ? 'bg-[#08d78c] text-black border-[#08d78c]' 
                      : currentlyActive
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSlot(candidate)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{candidate.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {candidate.amenityTitle} in {candidate.areaName}
                      </h3>
                      <p className="text-sm opacity-75">{candidate.pubCount} pubs</p>
                      {currentlyActive && (
                        <p className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-1 inline-block">
                          Currently Active
                        </p>
                      )}
                    </div>
                    <div className="text-2xl">
                      {selected ? '✓' : '○'}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {candidates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No candidates found
            </h3>
            <p className="text-gray-600">
              No area × amenity combinations found with enough pubs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
