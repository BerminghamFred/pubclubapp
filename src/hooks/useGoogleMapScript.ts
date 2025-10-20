import { useEffect, useState } from 'react';

export function useGoogleMapScript(active: boolean) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!active) return;

    // Check if Google Maps is already loaded and ready
    if (typeof window !== 'undefined' && window.google?.maps?.Map) {
      setReady(true);
      setError(null);
      return;
    }

    // If Google Maps API is already loading (by another hook), wait for it
    const checkForMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.Map) {
        setReady(true);
        setError(null);
      } else {
        // Check again after a short delay
        setTimeout(checkForMaps, 100);
      }
    };

    // Start checking for Google Maps availability
    checkForMaps();

    // Only attempt to load if Google Maps is absolutely not available
    const loadMapsScript = async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        
        const apiKey = process.env.NEXT_PUBLIC_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GMAPS_BROWSER_KEY;
        if (!apiKey) {
          throw new Error('Missing Google Maps API key');
        }

        // Double check if maps is already loaded before creating loader
        if (typeof window !== 'undefined' && window.google?.maps?.Map) {
          setReady(true);
          return;
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'], // Include places library for consistency
        });

        await loader.load();
        
        // Double-check that Map constructor is available
        if (typeof window !== 'undefined' && window.google?.maps?.Map) {
          setReady(true);
          setError(null);
        } else {
          throw new Error('Google Maps Map constructor not available after loading');
        }
      } catch (err) {
        console.error('Error loading Google Maps script:', err);
        setError(err instanceof Error ? err : new Error('Failed to load Google Maps'));
      }
    };

    // Only try to load after a delay to let other loaders finish
    setTimeout(() => {
      if (typeof window === 'undefined' || !window.google?.maps?.Map) {
        loadMapsScript();
      }
    }, 1000);
  }, [active]);

  return { ready, error };
}
