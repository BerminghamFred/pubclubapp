'use client';

import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

export function useMapLoader(shouldLoad: boolean) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!shouldLoad) return;

    // Return early if already loaded
    if (typeof window !== 'undefined' && window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Return early if already loading
    if (loadPromise) {
      loadPromise.then(() => setIsLoaded(true)).catch(setError);
      return;
    }

    // Initialize loader only once
    if (!loaderInstance) {
      const apiKey = process.env.NEXT_PUBLIC_MAPS_BROWSER_KEY;
      
      if (!apiKey) {
        setError(new Error('Missing NEXT_PUBLIC_MAPS_BROWSER_KEY'));
        return;
      }

      loaderInstance = new Loader({
        apiKey,
        version: 'weekly',
        // Do NOT include places library to save costs
        libraries: [], // Only load base Maps JS API
      });
    }

    // Start loading
    loadPromise = loaderInstance.load();
    
    loadPromise
      .then(() => {
        setIsLoaded(true);
        console.log('Google Maps loaded successfully');
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError(err);
      });

  }, [shouldLoad]);

  return { isLoaded, error };
}

