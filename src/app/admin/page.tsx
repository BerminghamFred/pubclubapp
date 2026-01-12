'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Eye, Search, Filter, Building, Settings, BarChart3, Layout, MapPin, Mail } from 'lucide-react';

interface AnalyticsOverview {
  totalViews: number;
  totalSearches: number;
  uniquePubsViewed: number;
  activeManagers: number;
  filtersTop: Array<{ key: string; uses: number }>;
  viewsByDay: Array<{ date: string; views: number }>;
  searchesByDay: Array<{ date: string; searches: number }>;
  highPotentialPubs: Array<{
    id: string;
    name: string;
    city: { name: string } | null;
    borough: { name: string } | null;
    monthlyViews: number;
  }>;
  spinTheWheel?: {
    totalSpins: number;
    totalViewPubClicks: number;
    conversionRate: number;
  };
  homepageTiles?: {
    impressions: number;
    clicks: number;
    clickThroughRate: number;
    topTiles: Array<{
      slotId: string;
      title: string;
      clicks: number;
    }>;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [amenitiesStatus, setAmenitiesStatus] = useState<string>('');
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [replaceAllStatus, setReplaceAllStatus] = useState<string>('');
  const [replaceAllLoading, setReplaceAllLoading] = useState(false);
  const [replaceAllFileContent, setReplaceAllFileContent] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics/overview');
      if (response.ok) {
        const data = await response.json();
        console.log('[Admin Dashboard] Analytics data received:', {
          totalViews: data.totalViews,
          totalSearches: data.totalSearches,
          spinTheWheel: data.spinTheWheel
        });
        setAnalytics(data);
      } else {
        console.error('[Admin Dashboard] Failed to fetch analytics:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[Admin Dashboard] Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadLoading(true);
    setUploadStatus('');

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      setUploadStatus('Please select a file to upload.');
      setUploadLoading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/upload-pubs', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus(`✅ ${result.message}`);
        fetchAnalytics(); // Refresh analytics
      } else {
        setUploadStatus(`❌ ${result.message}`);
      }
    } catch (error) {
      setUploadStatus('❌ An error occurred while uploading the file.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAmenitiesSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAmenitiesLoading(true);
    setAmenitiesStatus('');

    const formData = new FormData(event.currentTarget);
    const file = formData.get('amenitiesFile') as File;

    if (!file) {
      setAmenitiesStatus('Please select a file to upload.');
      setAmenitiesLoading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/upload-amenities', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setAmenitiesStatus(`✅ ${result.message} - Added ${result.newAmenitiesAdded} new amenities across ${result.updatedPubs} pubs.`);
        fetchAnalytics(); // Refresh analytics
      } else {
        setAmenitiesStatus(`❌ ${result.message}`);
      }
    } catch (error) {
      setAmenitiesStatus('❌ An error occurred while uploading the file.');
    } finally {
      setAmenitiesLoading(false);
    }
  };

  const handleReplaceAllSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReplaceAllLoading(true);
    setReplaceAllStatus('');

    const formData = new FormData(event.currentTarget);
    const file = formData.get('replaceAllFile') as File;

    if (!file) {
      setReplaceAllStatus('Please select a file to upload.');
      setReplaceAllLoading(false);
      return;
    }

    // Confirm before proceeding
    const confirmed = window.confirm(
      '⚠️ WARNING: This will completely replace ALL pub data. Any pubs not in the uploaded CSV will be permanently removed. Are you sure you want to continue?'
    );

    if (!confirmed) {
      setReplaceAllLoading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/replace-all-pubs', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setReplaceAllStatus(`✅ ${result.message}`);
        setReplaceAllFileContent(null);
        fetchAnalytics(); // Refresh analytics
      } else if (result.error === 'SERVERLESS_FILESYSTEM' && result.fileContent) {
        // Serverless environment - show file content for manual update
        setReplaceAllFileContent(result.fileContent);
        setReplaceAllStatus(`⚠️ ${result.message}\n\n${result.instructions}`);
      } else {
        setReplaceAllStatus(`❌ ${result.message || 'Failed to replace pub data'}`);
        setReplaceAllFileContent(null);
      }
    } catch (error) {
      setReplaceAllStatus('❌ An error occurred while uploading the file.');
    } finally {
      setReplaceAllLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage your pub platform</p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => {
                console.log('Navigating to /admin/pubs');
                router.push('/admin/pubs');
              }}
            >
              <Building className="w-4 h-4 mr-2" />
              Pubs
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/managers')}
            >
              <Users className="w-4 h-4 mr-2" />
              Managers
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/homepage-slots')}
            >
              <Layout className="w-4 h-4 mr-2" />
              Homepage Slots
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/area-featured-pubs')}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Area Featured Pubs
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/pub-requests')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Pub Requests
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/blog-subscriptions')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Blog Subscriptions
            </Button>
          </nav>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((analytics?.totalViews || 0) * 0.5).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((analytics?.totalSearches || 0) * 0.5).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Pubs Viewed</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.uniquePubsViewed || 0}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeManagers || 0}</div>
              <p className="text-xs text-muted-foreground">Last 90 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Homepage Tiles Metrics */}
        {analytics?.homepageTiles && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Trending Tiles - Impressions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics.homepageTiles.impressions || 0).toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Total tile views</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Trending Tiles - Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics.homepageTiles.clicks || 0).toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Total tile clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics.homepageTiles.clickThroughRate || 0).toFixed(2)}%</div>
                <p className="text-xs text-gray-500 mt-1">Clicks / Impressions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Performing Tile</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.homepageTiles.topTiles.length > 0 ? (
                  <>
                    <div className="text-lg font-bold truncate">{analytics.homepageTiles.topTiles[0].title}</div>
                    <p className="text-xs text-gray-500 mt-1">{analytics.homepageTiles.topTiles[0].clicks} clicks</p>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">No data</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spin the Wheel Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spin the Wheel</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(analytics?.spinTheWheel?.totalSpins || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total spins (last 30 days)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">View Pub Clicks</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(analytics?.spinTheWheel?.totalViewPubClicks || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">After spinning (last 30 days)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((analytics?.spinTheWheel?.conversionRate || 0).toFixed(1))}%</div>
              <p className="text-xs text-muted-foreground">Spin → View Pub (last 30 days)</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Views by Day */}
          <Card>
            <CardHeader>
              <CardTitle>Views by Day</CardTitle>
              <CardDescription>Daily page views over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(analytics?.viewsByDay || []).map(day => ({ ...day, views: Math.round(day.views * 0.5) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#08d78c" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Searches by Day */}
          <Card>
            <CardHeader>
              <CardTitle>Searches by Day</CardTitle>
              <CardDescription>Daily searches over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(analytics?.searchesByDay || []).map(day => ({ ...day, searches: Math.round(day.searches * 0.5) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="searches" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
                  </div>

        {/* Top Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top Filters</CardTitle>
              <CardDescription>Most used filter options</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics?.filtersTop || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="uses" fill="#08d78c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* High Potential Pubs */}
          <Card>
            <CardHeader>
              <CardTitle>High Potential Pubs</CardTitle>
              <CardDescription>Pubs with 500+ monthly views</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.highPotentialPubs.slice(0, 5).map((pub) => (
                  <div key={pub.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{pub.name}</h4>
                      <p className="text-sm text-gray-600">
                        {pub.city?.name}{pub.borough?.name && `, ${pub.borough.name}`}
                    </p>
                  </div>
                    <div className="text-right">
                      <div className="font-bold text-[#08d78c]">{pub.monthlyViews}</div>
                      <div className="text-xs text-gray-500">views</div>
              </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>

        {/* Data Upload Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pub Data Upload */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Upload Pub Data</CardTitle>
              <CardDescription>Import pub data from CSV files</CardDescription>
            </CardHeader>
            <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                id="file"
                name="file"
                accept=".csv"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
            </div>
            
                <Button
              type="submit"
              disabled={uploadLoading}
                  className="w-full"
            >
              {uploadLoading ? 'Uploading...' : 'Upload Pub Data'}
                </Button>
          </form>

          {uploadStatus && (
            <div className={`mt-4 p-3 rounded-lg ${
              uploadStatus.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {uploadStatus}
            </div>
          )}
            </CardContent>
          </Card>

          {/* Amenities Upload */}
          <Card>
            <CardHeader>
              <CardTitle>🍽️ Upload Pub Amenities</CardTitle>
              <CardDescription>Import amenity data from CSV files</CardDescription>
            </CardHeader>
            <CardContent>
          <form onSubmit={handleAmenitiesSubmit} className="space-y-4">
            <div>
              <label htmlFor="amenitiesFile" className="block text-sm font-medium text-gray-700 mb-2">
                Select Amenities CSV File
              </label>
              <input
                type="file"
                id="amenitiesFile"
                name="amenitiesFile"
                accept=".csv"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
            </div>
            
                <Button
              type="submit"
              disabled={amenitiesLoading}
                  className="w-full"
            >
              {amenitiesLoading ? 'Uploading...' : 'Upload Amenities Data'}
                </Button>
          </form>

          {amenitiesStatus && (
            <div className={`mt-4 p-3 rounded-lg ${
              amenitiesStatus.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {amenitiesStatus}
            </div>
          )}
            </CardContent>
          </Card>
        </div>

        {/* Replace All Pub Data Section */}
        <div className="mb-8">
          <Card className="border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-700">⚠️ Replace All Pub Data</CardTitle>
              <CardDescription>
                Completely replace all pub data. Any pubs not in the uploaded CSV will be permanently removed.
                Use this when refreshing pub selection with new scrapes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReplaceAllSubmit} className="space-y-4">
                <div>
                  <label htmlFor="replaceAllFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File (Complete Pub List)
                  </label>
                  <input
                    type="file"
                    id="replaceAllFile"
                    name="replaceAllFile"
                    accept=".csv"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <strong>⚠️ Warning:</strong> This operation will permanently delete all pubs that are not included in the uploaded CSV file.
                </div>
                
                <Button
                  type="submit"
                  disabled={replaceAllLoading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {replaceAllLoading ? 'Replacing All Pubs...' : 'Replace All Pub Data'}
                </Button>
              </form>

              {replaceAllStatus && (
                <div className={`mt-4 p-3 rounded-lg ${
                  replaceAllStatus.startsWith('✅') ? 'bg-green-50 text-green-800' : 
                  replaceAllStatus.startsWith('⚠️') ? 'bg-orange-50 text-orange-800' : 
                  'bg-red-50 text-red-800'
                }`}>
                  <div className="whitespace-pre-line">{replaceAllStatus}</div>
                </div>
              )}

              {replaceAllFileContent && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generated pubData.ts file content:
                    </label>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">Copy this content to src/data/pubData.ts</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(replaceAllFileContent);
                          alert('File content copied to clipboard!');
                        }}
                      >
                        Copy to Clipboard
                      </Button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={replaceAllFileContent}
                    className="w-full h-64 p-3 font-mono text-xs bg-white border border-gray-300 rounded-lg resize-none"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 