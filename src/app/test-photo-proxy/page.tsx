'use client';

import { useState } from 'react';
import { getCachedPhotoUrl } from '@/utils/photoUtils';
import PubPhoto from '@/components/PubPhoto';

export default function TestPhotoProxy() {
  const [testRef, setTestRef] = useState('');
  const [testWidth, setTestWidth] = useState(480);
  const [testResults, setTestResults] = useState<{
    url: string;
    loading: boolean;
    error: string | null;
  }>({
    url: '',
    loading: false,
    error: null,
  });

  const handleTest = async () => {
    if (!testRef.trim()) return;

    setTestResults({ url: '', loading: true, error: null });

    try {
      const url = getCachedPhotoUrl({ 
        ref: testRef.trim(), 
        width: testWidth 
      });
      
      // Test if the URL is accessible
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        setTestResults({ 
          url, 
          loading: false, 
          error: null 
        });
      } else {
        setTestResults({ 
          url, 
          loading: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        });
      }
    } catch (error) {
      setTestResults({ 
        url: getCachedPhotoUrl({ ref: testRef.trim(), width: testWidth }), 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Photo Proxy Test
          </h1>

          {/* Test Form */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Places Photo Reference
              </label>
              <input
                type="text"
                value={testRef}
                onChange={(e) => setTestRef(e.target.value)}
                placeholder="Enter photo reference (e.g., Aap_uEA7...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find photo references in Google Places API responses
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Width (px)
              </label>
              <input
                type="number"
                value={testWidth}
                onChange={(e) => setTestWidth(Number(e.target.value))}
                min="64"
                max="1280"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
            </div>

            <button
              onClick={handleTest}
              disabled={!testRef.trim() || testResults.loading}
              className="w-full bg-[#08d78c] hover:bg-[#06b875] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testResults.loading ? 'Testing...' : 'Test Photo Proxy'}
            </button>
          </div>

          {/* Test Results */}
          {testResults.url && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Test Results
                </h2>
                
                {testResults.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                    <p className="text-red-700">{testResults.error}</p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-green-800 font-semibold mb-2">Success</h3>
                    <p className="text-green-700">Photo proxy URL generated successfully!</p>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated URL
                  </label>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <code className="text-sm text-gray-800 break-all">
                      {testResults.url}
                    </code>
                  </div>
                </div>
              </div>

              {/* Photo Preview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Photo Preview
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <PubPhoto
                    photoRef={testRef}
                    alt="Test photo"
                    width={testWidth}
                    height={Math.round(testWidth * 0.75)}
                    className="w-full"
                    fallbackIcon="❌"
                  />
                </div>
              </div>

              {/* Different Sizes Demo */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Different Sizes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Small (320px)</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <PubPhoto
                        photoRef={testRef}
                        alt="Small test photo"
                        width={320}
                        height={240}
                        className="w-full"
                        fallbackIcon="❌"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Medium (480px)</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <PubPhoto
                        photoRef={testRef}
                        alt="Medium test photo"
                        width={480}
                        height={360}
                        className="w-full"
                        fallbackIcon="❌"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Large (800px)</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <PubPhoto
                        photoRef={testRef}
                        alt="Large test photo"
                        width={800}
                        height={600}
                        className="w-full"
                        fallbackIcon="❌"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-blue-800 font-semibold mb-4">How to Use</h3>
            <div className="text-blue-700 space-y-2 text-sm">
              <p>1. Get a photo reference from Google Places API</p>
              <p>2. Enter it in the form above and click "Test Photo Proxy"</p>
              <p>3. The proxy will cache the image for 7 days</p>
              <p>4. Use the generated URL in your components</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
