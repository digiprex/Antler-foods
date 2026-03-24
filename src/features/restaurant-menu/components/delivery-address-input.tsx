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

  if (!hasGoogleMapsApiKey || error) {
    return (
      <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <label htmlFor="delivery-address" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Delivery address
        </label>
        <input
          id="delivery-address"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your delivery address"
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
        {error ? (
          <p className="mt-1.5 text-xs text-red-600">
            Address autocomplete unavailable. Please enter address manually.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <label htmlFor="delivery-address" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        Delivery address
      </label>
      <div
        ref={containerRef}
        className="w-full [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete>input]:w-full [&>gmp-place-autocomplete>input]:rounded-xl [&>gmp-place-autocomplete>input]:border [&>gmp-place-autocomplete>input]:border-stone-200 [&>gmp-place-autocomplete>input]:px-3 [&>gmp-place-autocomplete>input]:py-2.5 [&>gmp-place-autocomplete>input]:text-sm [&>gmp-place-autocomplete>input]:text-stone-900 [&>gmp-place-autocomplete>input]:placeholder:text-stone-400 [&>gmp-place-autocomplete>input]:focus:border-stone-500 [&>gmp-place-autocomplete>input]:focus:outline-none [&>gmp-place-autocomplete>input]:focus:ring-1 [&>gmp-place-autocomplete>input]:focus:ring-stone-500"
      />
      {!isReady ? (
        <p className="mt-1.5 text-xs text-stone-500">
          Loading address autocomplete...
        </p>
      ) : null}
    </div>
  );
}
