'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Mail, Phone, MapPin, User, Clock, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PubRequest {
  id: string;
  pubName: string;
  postcode: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PubRequestsPage() {
  const router = useRouter();
  const [pubRequests, setPubRequests] = useState<PubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PubRequest | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPubRequests();
  }, [statusFilter]);

  const fetchPubRequests = async () => {
    try {
      const url = statusFilter === 'all' 
        ? '/api/admin/pub-requests'
        : `/api/admin/pub-requests?status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPubRequests(data.pubRequests || []);
      }
    } catch (error) {
      console.error('Error fetching pub requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedRequest) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/admin/pub-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (response.ok) {
        await fetchPubRequests();
        setShowStatusModal(false);
        setSelectedRequest(null);
        setStatusNotes('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pub requests...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Pub Requests</h1>
              <p className="text-gray-600 mt-2">
                Manage requests from pubs wanting to join the platform
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

        {/* Status Filter */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-[#08d78c] hover:bg-[#06b875]' : ''}
          >
            All ({pubRequests.length})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            className={statusFilter === 'pending' ? 'bg-[#08d78c] hover:bg-[#06b875]' : ''}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'reviewed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('reviewed')}
            className={statusFilter === 'reviewed' ? 'bg-[#08d78c] hover:bg-[#06b875]' : ''}
          >
            Reviewed
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('approved')}
            className={statusFilter === 'approved' ? 'bg-[#08d78c] hover:bg-[#06b875]' : ''}
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('rejected')}
            className={statusFilter === 'rejected' ? 'bg-[#08d78c] hover:bg-[#06b875]' : ''}
          >
            Rejected
          </Button>
        </div>

        {/* Requests Grid */}
        {pubRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No pub requests found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pubRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="w-5 h-5 text-[#08d78c]" />
                        {request.pubName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Submitted {formatDate(request.createdAt)}
                      </CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusBadge(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600">{request.managerName}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600">{request.postcode}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                      <a href={`mailto:${request.contactEmail}`} className="text-[#08d78c] hover:underline">
                        {request.contactEmail}
                      </a>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                      <a href={`tel:${request.contactPhone}`} className="text-[#08d78c] hover:underline">
                        {request.contactPhone}
                      </a>
                    </div>
                    {request.notes && (
                      <div className="flex items-start gap-2 text-sm pt-2 border-t">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-600 italic">{request.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedRequest(request);
                        setStatusNotes(request.notes || '');
                        setShowStatusModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Update Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Status Update Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Request Status</DialogTitle>
              <DialogDescription>
                Update the status for {selectedRequest?.pubName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedRequest?.status === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectedRequest && setSelectedRequest({ ...selectedRequest, status: 'pending' })}
                    className={selectedRequest?.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                  >
                    Pending
                  </Button>
                  <Button
                    type="button"
                    variant={selectedRequest?.status === 'reviewed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectedRequest && setSelectedRequest({ ...selectedRequest, status: 'reviewed' })}
                    className={selectedRequest?.status === 'reviewed' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  >
                    Reviewed
                  </Button>
                  <Button
                    type="button"
                    variant={selectedRequest?.status === 'approved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectedRequest && setSelectedRequest({ ...selectedRequest, status: 'approved' })}
                    className={selectedRequest?.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    Approved
                  </Button>
                  <Button
                    type="button"
                    variant={selectedRequest?.status === 'rejected' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectedRequest && setSelectedRequest({ ...selectedRequest, status: 'rejected' })}
                    className={selectedRequest?.status === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    Rejected
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add any notes about this request..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedRequest(null);
                  setStatusNotes('');
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedRequest && handleStatusUpdate(selectedRequest.status)}
                disabled={updating}
                className="bg-[#08d78c] hover:bg-[#06b875]"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

