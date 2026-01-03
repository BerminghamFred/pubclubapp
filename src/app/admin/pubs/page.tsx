'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Filter, Download, Edit, Eye, MoreHorizontal, Plus, ChevronsUpDown, BarChart3, Building, Users, TrendingUp } from 'lucide-react';

interface Pub {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: { name: string };
  borough?: { name: string };
  managerStatus: 'active' | 'dormant' | 'never_logged_in';
  lastLoginAt?: string;
  views: number;
  amenities: Array<{ amenity: { label: string } }>;
  photoUrl?: string;
  createdAt: string;
}

export default function AdminPubsPage() {
  const router = useRouter();
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBorough, setSelectedBorough] = useState('');
  const [managerStatusFilter, setManagerStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPubs, setTotalPubs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
  const [boroughs, setBoroughs] = useState<Array<{ id: number; name: string; cityId: number; cityName?: string }>>([]);
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPub, setEditingPub] = useState<Pub | null>(null);
  const [deletingPubId, setDeletingPubId] = useState<string | null>(null);

  const limit = 50;

  useEffect(() => {
    fetchCities();
    fetchPubs();
  }, [currentPage, searchQuery, selectedCity, selectedBorough, managerStatusFilter, sortField, sortDirection]);

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      if (response.ok) {
        const citiesData = await response.json();
        setCities(citiesData);
        
        // Extract all boroughs from cities for the borough filter
        const allBoroughs = citiesData.flatMap((city: any) => 
          city.boroughs.map((borough: any) => ({
            ...borough,
            cityName: city.name
          }))
        );
        setBoroughs(allBoroughs);
      }
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    }
  };

  const fetchPubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedCity) params.append('cityId', selectedCity);
      if (selectedBorough) params.append('boroughId', selectedBorough);
      if (managerStatusFilter) params.append('managerStatus', managerStatusFilter);

      const response = await fetch(`/api/admin/pubs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPubs(data.pubs);
        setTotalPubs(data.totalCount);
        setHasMore(data.hasMore);
      } else {
        console.error('Failed to fetch pubs:', response.statusText);
        setPubs([]);
        setTotalPubs(0);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch pubs:', error);
      setPubs([]);
      setTotalPubs(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPubs();
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'City', 'Borough', 'Manager Status', 'Last Login', 'Views (30d)', 'Amenities'].join(','),
      ...pubs.map(pub => [
        `"${pub.name}"`,
        `"${pub.city?.name || ''}"`,
        `"${pub.borough?.name || ''}"`,
        `"${pub.managerStatus}"`,
        `"${pub.lastLoginAt || 'Never'}"`,
        pub.views,
        `"${pub.amenities.map(a => a.amenity.label).join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pubs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      dormant: 'bg-yellow-100 text-yellow-800',
      never_logged_in: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleSort = (field: 'name' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddPub = () => {
    setShowAddModal(true);
  };

  const handleEditPub = async (pubId: string) => {
    try {
      const response = await fetch(`/api/admin/pubs/${pubId}`);
      if (response.ok) {
        const data = await response.json();
        setEditingPub(data);
        setShowEditModal(true);
      } else {
        alert('Failed to load pub details');
      }
    } catch (error) {
      console.error('Error loading pub:', error);
      alert('Error loading pub details');
    }
  };

  const handleDeletePub = async (pubId: string, pubName: string) => {
    if (!confirm(`Are you sure you want to delete "${pubName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingPubId(pubId);
    try {
      const response = await fetch(`/api/admin/pubs/${pubId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        fetchPubs();
        alert('Pub deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete pub');
      }
    } catch (error) {
      console.error('Error deleting pub:', error);
      alert('Error deleting pub');
    } finally {
      setDeletingPubId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pubs Management</h1>
              <p className="text-gray-600 mt-2">Manage and monitor all pubs in the system</p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleAddPub} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Pub
              </Button>
              <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 text-white">
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
              className="text-gray-600 hover:text-gray-900 bg-gray-100"
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
              className="text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/admin/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pubs by name..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedBorough(''); // Reset borough when city changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedBorough}
                onChange={(e) => setSelectedBorough(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                disabled={!selectedCity}
              >
                <option value="">All Boroughs</option>
                {selectedCity ? 
                  boroughs
                    .filter(borough => borough.cityId === parseInt(selectedCity))
                    .map(borough => (
                      <option key={borough.id} value={borough.id}>{borough.name}</option>
                    )) :
                  boroughs.map(borough => (
                    <option key={borough.id} value={borough.id}>{borough.name}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <select
                value={managerStatusFilter}
                onChange={(e) => setManagerStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              >
                <option value="">All Manager Status</option>
                <option value="active">Active Managers</option>
                <option value="dormant">Dormant Managers</option>
                <option value="never_logged_in">No Manager</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pubs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#08d78c] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading pubs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 text-sm font-semibold text-gray-900 hover:text-gray-700"
                      >
                        <span>Name</span>
                              <ChevronsUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center justify-center space-x-1 text-sm font-semibold text-gray-900 hover:text-gray-700 mx-auto"
                      >
                        <span>Registered</span>
                              <ChevronsUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900">Location</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900">Manager</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900">Views</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pubs.map((pub, index) => (
                    <tr key={pub.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ height: '60px' }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {pub.photoUrl ? (
                              <img 
                                src={pub.photoUrl} 
                                alt={pub.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {pub.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{pub.name}</div>
                            <div className="text-xs text-gray-500">{pub.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-900">
                          {new Date(pub.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: '2-digit', 
                            year: 'numeric' 
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-900">
                          {pub.borough?.name || pub.city?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(pub.managerStatus)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-900">{pub.views.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleEditPub(pub.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeletePub(pub.id, pub.name)}
                            disabled={deletingPubId === pub.id}
                            className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-3 py-1"
                          >
                            {deletingPubId === pub.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary and Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {pubs.length} of {totalPubs} pubs
          </div>
          {!loading && pubs.length > 0 && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(totalPubs / limit)}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Pub Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Pub</DialogTitle>
            <DialogDescription>
              Add a new pub to the system. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 text-sm">
              This feature is coming soon. For now, please use the CSV upload feature on the main admin dashboard to add pubs.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pub Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[700px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pub: {editingPub?.name}</DialogTitle>
            <DialogDescription>
              Update pub information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          {editingPub && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    defaultValue={editingPub.name}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    defaultValue={editingPub.address || ''}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    defaultValue={editingPub.city?.name || ''}
                    className="w-full"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-borough">Borough</Label>
                  <Input
                    id="edit-borough"
                    defaultValue={editingPub.borough?.name || ''}
                    className="w-full"
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager Status</Label>
                <div className="flex items-center gap-2">
                  {getStatusBadge(editingPub.managerStatus)}
                  {editingPub.lastLoginAt && (
                    <span className="text-xs text-gray-500">
                      Last login: {new Date(editingPub.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Views (Last 30 days)</Label>
                <div className="text-lg font-semibold">{editingPub.views.toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {editingPub.amenities.map((a, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {a.amenity.label}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 text-sm pt-4 border-t">
                Full editing functionality is coming soon. For now, you can view the pub details above.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              setEditingPub(null);
            }}>
              Close
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled
            >
              Save Changes (Coming Soon)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
