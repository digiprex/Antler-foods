'use client';

import { useEffect, useRef, useState } from 'react';
import { useGooglePlacesAutocomplete, type SelectedGooglePlace } from '@/hooks/useGooglePlacesAutocomplete';

type GoogleGeocoderAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleGeocoderResult = {
  formatted_address?: string;
  place_id?: string;
  address_components?: GoogleGeocoderAddressComponent[];
};

interface DeliveryAddressInputProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelected?: (place: SelectedGooglePlace) => void;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        [key: string]: any;
        Geocoder?: new () => {
          geocode: (
            request: { location?: { lat: number; lng: number }; address?: string },
            callback: (results: any, status: string) => void,
          ) => void;
        };
      };
    };
  }
}

function readAddressComponent(
  components: GoogleGeocoderAddressComponent[] | undefined,
  type: string,
  preferShort = false,
) {
  const component = components?.find((entry) => entry.types?.includes(type));
  if (!component) {
    return '';
  }

  if (preferShort) {
    return component.short_name || component.long_name || '';
  }

  return component.long_name || component.short_name || '';
}

function createSelectedPlaceFromGeocoderResult(
  result: GoogleGeocoderResult,
  latitude: number,
  longitude: number,
): SelectedGooglePlace {
  const streetAddress = [
    readAddressComponent(result.address_components, 'street_number'),
    readAddressComponent(result.address_components, 'route'),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const city =
    readAddressComponent(result.address_components, 'locality') ||
    readAddressComponent(result.address_components, 'postal_town') ||
    readAddressComponent(result.address_components, 'administrative_area_level_2');
  const state = readAddressComponent(
    result.address_components,
    'administrative_area_level_1',
    true,
  );
  const postalCode = readAddressComponent(result.address_components, 'postal_code');
  const country =
    readAddressComponent(result.address_components, 'country', true) ||
    readAddressComponent(result.address_components, 'country');
  const formattedAddress =
    result.formatted_address ||
    [streetAddress, city, state, postalCode, country]
      .filter(Boolean)
      .join(', ');

  return {
    name: streetAddress || formattedAddress || 'Location',
    placeId: result.place_id || '',
    address: streetAddress || formattedAddress,
    formattedAddress,
    city,
    postalCode,
    country,
    state,
    lat: latitude,
    lng: longitude,
  };
}

export function DeliveryAddressInput({ value, onChange, onPlaceSelected }: DeliveryAddressInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const hasGoogleMapsApiKey = googleMapsApiKey.length > 0;
  const normalizedValue = value.trim();
  const hasAddressValue = normalizedValue.length > 0;

  const canUseCurrentLocation =
    typeof window !== 'undefined' &&
    'geolocation' in navigator &&
    hasGoogleMapsApiKey;

  const {
    setContainerElement,
    isReady,
    error,
  } = useGooglePlacesAutocomplete({
    apiKey: hasGoogleMapsApiKey ? googleMapsApiKey : undefined,
    placeholder: 'Search for your delivery address',
    onPlaceSelected: (place) => {
      onChange(place.formattedAddress || place.address || place.name);
      onPlaceSelected?.(place);
    },
    onInputValueChange: (inputValue) => {
      onChange(inputValue);
    },
  });

  const handleUseLocation = () => {
    if (!canUseCurrentLocation) {
      setLocationError('Location services are not available in your browser.');
      return;
    }

    setIsRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (!window.google?.maps?.Geocoder) {
          setLocationError('Google Maps is not loaded yet. Please try again.');
          setIsRequestingLocation(false);
          return;
        }

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            setIsRequestingLocation(false);

            if (status === 'OK' && results && results.length > 0) {
              const result = results[0] as GoogleGeocoderResult;
              const place = createSelectedPlaceFromGeocoderResult(result, latitude, longitude);
              onChange(place.formattedAddress || place.address || place.name);
              onPlaceSelected?.(place);
            } else {
              setLocationError('Unable to determine your address from your location.');
            }
          },
        );
      },
      (error) => {
        setIsRequestingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location access denied. Please enable location permissions.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information unavailable.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out.');
        } else {
          setLocationError('Unable to retrieve your location.');
        }
      },
    );
  };

  const handleClearAddress = () => {
    setLocationError(null);
    onChange('');
  };

  useEffect(() => {
    if (containerRef.current) {
      setContainerElement(containerRef.current);
    }
  }, [setContainerElement]);

  useEffect(() => {
    if (!containerRef.current || !hasGoogleMapsApiKey) {
      return;
    }

    const containerElement = containerRef.current;

    const syncDisplayedValue = () => {
      const placeElement = containerElement.querySelector('gmp-place-autocomplete') as
        | (HTMLElement & { value?: string; shadowRoot?: ShadowRoot | null })
        | null;

      if (!placeElement) {
        return false;
      }

      if (
        typeof placeElement.value === 'string' &&
        placeElement.value !== normalizedValue
      ) {
        placeElement.value = normalizedValue;
      }

      const shadowInputElement = placeElement.shadowRoot?.querySelector('input');
      if (
        shadowInputElement instanceof HTMLInputElement &&
        shadowInputElement.value !== normalizedValue
      ) {
        shadowInputElement.value = normalizedValue;
      }

      return true;
    };

    if (syncDisplayedValue()) {
      return;
    }

    const timer = window.setTimeout(() => {
      syncDisplayedValue();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasGoogleMapsApiKey, isReady, normalizedValue]);

  const detectAddressButton = canUseCurrentLocation ? (
    <button
      type="button"
      onClick={handleUseLocation}
      disabled={isRequestingLocation}
      aria-label={isRequestingLocation ? 'Detecting address' : 'Detect address'}
      title={isRequestingLocation ? 'Detecting address' : 'Detect address'}
      className="group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-900 text-white transition-all hover:-translate-y-0.5 hover:border-stone-900 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        {isRequestingLocation ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70"></span>
            <span className="absolute inline-flex h-4 w-4 animate-pulse rounded-full border border-white/40"></span>
          </>
        ) : (
          <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-white/10"></span>
        )}
        <svg
          className={`relative h-5 w-5 transition duration-200 ${isRequestingLocation ? 'animate-pulse' : 'group-hover:scale-110'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </span>
    </button>
  ) : null;

  const clearAddressButton = hasAddressValue ? (
    <button
      type="button"
      onClick={handleClearAddress}
      aria-label="Clear delivery address"
      title="Clear delivery address"
      className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  ) : null;

  if (!hasGoogleMapsApiKey || error) {
    return (
      <div className="min-w-0 rounded-[20px] border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <div className="relative min-w-0 flex-1">
            <input
              id="delivery-address"
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search for your delivery address"
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 pr-11 text-sm font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
            {clearAddressButton}
          </div>
          {detectAddressButton}
        </div>
        {locationError ? (
          <p className="mt-2 text-xs text-amber-700">{locationError}</p>
        ) : null}
        {error ? (
          <p className="mt-1.5 text-xs text-red-600">
            Address autocomplete unavailable. Please enter address manually.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-[20px] border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <div
            ref={containerRef}
            className="w-full [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete>input]:w-full [&>gmp-place-autocomplete>input]:rounded-xl [&>gmp-place-autocomplete>input]:border [&>gmp-place-autocomplete>input]:border-stone-200 [&>gmp-place-autocomplete>input]:px-3 [&>gmp-place-autocomplete>input]:py-2.5 [&>gmp-place-autocomplete>input]:pr-11 [&>gmp-place-autocomplete>input]:text-sm [&>gmp-place-autocomplete>input]:font-semibold [&>gmp-place-autocomplete>input]:text-stone-900 [&>gmp-place-autocomplete>input]:placeholder:font-normal [&>gmp-place-autocomplete>input]:placeholder:text-stone-400 [&>gmp-place-autocomplete>input]:focus:border-stone-500 [&>gmp-place-autocomplete>input]:focus:outline-none [&>gmp-place-autocomplete>input]:focus:ring-1 [&>gmp-place-autocomplete>input]:focus:ring-stone-500"
          />
          {clearAddressButton}
        </div>
        {detectAddressButton}
      </div>
      {locationError ? (
        <p className="mt-2 text-xs text-amber-700">{locationError}</p>
      ) : null}
      {!isReady ? (
        <p className="mt-1.5 text-xs text-stone-500">
          Loading address autocomplete...
        </p>
      ) : null}
    </div>
  );
}



