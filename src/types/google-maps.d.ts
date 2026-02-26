/**
 * TypeScript definitions for Google Maps JavaScript API
 * These extend the Window interface for Google Maps global objects
 */

declare global {
  interface Window {
    google?: {
      maps?: {
        Map?: any;
        Marker?: any;
        Geocoder?: any;
        places?: {
          PlacesService?: any;
          Autocomplete?: any;
          PlacesServiceStatus?: any;
        };
        Animation?: any;
        importLibrary?: (name: string) => Promise<unknown>;
      } & {
        places?: {
          PlacesService?: any;
          PlacesServiceStatus?: any;
        };
      };
    };
    initGoogleMaps?: () => void;
    googleMapsLoaded?: boolean;
    googleMapsLoading?: boolean;
  }
}

export {};
