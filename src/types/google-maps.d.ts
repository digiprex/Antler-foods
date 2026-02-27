/**
 * TypeScript definitions for Google Maps JavaScript API
 * These extend the Window interface for Google Maps global objects
 */

declare global {
  interface Window {
    google?: {
      maps?: {
        Map?: unknown;
        Marker?: unknown;
        Geocoder?: unknown;
        places?: {
          PlacesService?: unknown;
          Autocomplete?: unknown;
          PlacesServiceStatus?: unknown;
        };
        Animation?: unknown;
        importLibrary?: (name: string) => Promise<unknown>;
      } & {
        places?: {
          PlacesService?: unknown;
          PlacesServiceStatus?: unknown;
        };
      };
    };
    initGoogleMaps?: () => void;
    googleMapsLoaded?: boolean;
    googleMapsLoading?: boolean;
  }
}

export {};
