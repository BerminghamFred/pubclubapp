'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

interface ConnectionRequestRow {
  id: string;
  email: string;
  pubId: string;
  pubName: string;
  slug?: string;
  area?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConnectionRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ConnectionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/connection-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActingId(id);
    try {
      const res = await fetch('/api/admin/connection-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } finally {
      setActingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const other = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Connection requests
            </CardTitle>
            <CardDescription>
              Pub managers requesting to add another pub to their chain. Approve to link their account to the pub.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {pending.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Pending</h3>
                    <ul className="space-y-2">
                      {pending.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{r.pubName}</span>
                            {r.area && <span className="text-gray-500 text-sm ml-2">({r.area})</span>}
                            <div className="text-sm text-gray-600 mt-0.5">{r.email}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(r.id, 'approved')}
                              disabled={actingId === r.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {actingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              <span className="ml-1">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(r.id, 'rejected')}
                              disabled={actingId === r.id}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                              <span className="ml-1">Reject</span>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pending.length === 0 && other.length === 0 && (
                  <p className="text-gray-500 py-4">No connection requests.</p>
                )}
                {other.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Processed</h3>
                    <ul className="space-y-2">
                      {other.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-4 py-2 px-4 rounded-lg border border-gray-100"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{r.pubName}</span>
                            <span className="text-gray-500 text-sm ml-2">{r.email}</span>
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              r.status === 'approved' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
