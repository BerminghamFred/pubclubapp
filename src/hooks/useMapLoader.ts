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
    if (typeof window !== 'undefined' && window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    // Return early if already loading
    if (loadPromise) {
      loadPromise
        .then(() => {
          if (typeof window !== 'undefined' && window.google?.maps?.Map) {
            setIsLoaded(true);
          } else {
            setError(new Error('Google Maps loaded but Map constructor not available'));
          }
        })
        .catch(setError);
      return;
    }

    // Initialize loader only once
    if (!loaderInstance) {
      // Use the Google Maps API key
      const apiKey = 'AIzaSyCUMtS8YR9mG1Phzlq2Z15WEIAe-ePYD28';
      
      loaderInstance = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places'], // Include places library for full functionality
      });
    }

    // Start loading
    loadPromise = loaderInstance.load();
    
    loadPromise
      .then(() => {
        // Double-check that Map constructor is available
        if (typeof window !== 'undefined' && window.google?.maps?.Map) {
          setIsLoaded(true);
          console.log('Google Maps loaded successfully');
        } else {
          console.error('Google Maps loaded but Map constructor not available');
          setError(new Error('Google Maps Map constructor not available after loading'));
        }
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError(err);
      });

  }, [shouldLoad]);

  return { isLoaded, error };
}

