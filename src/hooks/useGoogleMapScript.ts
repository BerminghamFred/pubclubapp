import { useEffect, useState } from 'react';

export function useGoogleMapScript(active: boolean) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!active) return;

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setReady(true);
      return;
    }

    const loadMapsScript = async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        
        const apiKey = process.env.NEXT_PUBLIC_MAPS_BROWSER_KEY;
        if (!apiKey) {
          throw new Error('Missing NEXT_PUBLIC_MAPS_BROWSER_KEY');
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: [], // No 'places' library to save costs
        });

        await loader.load();
        setReady(true);
        setError(null);
      } catch (err) {
        console.error('Error loading Google Maps script:', err);
        setError(err instanceof Error ? err : new Error('Failed to load Google Maps'));
      }
    };

    loadMapsScript();
  }, [active]);

  return { ready, error };
}
