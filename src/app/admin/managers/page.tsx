'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Download, Mail, UserPlus, MoreHorizontal, Clock, CheckCircle, XCircle, BarChart3, Building, Users, TrendingUp } from 'lucide-react';

interface Manager {
  id: string;
  email: string;
  name?: string;
  pubs: Array<{
    pub: {
      id: string;
      name: string;
      slug: string;
    };
    role: string;
  }>;
  lastLogin?: {
    loggedInAt: string;
    pub: {
      id: string;
      name: string;
    };
  };
  loginCount: number;
  createdAt: string;
}

export default function AdminManagersPage() {
  const router = useRouter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchManagers();
  }, [searchQuery]);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/managers');
      if (!res.ok) throw new Error('Failed to fetch managers');
      const data: Manager[] = await res.json();

      // Filter by search query (client-side)
      const filtered = data.filter(
        (manager) =>
          manager.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (manager.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          manager.pubs.some((p) => p.pub.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      setManagers(filtered);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Name', 'Pubs Managed', 'Role', 'Last Login', 'Login Count', 'Created Date'].join(','),
      ...managers.map(manager => [
        `"${manager.email}"`,
        `"${manager.name || ''}"`,
        `"${manager.pubs.map(p => p.pub.name).join('; ')}"`,
        `"${manager.pubs.map(p => p.role).join('; ')}"`,
        `"${manager.lastLogin ? new Date(manager.lastLogin.loggedInAt).toLocaleString() : 'Never'}"`,
        manager.loginCount,
        `"${new Date(manager.createdAt).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `managers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getManagerStatus = (manager: Manager) => {
    if (!manager.lastLogin) {
      return { status: 'never_logged_in', color: 'bg-gray-100 text-gray-800', icon: XCircle };
    }

    const daysSinceLogin = Math.floor((Date.now() - new Date(manager.lastLogin.loggedInAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLogin <= 30) {
      return { status: 'active', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else if (daysSinceLogin <= 90) {
      return { status: 'dormant', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else {
      return { status: 'inactive', color: 'bg-red-100 text-red-800', icon: XCircle };
    }
  };

  const sendInviteEmail = (manager: Manager) => {
    // This would send an invite email
    alert(`Invite email sent to ${manager.email}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Managers</h1>
              <p className="text-gray-600 mt-2">Manage pub managers and their access</p>
            </div>
            <div className="flex space-x-4">
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Manager
              </Button>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
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
              className="text-gray-600 hover:text-gray-900 bg-gray-100"
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
          </nav>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, name, or pub name..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Managers List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading managers...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pubs Managed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {managers.map((manager) => {
                      const statusInfo = getManagerStatus(manager);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <tr key={manager.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{manager.name || 'No name'}</div>
                              <div className="text-sm text-gray-500">{manager.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {manager.pubs.map((pubManager) => (
                                <div key={pubManager.pub.id} className="flex items-center space-x-2">
                                  <div className="text-sm text-gray-900">{pubManager.pub.name}</div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    pubManager.role === 'owner' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {pubManager.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="w-4 h-4" />
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.status.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {manager.lastLogin ? (
                                <div>
                                  <div>{new Date(manager.lastLogin.loggedInAt).toLocaleDateString()}</div>
                                  <div className="text-xs text-gray-500">{manager.lastLogin.pub.name}</div>
                                </div>
                              ) : (
                                'Never'
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{manager.loginCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => sendInviteEmail(manager)}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{managers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {managers.filter(m => getManagerStatus(m).status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Never Logged In</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {managers.filter(m => getManagerStatus(m).status === 'never_logged_in').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dormant Managers</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {managers.filter(m => getManagerStatus(m).status === 'dormant').length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
