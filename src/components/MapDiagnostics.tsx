'use client';

import { useState } from 'react';

export default function MapDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const runDiagnostics = async () => {
    const results: string[] = [];
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      results.push('❌ Not in browser environment');
      setDiagnostics(results);
      return;
    }
    
    results.push('✅ Browser environment detected');
    
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      results.push('✅ Google Maps already loaded in window object');
    } else {
      results.push('❌ Google Maps not found in window object');
    }
    
    // Check network connectivity
    try {
      const response = await fetch('https://maps.googleapis.com/maps/api/js', { method: 'HEAD' });
      results.push(`✅ Google Maps API endpoint accessible (Status: ${response.status})`);
    } catch (error) {
      results.push(`❌ Google Maps API endpoint not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Check API key format
    const apiKey = 'AIzaSyAJC2FaVnXp8HQO6OvMLwmvLCsCAeD1xo';
    if (apiKey.length === 39) {
      results.push('✅ API key length is correct (39 characters)');
    } else {
      results.push(`❌ API key length is incorrect (${apiKey.length} characters, expected 39)`);
    }
    
    // Check if API key starts with expected format
    if (apiKey.startsWith('AIza')) {
      results.push('✅ API key format looks correct (starts with AIza)');
    } else {
      results.push('❌ API key format looks incorrect (should start with AIza)');
    }
    
    // Check console for errors
    results.push('📋 Check browser console for detailed error messages');
    
    setDiagnostics(results);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Map Diagnostics</h3>
      
      <button
        onClick={runDiagnostics}
        className="px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] text-black font-medium rounded-lg transition-colors duration-200 mb-4"
      >
        Run Diagnostics
      </button>
      
      {diagnostics.length > 0 && (
        <div className="space-y-2">
          {diagnostics.map((diagnostic, index) => (
            <div key={index} className="text-sm">
              {diagnostic}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Common Issues & Solutions:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>API Key Invalid:</strong> Check if the key is complete and correct</li>
          <li>• <strong>Billing Not Set Up:</strong> Enable billing in Google Cloud Console</li>
          <li>• <strong>API Not Enabled:</strong> Enable Maps JavaScript API in Google Cloud</li>
          <li>• <strong>Domain Restrictions:</strong> Check API key restrictions in Google Cloud</li>
          <li>• <strong>Quota Exceeded:</strong> Check usage limits in Google Cloud</li>
        </ul>
      </div>
    </div>
  );
} 