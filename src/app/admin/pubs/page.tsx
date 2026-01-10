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
  const [editingPubFull, setEditingPubFull] = useState<any>(null); // Full pub data for editing
  const [deletingPubId, setDeletingPubId] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<Array<{ id: number; key: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [pubManagers, setPubManagers] = useState<Array<{ id: string; email: string; name?: string; role: string }>>([]);
  const [showAddManager, setShowAddManager] = useState(false);
  const [newManagerData, setNewManagerData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'owner',
  });
  
  // Form state for Add Pub
  const [addFormData, setAddFormData] = useState({
    name: '',
    address: '',
    description: '',
    phone: '',
    website: '',
    openingHours: '',
    type: 'Traditional',
    cityId: '',
    boroughId: '',
    lat: '',
    lng: '',
    placeId: '',
    selectedAmenities: [] as string[],
    managerEmail: '',
    managerPassword: '',
  });

  // Form state for Edit Pub
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '',
    description: '',
    phone: '',
    website: '',
    openingHours: '',
    type: 'Traditional',
    cityId: '',
    boroughId: '',
    lat: '',
    lng: '',
    selectedAmenities: [] as string[],
  });

  const limit = 50;

  useEffect(() => {
    fetchCities();
    fetchPubs();
    fetchAmenities();
  }, [currentPage, searchQuery, selectedCity, selectedBorough, managerStatusFilter, sortField, sortDirection]);

  const fetchAmenities = async () => {
    try {
      const response = await fetch('/api/admin/amenities');
      if (response.ok) {
        const data = await response.json();
        setAmenities(data);
      }
    } catch (error) {
      console.error('Failed to fetch amenities:', error);
    }
  };

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
        setEditingPubFull(data);
        
        // Populate edit form with current data
        setEditFormData({
          name: data.name || '',
          address: data.address || '',
          description: data.description || '',
          phone: data.phone || '',
          website: data.website || '',
          openingHours: data.openingHours || '',
          type: data.type || 'Traditional',
          cityId: data.city?.id?.toString() || '',
          boroughId: data.borough?.id?.toString() || '',
          lat: data.lat?.toString() || '',
          lng: data.lng?.toString() || '',
          selectedAmenities: data.amenities?.map((a: any) => a.amenity?.key || a.amenity?.label) || [],
        });
        
        // Load managers for this pub
        if (data.managers) {
          setPubManagers(data.managers.map((m: any) => ({
            id: m.manager?.id || m.managerId,
            email: m.manager?.email || '',
            name: m.manager?.name || '',
            role: m.role || 'owner',
          })));
        } else {
          setPubManagers([]);
        }
        
        setShowEditModal(true);
      } else {
        alert('Failed to load pub details');
      }
    } catch (error) {
      console.error('Error loading pub:', error);
      alert('Error loading pub details');
    }
  };

  const handleAddPubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/pubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addFormData.name,
          address: addFormData.address || undefined,
          description: addFormData.description || undefined,
          phone: addFormData.phone || undefined,
          website: addFormData.website || undefined,
          openingHours: addFormData.openingHours || undefined,
          type: addFormData.type,
          cityId: addFormData.cityId ? parseInt(addFormData.cityId) : undefined,
          boroughId: addFormData.boroughId ? parseInt(addFormData.boroughId) : undefined,
          lat: addFormData.lat ? parseFloat(addFormData.lat) : undefined,
          lng: addFormData.lng ? parseFloat(addFormData.lng) : undefined,
          placeId: addFormData.placeId || undefined,
          amenities: addFormData.selectedAmenities,
          managerEmail: addFormData.managerEmail || undefined,
          managerPassword: addFormData.managerPassword || undefined,
        }),
      });

      if (response.ok) {
        alert('Pub created successfully!');
        setShowAddModal(false);
        setAddFormData({
          name: '',
          address: '',
          description: '',
          phone: '',
          website: '',
          openingHours: '',
          type: 'Traditional',
          cityId: '',
          boroughId: '',
          lat: '',
          lng: '',
          placeId: '',
          selectedAmenities: [],
          managerEmail: '',
          managerPassword: '',
        });
        fetchPubs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create pub');
      }
    } catch (error) {
      console.error('Error creating pub:', error);
      alert('Error creating pub');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPub || !editFormData.name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pubs/${editingPub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          address: editFormData.address || null,
          description: editFormData.description || null,
          phone: editFormData.phone || null,
          website: editFormData.website || null,
          openingHours: editFormData.openingHours || null,
          type: editFormData.type || null,
          cityId: editFormData.cityId ? parseInt(editFormData.cityId) : null,
          boroughId: editFormData.boroughId ? parseInt(editFormData.boroughId) : null,
          lat: editFormData.lat ? parseFloat(editFormData.lat) : null,
          lng: editFormData.lng ? parseFloat(editFormData.lng) : null,
          amenities: editFormData.selectedAmenities,
        }),
      });

      if (response.ok) {
        alert('Pub updated successfully!');
        setShowEditModal(false);
        setEditingPub(null);
        setEditingPubFull(null);
        fetchPubs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update pub');
      }
    } catch (error) {
      console.error('Error updating pub:', error);
      alert('Error updating pub');
    } finally {
      setSaving(false);
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

  const handleAddManager = async () => {
    if (!editingPub || !newManagerData.email || !newManagerData.password) {
      alert('Email and password are required');
      return;
    }

    try {
      const response = await fetch(`/api/admin/pubs/${editingPub.id}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManagerData),
      });

      if (response.ok) {
        const data = await response.json();
        setPubManagers([...pubManagers, data.manager]);
        setNewManagerData({ email: '', name: '', password: '', role: 'owner' });
        setShowAddManager(false);
        alert('Manager added successfully!');
        fetchPubs(); // Refresh to update manager status
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add manager');
      }
    } catch (error) {
      console.error('Error adding manager:', error);
      alert('Error adding manager');
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    if (!editingPub || !confirm('Are you sure you want to remove this manager?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/pubs/${editingPub.id}/managers?managerId=${managerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPubManagers(pubManagers.filter(m => m.id !== managerId));
        alert('Manager removed successfully!');
        fetchPubs(); // Refresh to update manager status
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove manager');
      }
    } catch (error) {
      console.error('Error removing manager:', error);
      alert('Error removing manager');
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
        <DialogContent className="sm:max-w-[700px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Pub</DialogTitle>
            <DialogDescription>
              Add a new pub to the system. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPubSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-type">Type</Label>
                <select
                  id="add-type"
                  value={addFormData.type}
                  onChange={(e) => setAddFormData({ ...addFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Traditional">Traditional</option>
                  <option value="Modern">Modern</option>
                  <option value="Gastro Pub">Gastro Pub</option>
                  <option value="Food Pub">Food Pub</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-address">Address</Label>
              <Input
                id="add-address"
                value={addFormData.address}
                onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-city">City</Label>
                <select
                  id="add-city"
                  value={addFormData.cityId}
                  onChange={(e) => {
                    setAddFormData({ ...addFormData, cityId: e.target.value, boroughId: '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select City</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-borough">Borough</Label>
                <select
                  id="add-borough"
                  value={addFormData.boroughId}
                  onChange={(e) => setAddFormData({ ...addFormData, boroughId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={!addFormData.cityId}
                >
                  <option value="">Select Borough</option>
                  {addFormData.cityId && boroughs
                    .filter(b => b.cityId === parseInt(addFormData.cityId))
                    .map(borough => (
                      <option key={borough.id} value={borough.id}>{borough.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-lat">Latitude</Label>
                <Input
                  id="add-lat"
                  type="number"
                  step="any"
                  value={addFormData.lat}
                  onChange={(e) => setAddFormData({ ...addFormData, lat: e.target.value })}
                  placeholder="51.5074"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-lng">Longitude</Label>
                <Input
                  id="add-lng"
                  type="number"
                  step="any"
                  value={addFormData.lng}
                  onChange={(e) => setAddFormData({ ...addFormData, lng: e.target.value })}
                  placeholder="-0.1278"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-placeId">Google Place ID (optional)</Label>
              <Input
                id="add-placeId"
                value={addFormData.placeId}
                onChange={(e) => setAddFormData({ ...addFormData, placeId: e.target.value })}
                placeholder="ChIJ..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <textarea
                id="add-description"
                value={addFormData.description}
                onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-website">Website</Label>
                <Input
                  id="add-website"
                  type="url"
                  value={addFormData.website}
                  onChange={(e) => setAddFormData({ ...addFormData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-openingHours">Opening Hours</Label>
              <Input
                id="add-openingHours"
                value={addFormData.openingHours}
                onChange={(e) => setAddFormData({ ...addFormData, openingHours: e.target.value })}
                placeholder="Monday: 9:00 AM – 5:00 PM; Tuesday: ..."
              />
            </div>

            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  {amenities.map(amenity => (
                    <label key={amenity.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addFormData.selectedAmenities.includes(amenity.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAddFormData({
                              ...addFormData,
                              selectedAmenities: [...addFormData.selectedAmenities, amenity.key]
                            });
                          } else {
                            setAddFormData({
                              ...addFormData,
                              selectedAmenities: addFormData.selectedAmenities.filter(a => a !== amenity.key)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{amenity.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">Manager (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-managerEmail">Manager Email</Label>
                  <Input
                    id="add-managerEmail"
                    type="email"
                    value={addFormData.managerEmail}
                    onChange={(e) => setAddFormData({ ...addFormData, managerEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-managerPassword">Manager Password</Label>
                  <Input
                    id="add-managerPassword"
                    type="password"
                    value={addFormData.managerPassword}
                    onChange={(e) => setAddFormData({ ...addFormData, managerPassword: e.target.value })}
                    placeholder="Leave empty to auto-generate"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setShowAddModal(false);
                  setAddFormData({
                    name: '',
                    address: '',
                    description: '',
                    phone: '',
                    website: '',
                    openingHours: '',
                    type: 'Traditional',
                    cityId: '',
                    boroughId: '',
                    lat: '',
                    lng: '',
                    placeId: '',
                    selectedAmenities: [],
                    managerEmail: '',
                    managerPassword: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Pub'}
              </Button>
            </DialogFooter>
          </form>
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
            <form onSubmit={handleEditPubSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <select
                    id="edit-type"
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Traditional">Traditional</option>
                    <option value="Modern">Modern</option>
                    <option value="Gastro Pub">Gastro Pub</option>
                    <option value="Food Pub">Food Pub</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <select
                    id="edit-city"
                    value={editFormData.cityId}
                    onChange={(e) => {
                      setEditFormData({ ...editFormData, cityId: e.target.value, boroughId: '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-borough">Borough</Label>
                  <select
                    id="edit-borough"
                    value={editFormData.boroughId}
                    onChange={(e) => setEditFormData({ ...editFormData, boroughId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!editFormData.cityId}
                  >
                    <option value="">Select Borough</option>
                    {editFormData.cityId && boroughs
                      .filter(b => b.cityId === parseInt(editFormData.cityId))
                      .map(borough => (
                        <option key={borough.id} value={borough.id}>{borough.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-lat">Latitude</Label>
                  <Input
                    id="edit-lat"
                    type="number"
                    step="any"
                    value={editFormData.lat}
                    onChange={(e) => setEditFormData({ ...editFormData, lat: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lng">Longitude</Label>
                  <Input
                    id="edit-lng"
                    type="number"
                    step="any"
                    value={editFormData.lng}
                    onChange={(e) => setEditFormData({ ...editFormData, lng: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    type="url"
                    value={editFormData.website}
                    onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-openingHours">Opening Hours</Label>
                <Input
                  id="edit-openingHours"
                  value={editFormData.openingHours}
                  onChange={(e) => setEditFormData({ ...editFormData, openingHours: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map(amenity => (
                      <label key={amenity.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editFormData.selectedAmenities.includes(amenity.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({
                                ...editFormData,
                                selectedAmenities: [...editFormData.selectedAmenities, amenity.key]
                              });
                            } else {
                              setEditFormData({
                                ...editFormData,
                                selectedAmenities: editFormData.selectedAmenities.filter(a => a !== amenity.key)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {editingPubFull && (
                <div className="border-t pt-4 space-y-4">
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
                    <div className="flex justify-between items-center">
                      <Label>Managers</Label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowAddManager(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Manager
                      </Button>
                    </div>
                    {pubManagers.length > 0 ? (
                      <div className="space-y-2">
                        {pubManagers.map(manager => (
                          <div key={manager.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{manager.email}</div>
                              {manager.name && <div className="text-xs text-gray-500">{manager.name}</div>}
                              <div className="text-xs text-gray-500">Role: {manager.role}</div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveManager(manager.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No managers assigned</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Views (Last 30 days)</Label>
                    <div className="text-lg font-semibold">{editingPub.views.toLocaleString()}</div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPub(null);
                    setEditingPubFull(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Manager Modal */}
      <Dialog open={showAddManager} onOpenChange={setShowAddManager}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Add Manager to {editingPub?.name}</DialogTitle>
            <DialogDescription>
              Add a manager who can edit this pub's details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manager-email">Email *</Label>
              <Input
                id="manager-email"
                type="email"
                value={newManagerData.email}
                onChange={(e) => setNewManagerData({ ...newManagerData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-name">Name</Label>
              <Input
                id="manager-name"
                value={newManagerData.name}
                onChange={(e) => setNewManagerData({ ...newManagerData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-password">Password *</Label>
              <Input
                id="manager-password"
                type="password"
                value={newManagerData.password}
                onChange={(e) => setNewManagerData({ ...newManagerData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-role">Role</Label>
              <select
                id="manager-role"
                value={newManagerData.role}
                onChange={(e) => setNewManagerData({ ...newManagerData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddManager(false);
                setNewManagerData({ email: '', name: '', password: '', role: 'owner' });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddManager}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Add Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
