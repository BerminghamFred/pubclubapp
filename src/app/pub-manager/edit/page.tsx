'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

// Same category structure as PubDataLoader / filter drawer
const AMENITIES_BY_CATEGORY: Record<string, string[]> = {
  '🎵 Music': ['DJs', 'Jukebox', 'Karaoke', 'Live Music'],
  '🍸 Drinks': ['Cocktails', 'Craft Beer', 'Craft Ales', 'Draught', 'Non-Alcoholic', 'Real Ale', 'Spirits', 'Taproom', 'Wine'],
  '🍔 Food': ['Bar Snacks', 'Bottomless Brunch', 'Bring Your Own Food', 'Burgers', 'Chips', 'English Breakfast', 'Fish and Chips', 'Gluten-Free Options', 'Kids Menu', 'Outdoor Food Service', 'Pie', 'Pizza', 'Sandwiches', 'Steak', 'Street Food Vendor', 'Sunday Roast', 'Thai', 'Vegetarian Options', 'Wings'],
  '🌳 Outdoor Space': ['Beer Garden', 'Heating', 'In the Sun', 'Large Space (20+ People)', 'Outdoor Viewing', 'Outside Bar', 'River View', 'Rooftop', 'Small Space (<20 People)', 'Street Seating', 'Under Cover'],
  '📺 Sport Viewing': ['Amazon Sports', 'Outdoor Viewing', 'Six Nations', 'Sky Sports', 'TNT Sports', 'Terrestrial TV'],
  '♿ Accessibility': ['Car Park', 'Child Friendly', 'Dance Floor', 'Disabled Access', 'Dog Friendly', 'Open Past Midnight', 'Open Past Midnight (Weekends)', 'Table Booking'],
  '💷 Affordability': ['Bargain', 'Premium', 'The Norm'],
  '🎯 Activities': ['Beer Pong', 'Billiards', 'Board Games', 'Darts', 'Game Machines', 'Ping Pong', 'Pool Table', 'Pub Quiz', 'Shuffleboard', 'Slot Machines', 'Table Football'],
  '💺 Comfort': ['Booths', 'Fireplace', 'Sofas', 'Stools at the Bar']
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// 24-hour format, every half hour: 00:00, 00:30, 01:00, ... 23:30
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${m}`);
  }
}

function parseOpeningHours(str: string): Record<string, { open: string; close: string }> {
  const byDay: Record<string, { open: string; close: string }> = {};
  DAYS.forEach(d => { byDay[d] = { open: 'closed', close: 'closed' }; });
  if (!str || !str.trim()) return byDay;
  const dayNames: Record<string, string> = {
    Mon: 'Mon', Monday: 'Mon', Tue: 'Tue', Tuesday: 'Tue', Wed: 'Wed', Wednesday: 'Wed',
    Thu: 'Thu', Thursday: 'Thu', Fri: 'Fri', Friday: 'Fri', Sat: 'Sat', Saturday: 'Sat',
    Sun: 'Sun', Sunday: 'Sun'
  };
  const parts = str.split(';').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const dayLabel = part.slice(0, idx).trim();
    const timeStr = part.slice(idx + 1).trim();
    const short = dayNames[dayLabel] || DAYS.find(d => d.toLowerCase().startsWith(dayLabel.toLowerCase().slice(0, 2)));
    if (!short) continue;
    if (!timeStr || timeStr.toLowerCase() === 'closed') {
      byDay[short] = { open: 'closed', close: 'closed' };
      continue;
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const open = normalizeToSlot(parseInt(match[1], 10), parseInt(match[2], 10));
      const close = normalizeToSlot(parseInt(match[3], 10), parseInt(match[4], 10));
      byDay[short] = { open, close };
    }
  }
  return byDay;
}

function normalizeToSlot(h: number, m: number): string {
  let h24 = h % 24;
  const mNorm = m >= 45 ? 60 : m >= 15 ? 30 : 0;
  if (m >= 45) h24 = (h24 + 1) % 24;
  const slot = `${String(h24).padStart(2, '0')}:${mNorm === 60 ? '00' : mNorm === 30 ? '30' : '00'}`;
  return TIME_SLOTS.includes(slot) ? slot : '00:00';
}

function buildOpeningHours(byDay: Record<string, { open: string; close: string }>): string {
  return DAYS.map(d => {
    const { open, close } = byDay[d] || { open: 'closed', close: 'closed' };
    if (open === 'closed' || close === 'closed') return `${d}: Closed`;
    return `${d}: ${open} – ${close}`;
  }).join('; ');
}

export default function EditPubPage() {
  const [pubData, setPubData] = useState<PubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [openByDay, setOpenByDay] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    DAYS.forEach(d => { init[d] = 'closed'; });
    return init;
  });
  const [closeByDay, setCloseByDay] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    DAYS.forEach(d => { init[d] = 'closed'; });
    return init;
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    loadPubData();
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
        
        // Fetch full pub data from database (API returns { success, pub: { ... } })
        const pubResponse = await fetch(`/api/pubs/${pubId}`);
        const pubResponseData = await pubResponse.json();
        const pubInfo = pubResponseData?.pub ?? pubResponseData;

        if (pubInfo) {
          const hours = pubInfo.openingHours || '';
          const byDay = parseOpeningHours(hours);
          const openMap: Record<string, string> = {};
          const closeMap: Record<string, string> = {};
          DAYS.forEach(d => {
            openMap[d] = byDay[d]?.open ?? 'closed';
            closeMap[d] = byDay[d]?.close ?? 'closed';
          });
          setOpenByDay(openMap);
          setCloseByDay(closeMap);
          const amenitiesList = Array.isArray(pubInfo.amenities)
            ? pubInfo.amenities.map((a: any) => (typeof a === 'string' ? a : (a?.amenity?.label || a?.amenity?.key || a) ?? '').toString().trim()).filter(Boolean)
            : [];
          setPubData({
            id: pubInfo.id,
            name: pubInfo.name ?? '',
            description: pubInfo.description ?? '',
            phone: pubInfo.phone ?? '',
            website: pubInfo.website ?? '',
            openingHours: hours,
            amenities: amenitiesList,
            last_updated: pubInfo.last_updated ?? pubInfo.lastUpdated,
            updated_by: pubInfo.updated_by ?? pubInfo.updatedBy
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

    const hoursByDay: Record<string, { open: string; close: string }> = {};
    DAYS.forEach(d => {
      hoursByDay[d] = { open: openByDay[d] || 'closed', close: closeByDay[d] || 'closed' };
    });
    const builtHours = buildOpeningHours(hoursByDay);

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
          openingHours: builtHours,
          amenities: pubData.amenities
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('pub-manager-toast', 'Details updated');
        }
        router.push('/pub-manager/dashboard');
        return;
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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleAmenity = (amenity: string) => {
    if (!pubData) return;
    const key = String(amenity).trim();
    const isSelected = pubData.amenities.some(a => String(a).trim().toLowerCase() === key.toLowerCase());
    const newAmenities = isSelected
      ? pubData.amenities.filter(a => String(a).trim().toLowerCase() !== key.toLowerCase())
      : [...pubData.amenities, key];
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
                className="inline-flex items-center gap-2 bg-[#08d78c] hover:bg-[#06b875] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors mr-4"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                placeholder="Describe your pub, its atmosphere, specialties, etc."
              />
            </div>
          </div>

          {/* Opening Hours - open/close dropdowns, 24h half-hour slots */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Opening Hours</h2>
            <p className="text-sm text-gray-500 mb-3">24-hour format. Use Open and Close for each day.</p>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day} className="flex flex-wrap items-center gap-2">
                  <span className="w-10 text-sm font-medium text-gray-700">{day}</span>
                  <select
                    value={openByDay[day] || 'closed'}
                    onChange={(e) => setOpenByDay(prev => ({ ...prev, [day]: e.target.value }))}
                    className="min-w-[90px] px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent text-sm"
                  >
                    <option value="closed">Closed</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-sm">–</span>
                  <select
                    value={closeByDay[day] || 'closed'}
                    onChange={(e) => setCloseByDay(prev => ({ ...prev, [day]: e.target.value }))}
                    className="min-w-[90px] px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent text-sm"
                    disabled={openByDay[day] === 'closed' || !openByDay[day]}
                  >
                    <option value="closed">{openByDay[day] === 'closed' ? '–' : 'Closed'}</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities (filter-drawer style) */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters (amenities)</h2>
            <div className="space-y-4">
              {Object.entries(AMENITIES_BY_CATEGORY).map(([category, amenities]) => {
                const isExpanded = expandedCategories.has(category);
                return (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>{category.split(' ')[0]}</span>
                        <span>{category.split(' ').slice(1).join(' ')}</span>
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {amenities.map((amenity) => {
                          const isSelected = pubData.amenities.some(
                            a => String(a).trim().toLowerCase() === String(amenity).trim().toLowerCase()
                          );
                          return (
                            <label
                              key={amenity}
                              className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#08d78c]/20 text-gray-900' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAmenity(amenity)}
                                className="h-4 w-4 text-[#08d78c] focus:ring-[#08d78c] border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Update photos - coming soon */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Update photos</h2>
            <p className="text-gray-500">Coming soon</p>
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
