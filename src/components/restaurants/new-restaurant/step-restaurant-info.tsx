'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import {
  useGooglePlacesAutocomplete,
  type SelectedGooglePlace,
} from '@/hooks/useGooglePlacesAutocomplete';
import {
  getCuisineCategories,
  getFranchises,
  getServiceModels,
  type CuisineTypeCategory,
  type FranchiseListItem,
  type ServiceModel,
} from '@/lib/graphql/queries';
import { FormSelectInput, FormTextInput, HelperCallout } from './form-fields';
import type { NewRestaurantFormValues } from './schema';

interface StepRestaurantInfoProps {
  control: Control<NewRestaurantFormValues>;
  register: UseFormRegister<NewRestaurantFormValues>;
  setValue: UseFormSetValue<NewRestaurantFormValues>;
  errors: FieldErrors<NewRestaurantFormValues>;
  openRegistrationPanelToken?: number;
  onRegistrationPanelOpenChange?: (isOpen: boolean) => void;
}

const COUNTRY_OPTIONS = [
  { value: 'United States', label: 'United States' },
  { value: 'Germany', label: 'Germany' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'India', label: 'India' },
];

const ENABLE_EXISTING_FRANCHISE = false;

export function StepRestaurantInfo({
  control,
  register,
  setValue,
  errors,
  openRegistrationPanelToken = 0,
  onRegistrationPanelOpenChange,
}: StepRestaurantInfoProps) {
  const [categories, setCategories] = useState<CuisineTypeCategory[]>([]);
  const [serviceModels, setServiceModels] = useState<ServiceModel[]>([]);
  const [franchises, setFranchises] = useState<FranchiseListItem[]>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isFranchisesLoading, setIsFranchisesLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [franchiseError, setFranchiseError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [franchiseSearchTerm, setFranchiseSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [isRegistrationPanelOpen, setIsRegistrationPanelOpen] = useState(false);

  const mode =
    useWatch({
      control,
      name: 'ownerProfileMode',
    }) ?? 'create';

  const selectedCuisineTypeIds = useWatch({
    control,
    name: 'selectedCuisineTypeIds',
    defaultValue: [] as string[],
  });

  const selectedServiceModelId =
    useWatch({
      control,
      name: 'selectedServiceModelId',
    }) ?? '';

  const restaurantNameValue =
    useWatch({
      control,
      name: 'restaurantName',
    }) ?? '';

  const franchiseNameValue =
    useWatch({
      control,
      name: 'franchiseName',
    }) ?? '';

  const selectedFranchiseId =
    useWatch({
      control,
      name: 'selectedFranchiseId',
    }) ?? '';

  const selectedCountry =
    useWatch({
      control,
      name: 'country',
    }) ?? '';

  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const hasGoogleMapsApiKey = googleMapsApiKey.length > 0;

  const applySelectedPlaceToForm = useCallback(
    (place: SelectedGooglePlace) => {
      const normalizedCountry = normalizeCountryName(place.country);

      setValue('restaurantName', place.name, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setValue('googlePlaceId', place.placeId, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue('googlePlaceName', place.name, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue('googleLat', place.lat, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue('googleLng', place.lng, {
        shouldDirty: true,
        shouldValidate: false,
      });

      if (place.address) {
        setValue('address', place.address, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (place.city) {
        setValue('city', place.city, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (place.postalCode) {
        setValue('postalCode', place.postalCode, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (normalizedCountry) {
        setValue('country', normalizedCountry, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (place.state) {
        setValue('state', normalizeStateValue(place.state, normalizedCountry), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [setValue],
  );

  const {
    setContainerElement,
    selectedPlace,
    clearSelectedPlace,
    isReady: isGooglePlacesReady,
    error: googlePlacesError,
  } = useGooglePlacesAutocomplete({
    apiKey: hasGoogleMapsApiKey ? googleMapsApiKey : undefined,
    onPlaceSelected: applySelectedPlaceToForm,
    onPlaceCleared: () => {
      setValue('googlePlaceId', '', {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue('googlePlaceName', '', {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue('googleLat', null, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue('googleLng', null, {
        shouldDirty: true,
        shouldValidate: false,
      });
    },
    onInputValueChange: (value) => {
      setValue('restaurantName', value, {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (!selectedPlace) {
        return;
      }

      const normalizedInput = value.trim().toLowerCase();
      const normalizedSelectedName = selectedPlace.name.trim().toLowerCase();
      if (!normalizedInput || !normalizedSelectedName) {
        return;
      }

      // Keep place id while autocomplete text still references selected place.
      if (normalizedInput.includes(normalizedSelectedName)) {
        return;
      }

      clearSelectedPlace();
    },
  });

  useEffect(() => {
    let isActive = true;

    const loadMetadata = async () => {
      try {
        setIsMetadataLoading(true);
        setMetadataError(null);

        const [fetchedCategories, fetchedServiceModels] = await Promise.all([
          getCuisineCategories(),
          getServiceModels(),
        ]);

        if (!isActive) {
          return;
        }

        setCategories(fetchedCategories);
        setServiceModels(fetchedServiceModels);

        if (fetchedCategories[0]) {
          setExpandedCategories((previous) => ({
            ...previous,
            [fetchedCategories[0].id]:
              previous[fetchedCategories[0].id] ?? true,
          }));
        }
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load cuisine categories and service models.';
        setMetadataError(message);
      } finally {
        if (isActive) {
          setIsMetadataLoading(false);
        }
      }
    };

    void loadMetadata();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!ENABLE_EXISTING_FRANCHISE) {
      setIsFranchisesLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadFranchises = async () => {
      try {
        setIsFranchisesLoading(true);
        setFranchiseError(null);
        const fetchedFranchises = await getFranchises();

        if (!isActive) {
          return;
        }

        setFranchises(fetchedFranchises);
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load franchises.';
        setFranchiseError(message);
      } finally {
        if (isActive) {
          setIsFranchisesLoading(false);
        }
      }
    };

    void loadFranchises();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (ENABLE_EXISTING_FRANCHISE || mode !== 'existing') {
      return;
    }

    setValue('ownerProfileMode', 'create', {
      shouldDirty: false,
      shouldValidate: false,
    });
    setValue('selectedFranchiseId', '', {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [mode, setValue]);

  useEffect(() => {
    if (!openRegistrationPanelToken) {
      return;
    }

    setIsRegistrationPanelOpen(true);
  }, [openRegistrationPanelToken]);

  useEffect(() => {
    onRegistrationPanelOpenChange?.(isRegistrationPanelOpen);
  }, [isRegistrationPanelOpen, onRegistrationPanelOpenChange]);

  useEffect(() => {
    if (
      mode === 'create' &&
      !franchiseNameValue.trim() &&
      restaurantNameValue.trim()
    ) {
      setValue('franchiseName', restaurantNameValue, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [franchiseNameValue, mode, restaurantNameValue, setValue]);

  const selectedCuisineLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    categories.forEach((category) => {
      category.cuisineTypes.forEach((type) => {
        lookup.set(type.id, type.label);
      });
    });
    return lookup;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return categories;
    }

    return categories
      .map((category) => {
        const categoryMatches = category.label
          .toLowerCase()
          .includes(normalizedSearch);
        const filteredTypes = category.cuisineTypes.filter((type) =>
          type.label.toLowerCase().includes(normalizedSearch),
        );

        if (!categoryMatches && !filteredTypes.length) {
          return null;
        }

        return {
          ...category,
          cuisineTypes: categoryMatches ? category.cuisineTypes : filteredTypes,
        };
      })
      .filter((category): category is CuisineTypeCategory => category !== null);
  }, [categories, searchTerm]);

  const filteredFranchises = useMemo(() => {
    const normalizedSearch = franchiseSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return franchises;
    }

    return franchises.filter((franchise) =>
      franchise.name.toLowerCase().includes(normalizedSearch),
    );
  }, [franchiseSearchTerm, franchises]);

  const countryOptions = useMemo(
    () => mergeSelectOptions(COUNTRY_OPTIONS, selectedCountry),
    [selectedCountry],
  );

  const serviceModelError =
    typeof errors.selectedServiceModelId?.message === 'string'
      ? errors.selectedServiceModelId.message
      : undefined;

  const restaurantNameError =
    typeof errors.restaurantName?.message === 'string'
      ? errors.restaurantName.message
      : undefined;

  const selectedFranchiseError =
    typeof errors.selectedFranchiseId?.message === 'string'
      ? errors.selectedFranchiseId.message
      : undefined;

  const restaurantNameRegistration = register('restaurantName');

  const onChooseCreateRestaurant = () => {
    setValue('ownerProfileMode', 'create', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('selectedFranchiseId', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIsRegistrationPanelOpen(true);
  };

  const onChooseExistingRestaurant = () => {
    setValue('ownerProfileMode', 'existing', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIsRegistrationPanelOpen(false);
  };

  const onCuisineTypeToggle = (cuisineTypeId: string) => {
    const isSelected = selectedCuisineTypeIds.includes(cuisineTypeId);
    const updatedCuisineTypeIds = isSelected
      ? selectedCuisineTypeIds.filter((id) => id !== cuisineTypeId)
      : [...selectedCuisineTypeIds, cuisineTypeId];

    const updatedCuisineTypeLabels = updatedCuisineTypeIds
      .map((id) => selectedCuisineLookup.get(id))
      .filter((label): label is string => Boolean(label));

    setValue('selectedCuisineTypeIds', updatedCuisineTypeIds, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue('selectedCuisineTypeLabels', updatedCuisineTypeLabels, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onServiceModelSelect = (serviceModel: ServiceModel) => {
    setValue('selectedServiceModelId', serviceModel.id, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue('selectedServiceModelName', serviceModel.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onResetPlaceCategories = () => {
    setValue('selectedCuisineTypeIds', [], {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue('selectedCuisineTypeLabels', [], {
      shouldDirty: true,
      shouldValidate: true,
    });

    setSearchTerm('');
  };

  const onManualRestaurantNameChange = (value: string) => {
    setValue('restaurantName', value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue('googlePlaceId', '');
    setValue('googlePlaceName', '');
    setValue('googleLat', null);
    setValue('googleLng', null);
  };

  const onFranchiseChange = (franchiseId: string) => {
    setValue('selectedFranchiseId', franchiseId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  useEffect(() => {
    if (!selectedCuisineTypeIds.length) {
      setValue('selectedCuisineTypeLabels', [], {
        shouldValidate: false,
        shouldDirty: false,
      });
      return;
    }

    const cuisineLabels = selectedCuisineTypeIds
      .map((id) => selectedCuisineLookup.get(id))
      .filter((label): label is string => Boolean(label));

    setValue('selectedCuisineTypeLabels', cuisineLabels, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [selectedCuisineLookup, selectedCuisineTypeIds, setValue]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-[22px] font-semibold tracking-tight text-[#111827]">
            Restaurant Setup
          </h3>
        {ENABLE_EXISTING_FRANCHISE ? (
          <HelperCallout>
            Choose whether you are creating a new franchise with its first
            restaurant or adding this restaurant to an existing franchise.
          </HelperCallout>
        ) : (
          <HelperCallout>
            Create a new restaurant.
          </HelperCallout>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onChooseCreateRestaurant}
            className={cx(
              'inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all',
              mode === 'create'
                ? 'border-purple-500 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md hover:shadow-lg'
                : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50',
            )}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add new restaurant
          </button>
          {ENABLE_EXISTING_FRANCHISE ? (
            <button
              type="button"
              onClick={onChooseExistingRestaurant}
              className={cx(
                'inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all',
                mode === 'existing'
                  ? 'border-purple-500 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md hover:shadow-lg'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50',
              )}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Existing franchise
            </button>
          ) : null}
        </div>

        {ENABLE_EXISTING_FRANCHISE && mode === 'existing' ? (
          <>
            <div className="max-w-md space-y-2">
              <label className="block text-base font-medium text-[#111827]">
                <span className="mr-1 text-[#ef5350]">*</span>
                Select existing franchise
              </label>

              <input type="hidden" {...register('selectedFranchiseId')} />

              <div className="rounded-xl border border-[#d4e0e6] bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-[#8fa0ad]">
                  <SearchIcon />
                  <input
                    type="text"
                    value={franchiseSearchTerm}
                    onChange={(event) =>
                      setFranchiseSearchTerm(event.target.value)
                    }
                    placeholder="Search franchise"
                    className="h-7 w-full bg-transparent text-sm text-[#111827] placeholder:text-[#9badba] focus:outline-none"
                  />
                </div>
              </div>

              <select
                value={selectedFranchiseId}
                onChange={(event) => onFranchiseChange(event.target.value)}
                className={cx(
                  'h-12 w-full rounded-xl border bg-white px-3 text-base text-[#101827] focus:outline-none',
                  selectedFranchiseError
                    ? 'border-[#e57373] shadow-[0_0_0_2px_rgba(229,115,115,0.08)]'
                    : 'border-[#d4e0e6]',
                )}
              >
                <option value="">Select franchise</option>
                {filteredFranchises.map((franchise) => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>

              {isFranchisesLoading ? (
                <p className="text-xs text-[#647384]">Loading franchises...</p>
              ) : null}

              {franchiseError ? (
                <p className="text-xs text-[#d83f3f]">{franchiseError}</p>
              ) : null}

              {selectedFranchiseError ? (
                <p className="text-xs text-[#d83f3f]">
                  {selectedFranchiseError}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsRegistrationPanelOpen(true)}
              className="inline-flex rounded-lg border border-[#d3e0e6] bg-white px-3 py-1.5 text-sm font-medium text-[#334155] hover:bg-[#f7fafc]"
            >
              Open restaurant registration panel
            </button>
          </>
        ) : null}
      </div>

      {isRegistrationPanelOpen ? (
        <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="text-xl font-bold tracking-tight text-gray-900">
                Restaurant Details
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsRegistrationPanelOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              aria-label="Close add restaurant form"
            >
              <PanelCloseIcon />
            </button>
          </div>

          <div className="space-y-8">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="text-lg font-bold text-gray-900">
                    Basic Information
                  </h5>
                  <p className="text-sm text-gray-600">
                    Enter the restaurant location details and registration data.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-base font-medium text-[#111827]">
                  <span className="mr-1 text-[#ef5350]">*</span>
                  Restaurant name
                </label>
                <input type="hidden" {...restaurantNameRegistration} />
                {hasGoogleMapsApiKey && !googlePlacesError ? (
                  <div
                    className={cx(
                      'flex min-h-12 items-center rounded-xl border bg-white px-3 py-2',
                      restaurantNameError
                        ? 'border-[#e57373] shadow-[0_0_0_2px_rgba(229,115,115,0.08)]'
                        : 'border-[#d4e0e6]',
                    )}
                  >
                    <div className="mr-3 flex items-center gap-2 border-r border-[#d6e0e5] pr-3">
                      <StoreIcon />
                    </div>
                    <div ref={setContainerElement} className="w-full" />
                  </div>
                ) : (
                  <div
                    className={cx(
                      'flex min-h-12 items-center rounded-xl border bg-white',
                      restaurantNameError
                        ? 'border-[#e57373] shadow-[0_0_0_2px_rgba(229,115,115,0.08)]'
                        : 'border-[#d4e0e6]',
                    )}
                  >
                    <div className="ml-3 flex items-center gap-2 border-r border-[#d6e0e5] pr-3">
                      <StoreIcon />
                    </div>
                    <input
                      type="text"
                      value={restaurantNameValue}
                      onChange={(event) =>
                        onManualRestaurantNameChange(event.target.value)
                      }
                      placeholder="Enter restaurant name"
                      className="w-full bg-transparent px-3 py-3 text-[16px] text-[#111827] placeholder:text-[#8ea0af] focus:outline-none"
                    />
                  </div>
                )}
                {restaurantNameError ? (
                  <p className="text-xs text-[#d83f3f]">
                    {restaurantNameError}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Can&apos;t find the place?</span>
                  <button
                    type="button"
                    onClick={onResetPlaceCategories}
                    className="font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Reset categories
                  </button>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  {hasGoogleMapsApiKey ? (
                    <>
                      {/* {isGooglePlacesReady && !googlePlacesError ? (
                        <div className="flex items-center gap-2 text-purple-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Google Places enabled. Select to autofill details.</span>
                        </div>
                      ) : null} */}
                      {!isGooglePlacesReady && !googlePlacesError ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading Google Places...</span>
                        </div>
                      ) : null}
                      {googlePlacesError ? (
                        <div className="flex items-center gap-2 text-amber-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Google Places unavailable. Enter details manually.</span>
                        </div>
                      ) : null}
                      {/* {selectedPlace ? (
                        <button
                          type="button"
                          onClick={clearSelectedPlace}
                          className="font-semibold text-gray-700 hover:text-gray-900 hover:underline"
                        >
                          Clear selected place
                        </button>
                      ) : null} */}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Google Places disabled. Enter details manually.</span>
                    </div>
                  )}
                </div>
              </div>

              <FormTextInput
                label="Address"
                name="address"
                register={register}
                errors={errors}
                required
                placeholder="Street + number"
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormTextInput
                  label="City"
                  name="city"
                  register={register}
                  errors={errors}
                  required
                  placeholder="City"
                />
                <FormTextInput
                  label="Postal code"
                  name="postalCode"
                  register={register}
                  errors={errors}
                  required
                  placeholder="Postal code"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormSelectInput
                  label="Country"
                  name="country"
                  register={register}
                  errors={errors}
                  required
                  placeholder="Select country"
                  options={countryOptions}
                />
                <FormTextInput
                  label="State / Province"
                  name="state"
                  register={register}
                  errors={errors}
                  required
                  placeholder="State or province"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="text-lg font-bold text-gray-900">
                    Food Categories &amp; Cuisine Types
                  </h5>
                  <p className="text-sm text-gray-600">
                    Select all food categories and cuisine types that apply to this restaurant.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#d3dfe6] bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-[#8fa0ad]">
                  <SearchIcon />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search cuisine types"
                    className="h-7 w-full bg-transparent text-sm text-[#111827] placeholder:text-[#9badba] focus:outline-none"
                  />
                </div>
              </div>

              {selectedCuisineTypeIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCuisineTypeIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-[#ede9fe] px-3 py-1 text-sm font-medium text-[#5b21b6]"
                    >
                      {selectedCuisineLookup.get(id) ?? 'Cuisine'}
                      <button
                        type="button"
                        onClick={() => onCuisineTypeToggle(id)}
                        className="rounded-full p-0.5 hover:bg-[#ddd6fe]"
                        aria-label="Remove cuisine selection"
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-[#d3dfe6] bg-white">
                {isMetadataLoading ? (
                  <p className="px-4 py-3 text-sm text-[#7a8997]">
                    Loading cuisines and service models...
                  </p>
                ) : null}

                {metadataError ? (
                  <p className="px-4 py-3 text-sm text-[#cf4545]">
                    {metadataError}
                  </p>
                ) : null}

                {!isMetadataLoading &&
                !metadataError &&
                !filteredCategories.length ? (
                  <p className="px-4 py-3 text-sm text-[#7a8997]">
                    No cuisine categories found.
                  </p>
                ) : null}

                {filteredCategories.map((category) => {
                  const isExpanded = expandedCategories[category.id] ?? false;

                  return (
                    <div
                      key={category.id}
                      className="border-b border-[#dce5eb] last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategories((previous) => ({
                            ...previous,
                            [category.id]: !isExpanded,
                          }))
                        }
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[18px] font-medium text-[#16202a] hover:bg-[#f7fafb]"
                      >
                        <ChevronRightIcon isExpanded={isExpanded} />
                        {category.label}
                      </button>

                      {isExpanded ? (
                        <div className="grid gap-3 border-t border-[#e1e8ed] p-4 md:grid-cols-3">
                          {category.cuisineTypes.map((type) => {
                            const isSelected = selectedCuisineTypeIds.includes(
                              type.id,
                            );

                            return (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => onCuisineTypeToggle(type.id)}
                                className={cx(
                                  'rounded-lg border px-3 py-2 text-left text-sm transition',
                                  isSelected
                                    ? 'border-[#667eea] bg-[#ede9fe] text-[#5b21b6]'
                                    : 'border-[#d5e0e7] bg-white text-[#1f2937] hover:bg-[#f8fbfc]',
                                )}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="text-lg font-bold text-gray-900">
                    Restaurant Type &amp; Service Model
                  </h5>
                  <p className="text-sm text-gray-600">
                    Choose the format that best describes this restaurant&apos;s service style.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {serviceModels.map((serviceModel) => {
                  const isSelected = selectedServiceModelId === serviceModel.id;

                  return (
                    <button
                      key={serviceModel.id}
                      type="button"
                      onClick={() => onServiceModelSelect(serviceModel)}
                      className={cx(
                        'rounded-xl border p-4 text-left transition',
                        isSelected
                          ? 'border-[#667eea] bg-[#ede9fe]'
                          : 'border-[#d5e0e7] bg-white hover:bg-[#f9fbfc]',
                      )}
                    >
                      <p className="text-[16px] font-semibold text-[#111827]">
                        {serviceModel.name}
                      </p>
                      {serviceModel.description ? (
                        <p className="mt-1 text-sm text-[#5b6b79]">
                          {serviceModel.description}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {serviceModelError ? (
                <p className="text-xs text-[#d83f3f]">{serviceModelError}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function mergeSelectOptions(
  options: Array<{ value: string; label: string }>,
  selectedValue: string,
) {
  if (
    !selectedValue ||
    options.some((option) => option.value === selectedValue)
  ) {
    return options;
  }

  return [{ value: selectedValue, label: selectedValue }, ...options];
}

function normalizeCountryName(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  const code = normalized.toUpperCase();
  if (code === 'US' || code === 'USA') {
    return 'United States';
  }
  if (code === 'DE') {
    return 'Germany';
  }
  if (code === 'GB' || code === 'UK') {
    return 'United Kingdom';
  }
  if (code === 'IN') {
    return 'India';
  }

  return normalized;
}

function normalizeStateValue(value: string, country: string) {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  if (country === 'United States' && normalized.length <= 3) {
    return normalized.toUpperCase();
  }

  return normalized;
}

function StoreIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5h17L19 12.4a2.5 2.5 0 0 1-2.4 1.8H7.4A2.5 2.5 0 0 1 5 12.4L3.5 8.5Z" />
      <path d="M6 14.2V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4.8" />
      <path d="M9 17h6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6 18 18" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function PanelCloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6 18 18" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function ChevronRightIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition ${isExpanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}
