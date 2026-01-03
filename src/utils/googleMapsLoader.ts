// Shared utility to prevent multiple Google Maps API script loads
let googleMapsLoaded = false;
let googleMapsLoading = false;
let loadPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  // Check if already available globally (might be loaded by another script)
  if (typeof google !== 'undefined' && google.maps) {
    googleMapsLoaded = true;
    return Promise.resolve();
  }

  // If already loaded by our utility, return immediately
  if (googleMapsLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (googleMapsLoading && loadPromise) {
    return loadPromise;
  }

  // Start loading
  googleMapsLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    // Double-check if it became available while we were setting up
    if (typeof google !== 'undefined' && google.maps) {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
      return;
    }

    // Get API key from environment variable
    const apiKey = process.env.NEXT_PUBLIC_MAPS_BROWSER_KEY || process.env.NEXT_PUBLIC_GMAPS_BROWSER_KEY;
    if (!apiKey) {
      googleMapsLoading = false;
      reject(new Error('Missing Google Maps API key. Please set NEXT_PUBLIC_MAPS_BROWSER_KEY or NEXT_PUBLIC_GMAPS_BROWSER_KEY in your environment variables.'));
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
    };
    
    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const isGoogleMapsLoaded = (): boolean => {
  return googleMapsLoaded;
}; 