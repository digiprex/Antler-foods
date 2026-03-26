/**
 * TypeScript definitions for Google Maps JavaScript API
 * These extend the Window interface for Google Maps global objects
 */

declare global {
  interface Window {
    google?: {
      maps?: {
        Map?: new (element: Element, options?: Record<string, unknown>) => any;
        Marker?: new (options?: Record<string, unknown>) => any;
        Geocoder?: new () => {
          geocode: (
            request: Record<string, unknown>,
            callback: (results: any[], status: string) => void,
          ) => void;
        };
        Circle?: new (options?: Record<string, unknown>) => any;
        Polygon?: new (options?: Record<string, unknown>) => any;
        places?: {
          PlacesService?: unknown;
          Autocomplete?: unknown;
          PlacesServiceStatus?: unknown;
        };
        Animation?: unknown;
        event?: {
          removeListener?: (listener: any) => void;
        };
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
