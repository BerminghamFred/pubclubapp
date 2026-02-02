'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Loader2, MapPin } from 'lucide-react';

interface PubSearchResult {
  id: string;
  name: string;
  slug: string;
  area: string;
}

interface ConnectionRequest {
  id: string;
  pubId: string;
  pubName?: string;
  status: string;
  createdAt: string;
}

export default function ConnectPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PubSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [linkedPubIds, setLinkedPubIds] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const router = useRouter();

  const loadRequests = useCallback(async () => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }
    try {
      const res = await fetch('/api/pub-manager/connect', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        setLinkedPubIds(data.linkedPubIds || []);
      }
    } catch {
      setRequests([]);
      setLinkedPubIds([]);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }
    loadRequests().finally(() => setLoading(false));
  }, [router, loadRequests]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('pub-manager-token');
        const res = await fetch(
          `/api/pub-manager/pubs/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setSearchResults(data.success ? data.pubs || [] : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleAdd = async (pubId: string) => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }
    setSendingId(pubId);
    setMessage('');
    try {
      const res = await fetch('/api/pub-manager/connect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pubId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "Request sent – we'll verify and connect you soon.");
        setMessageType('success');
        loadRequests();
        setSearchResults((prev) => prev.filter((p) => p.id !== pubId));
      } else {
        setMessage(data.message || 'Failed to send request.');
        setMessageType('error');
      }
    } catch {
      setMessage('Something went wrong. Please try again.');
      setMessageType('error');
    } finally {
      setSendingId(null);
    }
  };

  const isLinked = (pubId: string) => linkedPubIds.includes(pubId);
  const pendingPubIds = requests.filter((r) => r.status === 'pending').map((r) => r.pubId);
  const canAdd = (pubId: string) => !isLinked(pubId) && !pendingPubIds.includes(pubId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <button
              onClick={() => router.push('/pub-manager/dashboard')}
              className="inline-flex items-center gap-2 bg-[#08d78c] hover:bg-[#06b875] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors mb-4"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Connect your other pubs</h1>
            <p className="text-gray-600 mt-1">Search by pub name and request to add pubs to your chain.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              messageType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search by pub name
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type pub name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>

          {searchQuery.length >= 2 && (
            <ul className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {searchResults.length === 0 && !searching && (
                <li className="text-gray-500 text-sm py-4">No pubs found. Try a different name.</li>
              )}
              {searchResults.map((pub) => (
                <li
                  key={pub.id}
                  className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 truncate block">{pub.name}</span>
                    {pub.area && (
                      <span className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {pub.area}
                      </span>
                    )}
                  </div>
                  {isLinked(pub.id) ? (
                    <span className="text-sm text-green-600 font-medium">Already in your chain</span>
                  ) : pendingPubIds.includes(pub.id) ? (
                    <span className="text-sm text-amber-600 font-medium">Request sent</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(pub.id)}
                      disabled={sendingId === pub.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#08d78c] hover:bg-[#06b875] disabled:opacity-60 text-white text-sm font-medium"
                    >
                      {sendingId === pub.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Add to my chain
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {requests.filter((r) => r.status === 'pending').length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending requests</h2>
            <ul className="space-y-2">
              {requests
                .filter((r) => r.status === 'pending')
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm text-gray-700">
                    <span>{r.pubName || r.pubId}</span>
                    <span className="text-amber-600">Pending verification</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
