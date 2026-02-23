'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import {
  getCuisineCategories,
  getServiceModels,
  type CuisineTypeCategory,
  type ServiceModel,
} from '@/lib/graphql/queries';
import { FormSelectInput, FormTextInput, HelperCallout } from './form-fields';
import type { NewRestaurantFormValues } from './schema';

interface StepRestaurantInfoProps {
  control: Control<NewRestaurantFormValues>;
  register: UseFormRegister<NewRestaurantFormValues>;
  setValue: UseFormSetValue<NewRestaurantFormValues>;
  errors: FieldErrors<NewRestaurantFormValues>;
  onContinueFromPanel?: () => void | Promise<void>;
  isContinuingFromPanel?: boolean;
  panelErrorMessage?: string | null;
}

const EXISTING_BUSINESS_OPTIONS = [
  { value: 'luis-pizza', label: 'Luis Pizza GmbH' },
  { value: 'sunset-kitchen', label: 'Sunset Kitchen Group' },
  { value: 'urban-bites', label: 'Urban Bites Co.' },
];

const COUNTRY_OPTIONS = [
  { value: 'United States', label: 'United States' },
  { value: 'Germany', label: 'Germany' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'India', label: 'India' },
];

const STATE_OPTIONS = [
  { value: 'CA', label: 'CA' },
  { value: 'NY', label: 'NY' },
  { value: 'TX', label: 'TX' },
  { value: 'FL', label: 'FL' },
];

