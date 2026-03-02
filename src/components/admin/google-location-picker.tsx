/**
 * Google Location Picker Component
 *
 * Integrates Google Maps API for:
 * - Places Autocomplete for address search
 * - Interactive map with marker placement
 * - Automatic geocoding of addresses
 * - Reverse geocoding for coordinates
 */

'use client';

import { useEffect, useRef, useState, memo, useCallback } from 'react';
import type { LocationItem } from '@/types/location.types';

interface GoogleLocationPickerProps {
  location: LocationItem;
  onLocationUpdate: (updates: Partial<LocationItem>) => void;
}

// Google Maps types are declared in src/types/google-maps.d.ts

// Cache for Google Maps script loading
let googleMapsLoadPromise: Promise<void> | null = null;

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  // Return cached promise if already loading
  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  // Return immediately if already loaded
  if (window.googleMapsLoaded && window.google && window.google.maps) {
    return Promise.resolve();
  }

  // Check if script is already in DOM
  const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          window.googleMapsLoaded = true;
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error('Google Maps loading timeout'));
      }, 10000);
    });
  }

  // Create and load new script
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.googleMapsLoaded = true;
      googleMapsLoadPromise = null;
      resolve();
    };

    script.onerror = () => {
      googleMapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

function GoogleLocationPicker({
  location,
  onLocationUpdate,
}: GoogleLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const mapInitialized = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();

    try {
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results && response.results[0]) {
        const place = response.results[0];
        const addressComponents = place.address_components || [];
        const updates: Partial<LocationItem> = {};

        // Parse address components
        addressComponents.forEach((component: google.maps.GeocoderAddressComponent) => {
          const types = component.types;

          if (types.includes('street_number')) {
            updates.address = component.long_name;
          } else if (types.includes('route')) {
            updates.address = (updates.address || '') + ' ' + component.long_name;
          } else if (types.includes('locality')) {
            updates.city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            updates.state = component.short_name;
          } else if (types.includes('postal_code')) {
            updates.zipCode = component.long_name;
          } else if (types.includes('country')) {
            updates.country = component.long_name;
          }
        });

        onLocationUpdate(updates);
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  }, [onLocationUpdate]);

  const initializeMap = useCallback(() => {
    if (!window.google || !mapRef.current || mapInitialized.current) return;

    try {
      const google = window.google;
      mapInitialized.current = true;

      // Initialize map
      const initialCenter = {
        lat: location.latitude || 40.7128,
        lng: location.longitude || -74.0060,
      };

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: 'cooperative', // Better mobile experience
      });

      setMap(mapInstance);

      // Add marker
      const markerInstance = new google.maps.Marker({
        position: initialCenter,
        map: mapInstance,
        draggable: true,
        title: location.name || 'Location',
        animation: google.maps.Animation.DROP,
      });

      setMarker(markerInstance);

      // Handle marker drag
      markerInstance.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng!.lat();
        const lng = e.latLng!.lng();
        onLocationUpdate({ latitude: lat, longitude: lng });
        reverseGeocode(lat, lng);
      });

      // Handle map click
      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng!.lat();
        const lng = e.latLng!.lng();
        markerInstance.setPosition({ lat, lng });
        onLocationUpdate({ latitude: lat, longitude: lng });
        reverseGeocode(lat, lng);
      });

      // Initialize autocomplete
      if (inputRef.current) {
        const autocompleteInstance = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['establishment', 'geocode'],
            fields: ['address_components', 'geometry', 'name', 'formatted_address', 'formatted_phone_number'],
          }
        );

        // Handle place selection
        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();

          if (!place.geometry) {
            setError('No details available for selected location');
            return;
          }

          // Extract address components
          const addressComponents = place.address_components || [];
          const updates: Partial<LocationItem> = {
            name: place.name || '',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          };

          // Parse address components
          addressComponents.forEach((component: google.maps.GeocoderAddressComponent) => {
            const types = component.types;

            if (types.includes('street_number')) {
              updates.address = component.long_name;
            } else if (types.includes('route')) {
              updates.address = (updates.address || '') + ' ' + component.long_name;
            } else if (types.includes('locality')) {
              updates.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              updates.state = component.short_name;
            } else if (types.includes('postal_code')) {
              updates.zipCode = component.long_name;
            } else if (types.includes('country')) {
              updates.country = component.long_name;
            }
          });

          // Update map and marker
          const position = {
            lat: updates.latitude!,
            lng: updates.longitude!,
          };

          mapInstance.setCenter(position);
          mapInstance.setZoom(15);
          markerInstance.setPosition(position);

          // Update parent component
          onLocationUpdate(updates);
        });
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing Google Maps:', err);
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude, location.name, onLocationUpdate, reverseGeocode]);

  // Load Google Maps script with caching
  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    if (mapInitialized.current) return;

    const loadAndInitMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey);
        initializeMap();
      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load Google Maps');
        setIsLoading(false);
      }
    };

    loadAndInitMap();
  }, [apiKey, initializeMap]);

  // Geocode address to coordinates
  const geocodeAddress = async () => {
    if (!window.google) return;

    const addressString = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}, ${location.country}`;

    if (!addressString.trim()) return;

    const geocoder = new window.google.maps.Geocoder();

    try {
      const response = await geocoder.geocode({
        address: addressString,
      });

      if (response.results && response.results[0]) {
        const result = response.results[0];
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();

        // Update map and marker
        if (map && marker) {
          const position = { lat, lng };
          map.setCenter(position);
          map.setZoom(15);
          marker.setPosition(position);
        }

        onLocationUpdate({ latitude: lat, longitude: lng });
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to find location');
    }
  };

  // Update map when location changes externally
  useEffect(() => {
    if (map && marker && location.latitude && location.longitude) {
      const position = {
        lat: location.latitude,
        lng: location.longitude,
      };
      marker.setPosition(position);
      map.setCenter(position);
    }
  }, [location.latitude, location.longitude, map, marker]);

  if (!apiKey) {
    return (
      <div style={{
        padding: '2rem',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Google Maps API Key Required
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          To use location search and mapping features, add your Google Maps API key to the .env.local file:
        </p>
        <code style={{
          display: 'block',
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.8125rem',
          fontFamily: 'monospace',
        }}>
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
        </code>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
          Get your API key from: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Google Cloud Console</a>
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#6b7280' }}>Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        backgroundColor: '#fee',
        border: '1px solid #f00',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
        <p style={{ color: '#c00', fontWeight: '600' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '600',
          fontSize: '0.875rem',
        }}>
          🔍 Search for a location
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a place or address..."
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
          }}
        />
        <p style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginTop: '0.5rem',
        }}>
          Start typing to search, or click on the map to set a location
        </p>
      </div>

      {/* Geocode Button */}
      {location.address && (
        <button
          type="button"
          onClick={geocodeAddress}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📍 Find coordinates from address
        </button>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '8px',
          border: '2px solid #e5e7eb',
        }}
      />

      {/* Coordinates Display */}
      {location.latitude && location.longitude && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f0f4ff',
          borderRadius: '6px',
          fontSize: '0.875rem',
        }}>
          <strong>📍 Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Export with memo for better performance - prevents unnecessary re-renders
export default memo(GoogleLocationPicker, (prevProps, nextProps) => {
  // Only re-render if location coordinates or name change
  return (
    prevProps.location.latitude === nextProps.location.latitude &&
    prevProps.location.longitude === nextProps.location.longitude &&
    prevProps.location.name === nextProps.location.name
  );
});
