"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleDisplayName = string | { text?: string };

type GoogleLocation = {
  lat?: (() => number) | number;
  lng?: (() => number) | number;
};

type GooglePlaceResult = {
  id?: string;
  place_id?: string;
  displayName?: GoogleDisplayName;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: GoogleLocation;
  fetchFields?: (params: { fields: string[] }) => Promise<void>;
};

type GooglePlaceSelectEvent = Event & {
  place?: GooglePlaceResult;
  detail?: {
    place?: GooglePlaceResult;
  };
  placePrediction?: {
    toPlace?: () => GooglePlaceResult;
  };
};

type PlaceAutocompleteElementLike = HTMLElement & {
  value?: string;
};

type GooglePlacesLibrary = {
  PlaceAutocompleteElement: new (options?: Record<string, unknown>) => PlaceAutocompleteElementLike;
};

export interface SelectedGooglePlace {
  name: string;
  placeId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

interface UseGooglePlacesAutocompleteParams {
  apiKey?: string;
  onPlaceSelected?: (place: SelectedGooglePlace) => void;
  onPlaceCleared?: () => void;
  onInputValueChange?: (value: string) => void;
  placeholder?: string;
}

interface UseGooglePlacesAutocompleteResult {
  setContainerElement: (element: HTMLDivElement | null) => void;
  selectedPlace: SelectedGooglePlace | null;
  clearSelectedPlace: () => void;
  isReady: boolean;
  error: string | null;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<unknown>;
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-maps-places-script";
const DEFAULT_PLACEHOLDER = "Enter restaurant name";
const NEW_PLACE_FIELDS = ["displayName", "formattedAddress", "addressComponents", "location"];
const IS_DEV = process.env.NODE_ENV !== "production";
let googleScriptPromise: Promise<void> | null = null;

function maskApiKey(key: string) {
  if (key.length <= 8) {
    return "*".repeat(key.length);
  }

  return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`;
}

function getGoogleRuntimeSnapshot(existingScript?: HTMLScriptElement | null) {
  return {
    hasGoogleObject: Boolean(window.google),
    hasMapsObject: Boolean(window.google?.maps),
    hasImportLibrary: typeof window.google?.maps?.importLibrary === "function",
    existingScriptFound: Boolean(existingScript),
    existingScriptLoadedFlag: existingScript?.dataset.googleLoaded ?? null,
    existingScriptSrc: existingScript?.src ?? null,
  };
}

function debugLog(step: string, details?: Record<string, unknown>) {
  if (!IS_DEV || typeof window === "undefined") {
    return;
  }

  if (details) {
    console.info(`[places-new] ${step}`, details);
    return;
  }

  console.info(`[places-new] ${step}`);
}

function waitForImportLibrary(timeoutMs = 7000) {
  debugLog("waitForImportLibrary:start", { timeoutMs });
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (window.google?.maps?.importLibrary) {
        debugLog("waitForImportLibrary:ready");
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        debugLog("waitForImportLibrary:timeout", getGoogleRuntimeSnapshot());
        reject(
          new Error(
            "Google Maps JS loaded but importLibrary is unavailable. Check Maps JavaScript API is enabled + billing + key restrictions.",
          ),
        );
        return;
      }

      window.setTimeout(checkReady, 50);
    };

    checkReady();
  });
}

function loadGooglePlacesScript(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.maps?.importLibrary) {
    debugLog("loadScript:importLibraryAlreadyAvailable");
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    debugLog("loadScript:reusePendingPromise");
    return googleScriptPromise;
  }

  debugLog("loadScript:start", { apiKey: maskApiKey(apiKey) });
  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    debugLog("loadScript:existingScriptCheck", getGoogleRuntimeSnapshot(existingScript));

    if (existingScript) {
      if (window.google?.maps?.importLibrary) {
        debugLog("loadScript:existingScriptAndImportLibraryAvailable");
        resolve();
        return;
      }

      const appearsAlreadyLoaded =
        existingScript.dataset.googleLoaded === "true" || Boolean(window.google?.maps);
      if (appearsAlreadyLoaded) {
        debugLog("loadScript:replaceStaleScript", { existingScriptSrc: existingScript.src });
        existingScript.remove();
        googleScriptPromise = null;
        void loadGooglePlacesScript(apiKey).then(resolve).catch(reject);
        return;
      }

      const onLoad = () => {
        debugLog("loadScript:existingScriptLoaded");
        void waitForImportLibrary().then(resolve).catch(reject);
      };
      const onError = () => {
        debugLog("loadScript:existingScriptError");
        reject(new Error("Failed to load Google Maps Places script."));
      };

      existingScript.addEventListener("load", onLoad, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async`;
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      debugLog("loadScript:newScriptLoaded", getGoogleRuntimeSnapshot(script));
      script.dataset.googleLoaded = "true";
      void waitForImportLibrary().then(resolve).catch(reject);
    };
    script.onerror = () => {
      debugLog("loadScript:newScriptError", getGoogleRuntimeSnapshot(script));
      reject(new Error("Failed to load Google Maps Places script."));
    };
    debugLog("loadScript:appendScript", { scriptUrl: scriptUrl.replace(apiKey, maskApiKey(apiKey)) });
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function getAddressPart(place: GooglePlaceResult, type: string, short = false) {
  const component = place.addressComponents?.find((item) => item.types?.includes(type));
  if (!component) {
    return "";
  }

  if (short) {
    return component.shortText ?? component.short_name ?? component.longText ?? component.long_name ?? "";
  }

  return component.longText ?? component.long_name ?? component.shortText ?? component.short_name ?? "";
}

function getPlaceName(place: GooglePlaceResult) {
  if (typeof place.displayName === "string") {
    return place.displayName;
  }

  return place.displayName?.text ?? "";
}

function getCoordinate(coordinate: (() => number) | number | undefined) {
  if (typeof coordinate === "function") {
    return coordinate();
  }

  if (typeof coordinate === "number") {
    return coordinate;
  }

  return null;
}

function formatStreetAddress(place: GooglePlaceResult) {
  const streetNumber = getAddressPart(place, "street_number");
  const route = getAddressPart(place, "route");
  const composedAddress = [streetNumber, route].filter(Boolean).join(" ").trim();

  if (composedAddress) {
    return composedAddress;
  }

  return place.formattedAddress ?? "";
}

function toSelectedPlace(place: GooglePlaceResult): SelectedGooglePlace {
  const locality = getAddressPart(place, "locality");
  const postalTown = getAddressPart(place, "postal_town");
  const fallbackCity = getAddressPart(place, "administrative_area_level_2");

  return {
    name: getPlaceName(place),
    placeId: place.id ?? place.place_id ?? "",
    address: formatStreetAddress(place),
    city: locality || postalTown || fallbackCity,
    postalCode: getAddressPart(place, "postal_code"),
    country: getAddressPart(place, "country", true) || getAddressPart(place, "country"),
    state: getAddressPart(place, "administrative_area_level_1", true),
    lat: getCoordinate(place.location?.lat),
    lng: getCoordinate(place.location?.lng),
  };
}

async function resolvePlaceFromEvent(event: GooglePlaceSelectEvent) {
  let place = event.place ?? event.detail?.place;

  if (!place && typeof event.placePrediction?.toPlace === "function") {
    place = event.placePrediction.toPlace();
  }

  if (!place) {
    return null;
  }

  if (typeof place.fetchFields === "function") {
    await place.fetchFields({ fields: NEW_PLACE_FIELDS });
  }

  return place;
}

export function useGooglePlacesAutocomplete({
  apiKey,
  onPlaceSelected,
  onPlaceCleared,
  onInputValueChange,
  placeholder = DEFAULT_PLACEHOLDER,
}: UseGooglePlacesAutocompleteParams): UseGooglePlacesAutocompleteResult {
  const [containerElement, setContainerElementState] = useState<HTMLDivElement | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedGooglePlace | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceVersion, setInstanceVersion] = useState(0);
  const placeElementRef = useRef<PlaceAutocompleteElementLike | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onPlaceClearedRef = useRef(onPlaceCleared);
  const onInputValueChangeRef = useRef(onInputValueChange);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    onPlaceClearedRef.current = onPlaceCleared;
  }, [onPlaceCleared]);

  useEffect(() => {
    onInputValueChangeRef.current = onInputValueChange;
  }, [onInputValueChange]);

  const setContainerElement = useCallback((element: HTMLDivElement | null) => {
    setContainerElementState((previous) => (previous === element ? previous : element));
  }, []);

  const clearSelectedPlace = useCallback(() => {
    setSelectedPlace(null);
    setInstanceVersion((previous) => previous + 1);
    onPlaceClearedRef.current?.();
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setIsReady(false);
      setError("Google Maps API key is missing.");
      return;
    }

    if (!containerElement) {
      return;
    }

    let isCancelled = false;
    let mountedElement: PlaceAutocompleteElementLike | null = null;
    let onPlaceSelect: EventListener | null = null;
    let onInputValueChanged: EventListener | null = null;
    let shadowInputElement: HTMLInputElement | null = null;

    const initializeAutocomplete = async () => {
      try {
        setError(null);
        setIsReady(false);
        debugLog("initializeAutocomplete:start");
        await loadGooglePlacesScript(apiKey);

        if (isCancelled || !containerElement) {
          debugLog("initializeAutocomplete:cancelledOrNoContainer");
          return;
        }

        const importLibrary = window.google?.maps?.importLibrary;
        if (!importLibrary) {
          debugLog("initializeAutocomplete:importLibraryMissing", getGoogleRuntimeSnapshot());
          setError(
            "Google Maps JS loaded but importLibrary is unavailable. Check Maps JavaScript API is enabled + billing + key restrictions.",
          );
          return;
        }

        const placesLibrary = (await importLibrary("places")) as GooglePlacesLibrary;
        debugLog("initializeAutocomplete:placesLibraryLoaded", {
          hasPlaceAutocompleteElement: Boolean(placesLibrary?.PlaceAutocompleteElement),
        });
        const PlaceAutocompleteElement = placesLibrary?.PlaceAutocompleteElement;
        if (!PlaceAutocompleteElement) {
          setError(
            "Place Autocomplete (New) is unavailable for this key/project. Enable Places API (New) and verify API key restrictions.",
          );
          return;
        }

        while (containerElement.firstChild) {
          containerElement.removeChild(containerElement.firstChild);
        }

        const placeElement = new PlaceAutocompleteElement();
        placeElement.style.width = "100%";
        placeElement.setAttribute("aria-label", "Restaurant name");
        placeElement.setAttribute("placeholder", placeholder);

        containerElement.appendChild(placeElement);
        placeElementRef.current = placeElement;
        mountedElement = placeElement;

        const emitCurrentInputValue = () => {
          let nextValue = "";
          if (typeof placeElement.value === "string") {
            nextValue = placeElement.value;
          } else {
            const shadowInput =
              placeElement.shadowRoot?.querySelector("input");
            if (shadowInput) {
              nextValue = shadowInput.value;
            }
          }

          onInputValueChangeRef.current?.(nextValue.trim());
        };

        onPlaceSelect = async (rawEvent) => {
          try {
            const place = await resolvePlaceFromEvent(rawEvent as GooglePlaceSelectEvent);
            if (!place) {
              setError("Unable to read place selection. Please try again.");
              return;
            }

            const parsedPlace = toSelectedPlace(place);
            setSelectedPlace(parsedPlace);
            onPlaceSelectedRef.current?.(parsedPlace);
            setError(null);
            debugLog("initializeAutocomplete:placeSelected", {
              name: parsedPlace.name,
              placeId: parsedPlace.placeId,
              hasCoordinates: parsedPlace.lat !== null && parsedPlace.lng !== null,
            });
          } catch (caughtError) {
            const message =
              caughtError instanceof Error
                ? caughtError.message
                : "Unable to read selected place details.";
            setError(message);
            debugLog("initializeAutocomplete:placeSelectError", {
              message,
            });
          }
        };

        placeElement.addEventListener("gmp-placeselect", onPlaceSelect);
        // Fallback for API versions emitting "gmp-select".
        placeElement.addEventListener("gmp-select", onPlaceSelect);
        onInputValueChanged = () => {
          emitCurrentInputValue();
        };
        placeElement.addEventListener("input", onInputValueChanged);
        placeElement.addEventListener("change", onInputValueChanged);

        shadowInputElement = placeElement.shadowRoot?.querySelector("input") ?? null;
        if (shadowInputElement) {
          shadowInputElement.addEventListener("input", onInputValueChanged);
          shadowInputElement.addEventListener("change", onInputValueChanged);
        }

        setIsReady(true);
        debugLog("initializeAutocomplete:ready");
      } catch (caughtError) {
        if (!isCancelled) {
          const errorMessage =
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to initialize Place Autocomplete (New).";
          setError(errorMessage);
          debugLog("initializeAutocomplete:error", { errorMessage });
        }
      }
    };

    void initializeAutocomplete();

    return () => {
      isCancelled = true;
      setIsReady(false);

      if (mountedElement && onPlaceSelect) {
        mountedElement.removeEventListener("gmp-placeselect", onPlaceSelect);
        mountedElement.removeEventListener("gmp-select", onPlaceSelect);
      }

      if (mountedElement && onInputValueChanged) {
        mountedElement.removeEventListener("input", onInputValueChanged);
        mountedElement.removeEventListener("change", onInputValueChanged);
      }
      if (shadowInputElement && onInputValueChanged) {
        shadowInputElement.removeEventListener("input", onInputValueChanged);
        shadowInputElement.removeEventListener("change", onInputValueChanged);
      }

      if (mountedElement?.parentElement === containerElement) {
        containerElement.removeChild(mountedElement);
      }

      if (placeElementRef.current === mountedElement) {
        placeElementRef.current = null;
      }
    };
  }, [apiKey, containerElement, instanceVersion, placeholder]);

  return {
    setContainerElement,
    selectedPlace,
    clearSelectedPlace,
    isReady,
    error,
  };
}
