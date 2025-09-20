'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import MapDiagnostics from '@/components/MapDiagnostics';

export default function TestMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const testMap = async () => {
      try {
        setStatus('Loading Google Maps API...');
        
        const loader = new Loader({
          apiKey: 'AIzaSyAJC2FaVnXp8HQO6OvMLwmvLCsCAeD1xo',
          version: 'weekly',
          libraries: ['places']
        });

        setStatus('Creating map instance...');
        const google = await loader.load();
        
        if (mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 51.5074, lng: -0.1278 },
            zoom: 10
          });
          
          setStatus('Map loaded successfully!');
          
          // Add a test marker
          new google.maps.Marker({
            position: { lat: 51.5074, lng: -0.1278 },
            map: map,
            title: 'Test Marker - London'
          });
        }
      } catch (error) {
        console.error('Map test error:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testMap();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Google Maps API Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>
          <p className="text-gray-600 mb-4">
            This page tests if your Google Maps API key is working correctly.
          </p>
          <div className="bg-gray-100 p-4 rounded">
            <p className="font-mono text-sm">
              API Key: AIzaSyAJC2FaVnXp8HQO6OvMLwmvLCsCAeD1xo
            </p>
          </div>
        </div>

        {/* Diagnostics Component */}
        <div className="mb-6">
          <MapDiagnostics />
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold">Test Map</h3>
          </div>
          <div 
            ref={mapRef} 
            className="w-full h-96"
            style={{ minHeight: '400px' }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Check if the API key is correct and complete</li>
            <li>Verify the API key has Maps JavaScript API enabled</li>
            <li>Check if there are any billing issues</li>
            <li>Ensure the API key has proper restrictions (if any)</li>
            <li>Check browser console for detailed error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 