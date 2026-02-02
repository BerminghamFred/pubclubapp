'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, TrendingUp, MessageSquare, Lightbulb, BarChart3 } from 'lucide-react';

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [signedUp, setSignedUp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/pub-manager/newsletter', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.signedUp) {
          setSignedUp(true);
        }
      } catch {
        // Keep signedUp false on error
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSignUp = async () => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) {
      router.push('/pub-manager/login');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/pub-manager/newsletter', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (data.success) {
        setMessage(data.message || 'You are signed up for monthly insights.');
        setMessageType('success');
        setSignedUp(true);
      } else {
        setMessage(data.message || 'Sign up failed.');
        setMessageType('error');
      }
    } catch {
      setMessage('Something went wrong. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Get monthly user insights</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(signedUp || message) && (
          <div
            className={`mb-6 p-4 rounded-md ${
              messageType === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {messageType === 'error' ? message : (signedUp ? 'You are signed up for monthly insights.' : message)}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-6">
          <p className="text-gray-700 leading-relaxed">
            Our monthly newsletter gives pub managers like you actionable insights to attract more visitors and improve your listing.
          </p>

          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#08d78c]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#08d78c]" />
              </span>
              <div>
                <strong className="text-gray-900">Most popular searches and filters in your area</strong>
                <p className="text-sm text-gray-600 mt-1">
                  See what users are looking for so you can highlight the right amenities and details.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#08d78c]/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#08d78c]" />
              </span>
              <div>
                <strong className="text-gray-900">What users say about competitors</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Review sentiment and themes so you can differentiate and improve.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#08d78c]/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-[#08d78c]" />
              </span>
              <div>
                <strong className="text-gray-900">Tips to drive more traffic</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Photos, hours, and amenities matter — we share best practices and updates.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#08d78c]/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#08d78c]" />
              </span>
              <div>
                <strong className="text-gray-900">Seasonal trends and area benchmarks</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Optional highlights on seasonal trends and new feature updates.
                </p>
              </div>
            </li>
          </ul>

          <div className="pt-4 border-t border-gray-200">
            {signedUp ? (
              <p className="text-green-700 font-medium flex items-center gap-2">
                <Mail className="w-5 h-5" />
                You’re signed up. We’ll send the next insights to your manager email.
              </p>
            ) : (
              <button
                onClick={handleSignUp}
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                <Mail className="w-5 h-5" />
                {submitting ? 'Signing up...' : 'Sign up'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
