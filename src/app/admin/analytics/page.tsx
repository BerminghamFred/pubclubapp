'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, TrendingUp, Users, Eye, Search, BarChart3, Building } from 'lucide-react';

interface AnalyticsData {
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
}

interface SpinWheelAnalytics {
  overview: {
    totalSpins: number;
    totalSpinOpens: number;
    totalViewPubClicks: number;
    totalDirectionsClicks: number;
    totalSpinAgains: number;
    spinToViewPubRate: number;
    spinToDirectionsRate: number;
    spinAgainRate: number;
  };
  spinsByDay: Array<{ date: string; count: number }>;
  topPubsBySpins: Array<{
    pubName: string;
    pubId: string;
    pubRating: number;
    spinCount: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

const COLORS = ['#08d78c', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [spinWheelAnalytics, setSpinWheelAnalytics] = useState<SpinWheelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinWheelLoading, setSpinWheelLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [selectedCities, setSelectedCities] = useState<number[]>([]);
  const [selectedBoroughs, setSelectedBoroughs] = useState<number[]>([]);

  useEffect(() => {
    fetchAnalytics();
    fetchSpinWheelAnalytics();
  }, [dateRange, selectedCities, selectedBoroughs]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Set date range
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - parseInt(dateRange));
      
      params.append('from', from.toISOString());
      params.append('to', to.toISOString());
      
      if (selectedCities.length > 0) {
        params.append('cityId', selectedCities.join(','));
      }
      if (selectedBoroughs.length > 0) {
        params.append('boroughId', selectedBoroughs.join(','));
      }

      const response = await fetch(`/api/admin/analytics/overview?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpinWheelAnalytics = async () => {
    setSpinWheelLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/spin-wheel?days=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Admin Analytics] Spin wheel data received:', {
          totalSpins: data.overview?.totalSpins,
          totalViewPubClicks: data.overview?.totalViewPubClicks,
          spinToViewPubRate: data.overview?.spinToViewPubRate,
          spinsByDayCount: data.spinsByDay?.length,
          topPubsCount: data.topPubsBySpins?.length
        });
        setSpinWheelAnalytics(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Admin Analytics] Failed to fetch spin wheel analytics:', response.status, errorData);
      }
    } catch (error) {
      console.error('[Admin Analytics] Failed to fetch spin wheel analytics:', error);
    } finally {
      setSpinWheelLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const csvContent = [
      ['Metric', 'Value'].join(','),
      ['Total Views', analytics.totalViews].join(','),
      ['Total Searches', analytics.totalSearches].join(','),
      ['Unique Pubs Viewed', analytics.uniquePubsViewed].join(','),
      ['Active Managers', analytics.activeManagers].join(','),
      ['', ''].join(','),
      ['Filter', 'Usage Count'].join(','),
      ...analytics.filtersTop.map(filter => [filter.key, filter.uses].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportHighPotentialPubs = () => {
    if (!analytics) return;

    const csvContent = [
      ['Pub Name', 'City', 'Borough', 'Monthly Views'].join(','),
      ...analytics.highPotentialPubs.map(pub => [
        `"${pub.name}"`,
        `"${pub.city?.name || ''}"`,
        `"${pub.borough?.name || ''}"`,
        pub.monthlyViews
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `high-potential-pubs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">Deep dive into platform performance</p>
            </div>
            <div className="flex space-x-4">
              <Button onClick={exportAnalytics} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Analytics
              </Button>
              <Button onClick={exportHighPotentialPubs} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export High Potential Pubs
              </Button>
            </div>
          </div>
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
              onClick={() => router.push('/admin/pubs')}
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
              className="text-gray-600 hover:text-gray-900 bg-gray-100"
              onClick={() => router.push('/admin/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </nav>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 180 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cities (Multiple Selection)
                </label>
                <select
                  multiple
                  value={selectedCities.map(String)}
                  onChange={(e) => setSelectedCities(Array.from(e.target.selectedOptions, option => parseInt(option.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  <option value="1">London</option>
                  <option value="2">Manchester</option>
                  <option value="3">Birmingham</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Boroughs (Multiple Selection)
                </label>
                <select
                  multiple
                  value={selectedBoroughs.map(String)}
                  onChange={(e) => setSelectedBoroughs(Array.from(e.target.selectedOptions, option => parseInt(option.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  <option value="1">Camden</option>
                  <option value="2">Westminster</option>
                  <option value="3">Islington</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalViews.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalSearches.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Pubs Viewed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.uniquePubsViewed || 0}</div>
              <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeManagers || 0}</div>
              <p className="text-xs text-muted-foreground">Last 90 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Views by Day */}
          <Card>
            <CardHeader>
              <CardTitle>Views by Day</CardTitle>
              <CardDescription>Daily page views over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.viewsByDay || []}>
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
              <CardDescription>Daily searches over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.searchesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="searches" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Filter Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Usage Breakdown</CardTitle>
              <CardDescription>Most popular filter options</CardDescription>
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

          {/* Filter Usage Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Distribution</CardTitle>
              <CardDescription>Percentage breakdown of filter usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.filtersTop.slice(0, 8) || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.key} (${(props.percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="uses"
                  >
                    {(analytics?.filtersTop.slice(0, 8) || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* High Potential Pubs */}
        <Card>
          <CardHeader>
            <CardTitle>High Potential Pubs (500+ Monthly Views)</CardTitle>
            <CardDescription>Pubs with high engagement for monetization opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pub Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Potential
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics?.highPotentialPubs.map((pub) => (
                    <tr key={pub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{pub.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {pub.city?.name}{pub.borough?.name && `, ${pub.borough.name}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-bold">{pub.monthlyViews.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#08d78c] h-2 rounded-full" 
                              style={{ width: `${Math.min((pub.monthlyViews / 2000) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">
                            {pub.monthlyViews >= 1000 ? 'High' : pub.monthlyViews >= 750 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Spin the Wheel Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎡 Spin the Wheel Analytics
            </CardTitle>
            <CardDescription>
              Track user engagement with the random pub picker feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            {spinWheelLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c]"></div>
                <span className="ml-2 text-gray-600">Loading spin wheel analytics...</span>
              </div>
            ) : spinWheelAnalytics ? (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-[#08d78c] to-[#06b875] text-white p-4 rounded-lg">
                    <div className="text-2xl font-bold">{spinWheelAnalytics.overview.totalSpins}</div>
                    <div className="text-sm opacity-90">Total Spins</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                    <div className="text-2xl font-bold">{spinWheelAnalytics.overview.totalViewPubClicks}</div>
                    <div className="text-sm opacity-90">View Pub Clicks</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                    <div className="text-2xl font-bold">{spinWheelAnalytics.overview.totalDirectionsClicks}</div>
                    <div className="text-sm opacity-90">Directions Clicks</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                    <div className="text-2xl font-bold">{spinWheelAnalytics.overview.totalSpinAgains}</div>
                    <div className="text-sm opacity-90">Spin Agains</div>
                  </div>
                </div>

                {/* Conversion Rates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">
                      {spinWheelAnalytics.overview.spinToViewPubRate}%
                    </div>
                    <div className="text-sm text-gray-600">Spin → View Pub Rate</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">
                      {spinWheelAnalytics.overview.spinToDirectionsRate}%
                    </div>
                    <div className="text-sm text-gray-600">Spin → Directions Rate</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">
                      {spinWheelAnalytics.overview.spinAgainRate}%
                    </div>
                    <div className="text-sm text-gray-600">Spin Again Rate</div>
                  </div>
                </div>

                {/* Spins by Day Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Spins by Day</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={spinWheelAnalytics.spinsByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#08d78c" 
                        strokeWidth={2}
                        dot={{ fill: '#08d78c', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Pubs by Spins */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Most Spun Pubs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Pub Name</th>
                          <th className="text-left py-2">Rating</th>
                          <th className="text-left py-2">Spins</th>
                          <th className="text-left py-2">Popularity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spinWheelAnalytics.topPubsBySpins.map((pub, index) => (
                          <tr key={pub.pubId} className="border-b hover:bg-gray-50">
                            <td className="py-2 font-medium">{pub.pubName}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                <span>{pub.pubRating}</span>
                              </div>
                            </td>
                            <td className="py-2">{pub.spinCount}</td>
                            <td className="py-2">
                              <div className="flex items-center">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-[#08d78c] h-2 rounded-full" 
                                    style={{ 
                                      width: `${Math.min((pub.spinCount / Math.max(...spinWheelAnalytics.topPubsBySpins.map(p => p.spinCount))) * 100, 100)}%` 
                                    }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-xs text-gray-500">
                                  {index < 3 ? 'High' : index < 6 ? 'Medium' : 'Low'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No spin wheel analytics data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
