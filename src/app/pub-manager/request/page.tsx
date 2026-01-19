'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Request {
  id: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
  pubName: string;
}

export default function RequestPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'update_info',
    subject: '',
    description: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const router = useRouter();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/pub-manager/request', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.description) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/pub-manager/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Request submitted successfully! Request ID: ${data.request.id}`);
        setMessageType('success');
        setFormData({ type: 'update_info', subject: '', description: '' });
        setShowForm(false);
        await loadRequests();
      } else {
        setMessage(data.message || 'Failed to submit request');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      setMessage('An error occurred. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
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
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#08d78c] hover:bg-[#06b875] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              {showForm ? 'Cancel' : 'New Request'}
            </button>
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

        {/* Request Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit a Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Request Type
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                >
                  <option value="update_info">Update Information</option>
                  <option value="add_photos">Add Photos</option>
                  <option value="fix_errors">Fix Errors</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                  placeholder="Brief description of your request"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                  placeholder="Please provide details about your request..."
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Request History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request History</h2>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No requests submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{req.subject}</h3>
                      <p className="text-sm text-gray-500">{req.pubName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">
                      {format(new Date(req.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{req.type.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

