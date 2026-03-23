'use client';

import { useEffect, useRef } from 'react';
import { useGooglePlacesAutocomplete, type SelectedGooglePlace } from '@/hooks/useGooglePlacesAutocomplete';

interface DeliveryAddressInputProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelected?: (place: SelectedGooglePlace) => void;
}

export function DeliveryAddressInput({ value, onChange, onPlaceSelected }: DeliveryAddressInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const hasGoogleMapsApiKey = googleMapsApiKey.length > 0;

  const {
    setContainerElement,
    selectedPlace,
    isReady,
    error,
  } = useGooglePlacesAutocomplete({
    apiKey: hasGoogleMapsApiKey ? googleMapsApiKey : undefined,
    placeholder: 'Enter your delivery address',
    onPlaceSelected: (place) => {
      onChange(place.address || place.name);
      onPlaceSelected?.(place);
    },
    onInputValueChange: (inputValue) => {
      onChange(inputValue);
    },
  });

  useEffect(() => {
    if (containerRef.current) {
      setContainerElement(containerRef.current);
    }
  }, [setContainerElement]);

  // If Google Maps API is not available, fall back to regular input
  if (!hasGoogleMapsApiKey || error) {
    return (
      <div className="rounded-[24px] border border-black/10 bg-white px-5 py-4 shadow-sm">
        <label htmlFor="delivery-address" className="block text-sm font-medium text-slate-700 mb-2">
          Delivery Address
        </label>
        <input
          id="delivery-address"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your delivery address"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">
            Address autocomplete unavailable. Please enter address manually.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-black/10 bg-white px-5 py-4 shadow-sm">
      <label htmlFor="delivery-address" className="block text-sm font-medium text-slate-700 mb-2">
        Delivery Address
      </label>
      <div 
        ref={containerRef}
        className="w-full [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete>input]:w-full [&>gmp-place-autocomplete>input]:rounded-lg [&>gmp-place-autocomplete>input]:border [&>gmp-place-autocomplete>input]:border-slate-300 [&>gmp-place-autocomplete>input]:px-3 [&>gmp-place-autocomplete>input]:py-2 [&>gmp-place-autocomplete>input]:text-base [&>gmp-place-autocomplete>input]:placeholder:text-slate-400 [&>gmp-place-autocomplete>input]:focus:border-slate-500 [&>gmp-place-autocomplete>input]:focus:outline-none [&>gmp-place-autocomplete>input]:focus:ring-1 [&>gmp-place-autocomplete>input]:focus:ring-slate-500"
      />
      {!isReady && (
        <p className="mt-1 text-xs text-slate-500">
          Loading address autocomplete...
        </p>
      )}
    </div>
  );
}