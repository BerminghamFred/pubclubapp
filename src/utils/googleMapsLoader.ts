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

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAJC2FaVnXp8HQO6OvMLwmvLCsCAeD1xQo&libraries=places`;
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