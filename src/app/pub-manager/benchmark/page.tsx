'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface BenchmarkData {
  pub: {
    views: number;
    rating: number;
    reviewCount: number;
    amenityCount: number;
    photoCount: number;
  };
  allPubs: {
    total: number;
    avgViews: number;
    medianViews: number;
    rank: number;
    percentile: number;
    avgRating: number;
    avgReviews: number;
    avgAmenities: number;
    avgPhotos: number;
  };
  nearbyPubs: {
    total: number;
    radius: number;
    avgViews: number;
    rank: number;
    percentile: number;
    avgRating: number;
    avgReviews: number;
    avgAmenities: number;
    avgPhotos: number;
    pubs: Array<{
      id: string;
      name: string;
      views: number;
      rating: number;
      distance: number | null;
    }>;
  };
}

export default function BenchmarkPage() {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [radius, setRadius] = useState('5');
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadBenchmark();
  }, [period, radius, selectedPubId]);

  const loadBenchmark = async () => {
    const token = localStorage.getItem('pub-manager-token');
    const pubId = selectedPubId || localStorage.getItem('pub-manager-pub-id');
    
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/pub-manager/benchmark?pubId=${pubId}&period=${period}&radius=${radius}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setBenchmark(data.benchmark);
      }
    } catch (error) {
      console.error('Failed to load benchmark:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading benchmark data...</p>
        </div>
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No benchmark data available</p>
      </div>
    );
  }

  // Prepare radar chart data
  const radarData = [
    { metric: 'Views', yourPub: Math.min(benchmark.pub.views / Math.max(benchmark.allPubs.avgViews, 1) * 100, 200), average: 100 },
    { metric: 'Rating', yourPub: (benchmark.pub.rating / Math.max(benchmark.allPubs.avgRating, 1)) * 100, average: 100 },
    { metric: 'Reviews', yourPub: Math.min(benchmark.pub.reviewCount / Math.max(benchmark.allPubs.avgReviews, 1) * 100, 200), average: 100 },
    { metric: 'Amenities', yourPub: Math.min(benchmark.pub.amenityCount / Math.max(benchmark.allPubs.avgAmenities, 1) * 100, 200), average: 100 },
    { metric: 'Photos', yourPub: Math.min(benchmark.pub.photoCount / Math.max(benchmark.allPubs.avgPhotos, 1) * 100, 200), average: 100 },
  ];

  // Comparison bar chart data
  const comparisonData = [
    {
      metric: 'Views',
      yourPub: benchmark.pub.views,
      average: Math.round(benchmark.allPubs.avgViews),
      nearby: Math.round(benchmark.nearbyPubs.avgViews)
    },
    {
      metric: 'Rating',
      yourPub: benchmark.pub.rating,
      average: benchmark.allPubs.avgRating,
      nearby: benchmark.nearbyPubs.avgRating
    },
    {
      metric: 'Reviews',
      yourPub: benchmark.pub.reviewCount,
      average: Math.round(benchmark.allPubs.avgReviews),
      nearby: Math.round(benchmark.nearbyPubs.avgReviews)
    },
    {
      metric: 'Amenities',
      yourPub: benchmark.pub.amenityCount,
      average: Math.round(benchmark.allPubs.avgAmenities),
      nearby: Math.round(benchmark.nearbyPubs.avgAmenities)
    },
    {
      metric: 'Photos',
      yourPub: benchmark.pub.photoCount,
      average: Math.round(benchmark.allPubs.avgPhotos),
      nearby: Math.round(benchmark.nearbyPubs.avgPhotos)
    }
  ];

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'text-green-600';
    if (percentile >= 75) return 'text-blue-600';
    if (percentile >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Benchmarking</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="1">1 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ranking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Ranking (All Pubs)</h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              #{benchmark.allPubs.rank} of {benchmark.allPubs.total}
            </p>
            <p className={`text-lg font-semibold ${getPercentileColor(benchmark.allPubs.percentile)}`}>
              Top {Math.round(100 - benchmark.allPubs.percentile)}%
            </p>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#08d78c] h-2 rounded-full"
                  style={{ width: `${benchmark.allPubs.percentile}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Ranking (Nearby Pubs)</h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              #{benchmark.nearbyPubs.rank} of {benchmark.nearbyPubs.total}
            </p>
            <p className={`text-lg font-semibold ${getPercentileColor(benchmark.nearbyPubs.percentile)}`}>
              Top {Math.round(100 - benchmark.nearbyPubs.percentile)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Within {benchmark.nearbyPubs.radius} km</p>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#08d78c] h-2 rounded-full"
                  style={{ width: `${benchmark.nearbyPubs.percentile}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparison</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="yourPub" fill="#08d78c" name="Your Pub" />
              <Bar dataKey="average" fill="#667eea" name="All Pubs Avg" />
              <Bar dataKey="nearby" fill="#764ba2" name="Nearby Avg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Multi-Metric Comparison</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 200]} />
              <Radar name="Your Pub" dataKey="yourPub" stroke="#08d78c" fill="#08d78c" fillOpacity={0.6} />
              <Radar name="Average" dataKey="average" stroke="#667eea" fill="#667eea" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Nearby Pubs List */}
        {benchmark.nearbyPubs.pubs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nearby Pubs</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pub</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {benchmark.nearbyPubs.pubs.map((nearbyPub) => (
                    <tr key={nearbyPub.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{nearbyPub.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {nearbyPub.distance ? `${nearbyPub.distance.toFixed(1)} km` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{nearbyPub.views}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{nearbyPub.rating.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