export function StepRestaurantInfo({
  control,
  register,
  setValue,
  errors,
  onContinueFromPanel,
  isContinuingFromPanel = false,
  panelErrorMessage = null,
}: StepRestaurantInfoProps) {
  const [categories, setCategories] = useState<CuisineTypeCategory[]>([]);
  const [serviceModels, setServiceModels] = useState<ServiceModel[]>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [isRegistrationPanelOpen, setIsRegistrationPanelOpen] = useState(false);

  const ownerMode =
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
  const selectedCountry =
    useWatch({
      control,
      name: 'country',
    }) ?? '';
  const selectedState =
    useWatch({
      control,
      name: 'state',
    }) ?? '';

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const {
    setContainerElement,
    selectedPlace,
    clearSelectedPlace,
    isReady: isPlacesReady,
    error: placesError,
  } = useGooglePlacesAutocomplete({
    apiKey: mapsApiKey,
    placeholder: 'Enter restaurant name',
    onInputValueChange: (value) => {
      setValue('restaurantName', value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    onPlaceSelected: (place) => {
      setValue('restaurantName', place.name, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('address', place.address, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('city', place.city, { shouldDirty: true, shouldValidate: true });
      setValue('postalCode', place.postalCode, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('country', place.country, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('state', place.state, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('googlePlaceId', place.placeId, { shouldDirty: true });
      setValue('googlePlaceName', place.name, { shouldDirty: true });
      setValue('googleLat', place.lat);
      setValue('googleLng', place.lng);
    },
    onPlaceCleared: () => {
      setValue('restaurantName', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('address', '', { shouldDirty: true, shouldValidate: true });
      setValue('city', '', { shouldDirty: true, shouldValidate: true });
      setValue('postalCode', '', { shouldDirty: true, shouldValidate: true });
      setValue('country', '', { shouldDirty: true, shouldValidate: true });
      setValue('state', '', { shouldDirty: true, shouldValidate: true });
      setValue('googlePlaceId', '');
      setValue('googlePlaceName', '');
      setValue('googleLat', null);
      setValue('googleLng', null);
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
    if (!isRegistrationPanelOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isRegistrationPanelOpen]);

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

  const countryOptions = useMemo(
    () => mergeSelectOptions(COUNTRY_OPTIONS, selectedCountry),
    [selectedCountry],
  );
  const stateOptions = useMemo(
    () => mergeSelectOptions(STATE_OPTIONS, selectedState),
    [selectedState],
  );
  const serviceModelError =
    typeof errors.selectedServiceModelId?.message === 'string'
      ? errors.selectedServiceModelId.message
      : undefined;
  const restaurantNameError =
    typeof errors.restaurantName?.message === 'string'
      ? errors.restaurantName.message
      : undefined;
  const restaurantNameRegistration = register('restaurantName');
  const shouldUseManualRestaurantNameInput = Boolean(placesError);

  const onChooseCreateRestaurant = () => {
    setValue('ownerProfileMode', 'create', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('existingBusinessProfile', '');
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
        <HelperCallout>
          Choose whether you want to add a new restaurant entry or use an
          existing restaurant profile.
        </HelperCallout>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onChooseCreateRestaurant}
            className={cx(
              'rounded-xl border px-4 py-2 text-sm font-semibold transition',
              ownerMode === 'create'
                ? 'border-[#66c98a] bg-[#dff3e5] text-[#2f874f]'
                : 'border-[#d3e0e6] bg-white text-[#334155] hover:bg-[#f6faf8]',
            )}
          >
            + Add new restaurant
          </button>
          <button
            type="button"
            onClick={onChooseExistingRestaurant}
            className={cx(
              'rounded-xl border px-4 py-2 text-sm font-semibold transition',
              ownerMode === 'existing'
                ? 'border-[#66c98a] bg-[#dff3e5] text-[#2f874f]'
                : 'border-[#d3e0e6] bg-white text-[#334155] hover:bg-[#f6faf8]',
            )}
          >
            Existing restaurant
          </button>
        </div>

        {ownerMode === 'existing' ? (
          <div className="max-w-sm">
            <FormSelectInput
              label=""
              name="existingBusinessProfile"
              register={register}
              errors={errors}
              placeholder="Search business..."
              options={EXISTING_BUSINESS_OPTIONS}
            />
          </div>
        ) : (
          <p className="text-sm text-[#647384]">
            Click <span className="font-semibold">+ Add new restaurant</span> to
            open the registration panel.
          </p>
        )}
      </div>

      {ownerMode === 'create' ? (
        <>
          <div
            aria-hidden={!isRegistrationPanelOpen}
            onClick={() => setIsRegistrationPanelOpen(false)}
            className={cx(
              'fixed inset-0 z-40 bg-[#0f172a]/25 transition-opacity duration-300',
              isRegistrationPanelOpen
                ? 'opacity-100'
                : 'pointer-events-none opacity-0',
            )}
          />

          <aside
            aria-hidden={!isRegistrationPanelOpen}
            className={cx(
              'fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-[#eef3f5] transition-transform duration-300 ease-out',
              isRegistrationPanelOpen
                ? 'translate-x-0'
                : 'pointer-events-none -translate-x-full',
            )}
          >
            <div className="sticky top-0 z-10 flex items-center border-b border-[#d7e2e6] bg-white/95 px-4 py-3 backdrop-blur">
              <button
                type="button"
                onClick={() => setIsRegistrationPanelOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e3e8] text-[#4c6073] transition hover:bg-[#f4f8fa]"
                aria-label="Close add restaurant panel"
              >
                <PanelCloseIcon />
              </button>
              <h4 className="ml-3 text-[22px] font-semibold tracking-tight text-[#111827]">
                Add New Restaurant
              </h4>
            </div>

            <div className="mx-auto w-full max-w-[980px] px-6 py-7 md:px-10">
              <div className="space-y-7 rounded-2xl border border-[#d7e2e6] bg-[#f8fafb] p-6">
                <div className="space-y-5">
                  <div>
                    <h5 className="text-[22px] font-semibold text-[#111827]">
                      Basic Information
                    </h5>
                    <p className="text-[16px] text-[#556678]">
                      Enter the restaurant&apos;s basic details and contact
                      information
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-base font-medium text-[#111827]">
                      <span className="mr-1 text-[#ef5350]">*</span>
                      Restaurant name
                    </label>
                    <input type="hidden" {...restaurantNameRegistration} />
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
                      {shouldUseManualRestaurantNameInput ? (
                        <input
                          type="text"
                          value={restaurantNameValue}
                          onChange={(event) =>
                            onManualRestaurantNameChange(event.target.value)
                          }
                          placeholder="Enter restaurant name"
                          className="w-full bg-transparent px-3 py-3 text-[16px] text-[#111827] placeholder:text-[#8ea0af] focus:outline-none"
                        />
                      ) : (
                        <div
                          ref={setContainerElement}
                          className="w-full px-2 py-1"
                        />
                      )}
                    </div>
                    {restaurantNameError ? (
                      <p className="text-xs text-[#d83f3f]">
                        {restaurantNameError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#526274]">
                    <span>Can&apos;t find the place in the list?</span>
                    <button
                      type="button"
                      onClick={onResetPlaceCategories}
                      className="font-medium text-[#49bb76] hover:text-[#34a560]"
                    >
                      Reset place categories
                    </button>
                    {shouldUseManualRestaurantNameInput ? (
                      <span className="text-[#b45309]">
                        Google Places unavailable. Enter details manually.
                      </span>
                    ) : null}
                    {!isPlacesReady && mapsApiKey && !placesError ? (
                      <span className="text-[#8a97a3]">
                        (Loading places...)
                      </span>
                    ) : null}
                  </div>

                  {selectedPlace && !shouldUseManualRestaurantNameInput ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#cde7d7] bg-[#edf8f1] px-3 py-2 text-sm text-[#2d7a4b]">
                      <span className="truncate">
                        Selected google place: {selectedPlace.name}
                      </span>
                      <button
                        type="button"
                        onClick={clearSelectedPlace}
                        aria-label="Clear selected google place"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#9dcbb0] text-[#2d7a4b] transition hover:bg-[#e1f4e8]"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ) : null}

                  {placesError ? (
                    <p className="text-sm text-[#cf4545]">{placesError}</p>
                  ) : null}

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
                    <FormSelectInput
                      label="State"
                      name="state"
                      register={register}
                      errors={errors}
                      required
                      placeholder="Select state"
                      options={stateOptions}
                    />
                  </div>

                  {/* <label className="flex items-center gap-3 text-[16px] text-[#1f2937]">
                    <input
                      type="checkbox"
                      {...register('isPartOfFranchise')}
                      className="h-5 w-5 rounded border-[#cbd8e0] text-[#66c98a] focus:ring-[#66c98a]"
                    />
                    Restaurant is part of the franchise
                  </label> */}
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-[22px] font-semibold text-[#111827]">
                      Food Categories &amp; Cuisine Types
                    </h5>
                    <p className="text-[16px] text-[#556678]">
                      Select all food categories and cuisine types that apply to
                      this restaurant
                    </p>
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
                          className="inline-flex items-center gap-1 rounded-full bg-[#e3f4e9] px-3 py-1 text-sm font-medium text-[#2f874f]"
                        >
                          {selectedCuisineLookup.get(id) ?? 'Cuisine'}
                          <button
                            type="button"
                            onClick={() => onCuisineTypeToggle(id)}
                            className="rounded-full p-0.5 hover:bg-[#cdecd8]"
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
                      const isExpanded =
                        expandedCategories[category.id] ?? false;

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
                                const isSelected =
                                  selectedCuisineTypeIds.includes(type.id);

                                return (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => onCuisineTypeToggle(type.id)}
                                    className={cx(
                                      'rounded-lg border px-3 py-2 text-left text-sm transition',
                                      isSelected
                                        ? 'border-[#62c986] bg-[#dff3e5] text-[#2f874f]'
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
                  <div>
                    <h5 className="text-[22px] font-semibold text-[#111827]">
                      Restaurant Type &amp; Service Model
                    </h5>
                    <p className="text-[16px] text-[#556678]">
                      Choose the format that best describes this
                      restaurant&apos;s service style
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {serviceModels.map((serviceModel) => {
                      const isSelected =
                        selectedServiceModelId === serviceModel.id;

                      return (
                        <button
                          key={serviceModel.id}
                          type="button"
                          onClick={() => onServiceModelSelect(serviceModel)}
                          className={cx(
                            'rounded-xl border p-4 text-left transition',
                            isSelected
                              ? 'border-[#66c98a] bg-[#dff3e5]'
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
                    <p className="text-xs text-[#d83f3f]">
                      {serviceModelError}
                    </p>
                  ) : null}
                </div>

                {/* <div className="space-y-4">
                  <h5 className="text-[22px] font-semibold text-[#111827]">Additional Options</h5>
                  <button
                    type="button"
                    onClick={() => setValue("importMenu", !importMenu, { shouldDirty: true })}
                    className="inline-flex items-center gap-3 text-[16px] font-medium text-[#16202a]"
                  >
                    <span
                      className={cx(
                        "relative inline-flex h-7 w-12 rounded-full transition",
                        importMenu ? "bg-[#66c98a]" : "bg-[#cfd7dd]",
                      )}
                    >
                      <span
                        className={cx(
                          "absolute top-1 h-5 w-5 rounded-full bg-white transition",
                          importMenu ? "left-6" : "left-1",
                        )}
                      />
                    </span>
                    Import menu
                  </button>
                </div> */}

                <div className="flex items-center justify-end border-t border-[#d7e2e6] pt-5">
                  {panelErrorMessage ? (
                    <p className="mr-auto rounded-lg border border-[#f2c7c7] bg-[#fff5f5] px-3 py-2 text-xs text-[#b33838]">
                      {panelErrorMessage}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void onContinueFromPanel?.()}
                    disabled={isContinuingFromPanel}
                    className="rounded-xl bg-[#60c783] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#55bb77] disabled:cursor-not-allowed disabled:bg-[#c7d8ce]"
                  >
                    {isContinuingFromPanel ? "Saving..." : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
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
