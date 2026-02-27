'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StepBusinessInfo } from './step-business-info';
import { FormError, FormSuccess } from './form-feedback';
import { StepRestaurantInfo } from './step-restaurant-info';
import {
  STEP_ONE_FIELDS,
  STEP_TWO_FIELDS,
  newRestaurantSchema,
  stepOneSchema,
  stepTwoSchema,
  type NewRestaurantFormValues,
} from './schema';
import { Stepper } from './stepper';
import {
  getRestaurants,
  getRestaurantDraftById,
  insertFranchise,
  insertRestaurant,
  replaceRestaurantGoogleReviews,
  updateFranchiseOwner,
  updateRestaurant,
} from '@/lib/graphql/queries';
import { nhost } from '@/lib/nhost';

type WizardStep = 1 | 2;
type WizardMode = 'create' | 'existing';
type RecentRestaurantCard = {
  id: string;
  name: string;
  address: string;
  hasGooglePlace: boolean;
  createdAt: string | null;
};
const MAX_RECENT_RESTAURANTS = 4;

const IS_DEV = process.env.NODE_ENV !== 'production';
const DRAFT_QUERY_PARAM = 'draft';
const STEP_QUERY_PARAM = 'step';
const FRANCHISE_QUERY_PARAM = 'franchise';
const MODE_QUERY_PARAM = 'mode';

const DEFAULT_FORM_VALUES: NewRestaurantFormValues = {
  ownerProfileMode: 'create',
  franchiseName: '',
  selectedFranchiseId: '',
  googlePlaceId: '',
  googlePlaceName: '',
  googleLat: null,
  googleLng: null,
  selectedCuisineTypeIds: [],
  selectedCuisineTypeLabels: [],
  selectedServiceModelId: '',
  selectedServiceModelName: '',
  isPartOfFranchise: false,
  importMenu: false,
  businessType: '',
  restaurantName: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  state: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  deploymentEnvironment: 'staging',
  ownerEmail: '',
  ownerPassword: '',
  ownerDisplayName: '',
  ownerIsLocationPoc: false,
};

function debugLog(label: string, data?: unknown) {
  if (!IS_DEV) {
    return;
  }

  if (typeof data === 'undefined') {
    console.info(`[restaurant-wizard] ${label}`);
    return;
  }

  console.info(`[restaurant-wizard] ${label}`, data);
}

export function NewRestaurantWizard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [primaryRestaurantId, setPrimaryRestaurantId] = useState<string | null>(
    null,
  );
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [wizardMode, setWizardMode] = useState<WizardMode | null>(null);
  const [recentlyCreatedRestaurants, setRecentlyCreatedRestaurants] = useState<
    RecentRestaurantCard[]
  >([]);
  const [isLoadingRecentRestaurants, setIsLoadingRecentRestaurants] =
    useState(false);
  const [isStepOneRegistrationOpen, setIsStepOneRegistrationOpen] =
    useState(false);
  const [createdToastMessage, setCreatedToastMessage] = useState<string | null>(
    null,
  );
  const [isCreatedToastVisible, setIsCreatedToastVisible] = useState(false);
  const [isSavingStepOne, setIsSavingStepOne] = useState(false);
  const [isSavingStepTwo, setIsSavingStepTwo] = useState(false);
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const hasInitializedFromRouteRef = useRef(false);
  const createdToastTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>(
    [],
  );

  const {
    control,
    register,
    reset,
    clearErrors,
    setError,
    setFocus,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<NewRestaurantFormValues>({
    resolver: zodResolver(newRestaurantSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watchedValues = useWatch({ control });

  const isStepOneComplete = useMemo(
    () => stepOneSchema.safeParse(watchedValues).success,
    [watchedValues],
  );

  const isStepTwoComplete = useMemo(
    () => stepTwoSchema.safeParse(watchedValues).success,
    [watchedValues],
  );

  const isBusy = isSavingStepOne || isSavingStepTwo || isHydratingDraft;

  const clearCreatedToastTimers = useCallback(() => {
    createdToastTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    createdToastTimeoutsRef.current = [];
  }, []);

  const showCreatedToast = useCallback(
    (restaurantName: string) => {
      clearCreatedToastTimers();
      setCreatedToastMessage(
        `${restaurantName.trim() || 'Restaurant'} created successfully.`,
      );
      setIsCreatedToastVisible(false);

      createdToastTimeoutsRef.current.push(
        setTimeout(() => {
          setIsCreatedToastVisible(true);
        }, 30),
      );

      createdToastTimeoutsRef.current.push(
        setTimeout(() => {
          setIsCreatedToastVisible(false);
        }, 2750),
      );

      createdToastTimeoutsRef.current.push(
        setTimeout(() => {
          setCreatedToastMessage(null);
        }, 3150),
      );
    },
    [clearCreatedToastTimers],
  );

  const upsertRecentlyCreatedRestaurant = useCallback(
    (restaurant: RecentRestaurantCard) => {
      setRecentlyCreatedRestaurants((previous) =>
        [restaurant, ...previous.filter((item) => item.id !== restaurant.id)]
          .slice(0, MAX_RECENT_RESTAURANTS),
      );
    },
    [],
  );

  const refreshRecentlyCreatedRestaurants = useCallback(async () => {
    setIsLoadingRecentRestaurants(true);

    try {
      const latestRestaurants = (await getRestaurants()).slice(
        0,
        MAX_RECENT_RESTAURANTS,
      );

      const enrichedRestaurants = await Promise.all(
        latestRestaurants.map(async (restaurant) => {
          try {
            const draft = await getRestaurantDraftById(restaurant.id);
            return {
              id: restaurant.id,
              name: draft?.name?.trim() || restaurant.name,
              address: [
                draft?.address?.trim() ?? '',
                [draft?.city?.trim() ?? '', draft?.postalCode?.trim() ?? '']
                  .filter(Boolean)
                  .join(' '),
              ]
                .filter(Boolean)
                .join(', '),
              hasGooglePlace: Boolean(draft?.googlePlaceId?.trim()),
              createdAt: restaurant.createdAt,
            } satisfies RecentRestaurantCard;
          } catch {
            return {
              id: restaurant.id,
              name: restaurant.name,
              address: '',
              hasGooglePlace: false,
              createdAt: restaurant.createdAt,
            } satisfies RecentRestaurantCard;
          }
        }),
      );

      setRecentlyCreatedRestaurants(enrichedRestaurants);
    } catch (caughtError) {
      debugLog('recent-restaurants:load-failed', {
        reason:
          caughtError instanceof Error ? caughtError.message : 'Unknown error',
      });
    } finally {
      setIsLoadingRecentRestaurants(false);
    }
  }, []);

  const syncWizardRoute = useCallback(
    (
      step: WizardStep,
      restaurantId: string | null,
      activeFranchiseId: string | null,
      activeMode: WizardMode | null,
    ) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(STEP_QUERY_PARAM, String(step));

      if (restaurantId) {
        nextParams.set(DRAFT_QUERY_PARAM, restaurantId);
      } else {
        nextParams.delete(DRAFT_QUERY_PARAM);
      }

      if (activeFranchiseId) {
        nextParams.set(FRANCHISE_QUERY_PARAM, activeFranchiseId);
      } else {
        nextParams.delete(FRANCHISE_QUERY_PARAM);
      }

      if (activeMode) {
        nextParams.set(MODE_QUERY_PARAM, activeMode);
      } else {
        nextParams.delete(MODE_QUERY_PARAM);
      }

      const nextQuery = nextParams.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (hasInitializedFromRouteRef.current) {
      return;
    }
    hasInitializedFromRouteRef.current = true;

    let isCancelled = false;

    const hydrateFromRoute = async () => {
      const stepParam = toWizardStep(searchParams.get(STEP_QUERY_PARAM)) ?? 1;
      const draftId = searchParams.get(DRAFT_QUERY_PARAM)?.trim() ?? '';
      const routeFranchiseId =
        searchParams.get(FRANCHISE_QUERY_PARAM)?.trim() ?? '';
      const routeMode = toWizardMode(searchParams.get(MODE_QUERY_PARAM));

      debugLog('hydrate:start', {
        stepParam,
        draftId: draftId || null,
        routeFranchiseId: routeFranchiseId || null,
        routeMode,
      });

      if (!draftId) {
        if (!isCancelled) {
          setCurrentStep(stepParam);
          setFranchiseId(routeFranchiseId || null);
          setWizardMode(routeMode);
          if (routeMode) {
            setValue('ownerProfileMode', routeMode, {
              shouldDirty: false,
              shouldValidate: false,
            });
          }
          if (routeFranchiseId) {
            setValue('selectedFranchiseId', routeFranchiseId, {
              shouldDirty: false,
              shouldValidate: false,
            });
          }
          setIsHydratingDraft(false);
        }
        return;
      }

      try {
        const draft = await getRestaurantDraftById(draftId);

        if (isCancelled) {
          return;
        }

        if (!draft) {
          setErrorMessage(
            'Draft restaurant was not found. Starting a new draft.',
          );
          setPrimaryRestaurantId(null);
          setFranchiseId(routeFranchiseId || null);
          setWizardMode(routeMode);
          setCurrentStep(1);
          setIsHydratingDraft(false);
          return;
        }

        const hydratedFranchiseId = routeFranchiseId || draft.franchiseId || '';
        const hydratedMode: WizardMode =
          routeMode ?? (hydratedFranchiseId ? 'existing' : 'create');

        setPrimaryRestaurantId(draft.id);
        setFranchiseId(hydratedFranchiseId || null);
        setWizardMode(hydratedMode);
        setCurrentStep(stepParam);

        reset({
          ...DEFAULT_FORM_VALUES,
          ownerProfileMode: hydratedMode,
          selectedFranchiseId: hydratedFranchiseId,
          franchiseName: hydratedMode === 'create' ? draft.name : '',
          restaurantName: draft.name,
          address: draft.address,
          city: draft.city,
          state: draft.state,
          country: draft.country,
          postalCode: draft.postalCode,
          businessType: draft.businessType,
          contactName: draft.contactName,
          selectedServiceModelId: draft.serviceModel,
          selectedServiceModelName: draft.serviceModel,
          selectedCuisineTypeIds: draft.cuisineTypes,
          selectedCuisineTypeLabels: draft.cuisineTypes,
          contactPhone: draft.pocPhoneNumber || draft.phoneNumber,
          contactEmail: draft.pocEmail || draft.email,
          googlePlaceId:
            draft.googlePlaceId || extractGooglePlaceId(draft.gmbLink),
          googlePlaceName: draft.name,
        });
      } catch (caughtError) {
        if (!isCancelled) {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : 'Failed to restore restaurant draft.';
          setErrorMessage(message);
          setCurrentStep(1);
          setPrimaryRestaurantId(null);
          setFranchiseId(null);
          setWizardMode(null);
        }
      } finally {
        if (!isCancelled) {
          setIsHydratingDraft(false);
        }
      }
    };

    void hydrateFromRoute();

    return () => {
      isCancelled = true;
    };
  }, [reset, searchParams, setValue]);

  useEffect(() => {
    if (isHydratingDraft) {
      return;
    }

    syncWizardRoute(currentStep, primaryRestaurantId, franchiseId, wizardMode);
  }, [
    currentStep,
    franchiseId,
    isHydratingDraft,
    primaryRestaurantId,
    syncWizardRoute,
    wizardMode,
  ]);

  useEffect(() => {
    void refreshRecentlyCreatedRestaurants();
  }, [refreshRecentlyCreatedRestaurants]);

  useEffect(() => {
    return () => {
      clearCreatedToastTimers();
    };
  }, [clearCreatedToastTimers]);

  const setStepErrors = (
    fieldNames: readonly string[],
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    const availableFields = new Set(fieldNames);
    let firstInvalidField: FieldPath<NewRestaurantFormValues> | null = null;

    issues.forEach((issue) => {
      const firstPathSegment = issue.path[0];

      if (
        typeof firstPathSegment !== 'string' ||
        !availableFields.has(firstPathSegment)
      ) {
        return;
      }

      const field = firstPathSegment as FieldPath<NewRestaurantFormValues>;

      if (!firstInvalidField) {
        firstInvalidField = field;
      }

      setError(field, { type: 'manual', message: issue.message });
    });

    if (firstInvalidField) {
      setFocus(firstInvalidField);
    }
  };

  const validateStep = async (step: WizardStep) => {
    const fields = step === 1 ? STEP_ONE_FIELDS : STEP_TWO_FIELDS;
    clearErrors([...fields]);

    const values = getValues();
    const result = (step === 1 ? stepOneSchema : stepTwoSchema).safeParse(
      values,
    );

    if (result.success) {
      return {
        isValid: true as const,
        issues: [] as Array<{ path: string; message: string }>,
      };
    }

    setStepErrors(fields, result.error.issues);
    return {
      isValid: false as const,
      issues: result.error.issues
        .map((issue) => {
          const path = issue.path[0];
          return {
            path: typeof path === 'string' ? path : 'unknown',
            message: issue.message,
          };
        })
        .filter((issue) => issue.path !== 'unknown'),
    };
  };

  const saveStepOneAndContinue = async () => {
    const values = getValues();
    const activeMode = values.ownerProfileMode;
    let activeFranchiseId = franchiseId;

    if (activeMode === 'create') {
      const franchiseName = values.restaurantName.trim();
      if (!franchiseName) {
        throw new Error('Restaurant name is required.');
      }

      if (!activeFranchiseId || wizardMode !== 'create') {
        const currentUser = nhost.auth.getUser();
        const createdFranchise = await insertFranchise({
          name: franchiseName,
          created_by_user_id: currentUser?.id ?? null,
          owner_user_id: null,
        });

        activeFranchiseId = createdFranchise.id;
      }
    } else {
      activeFranchiseId = values.selectedFranchiseId?.trim() || null;
      if (!activeFranchiseId) {
        throw new Error('Please select an existing franchise.');
      }
    }

    const payload = buildRestaurantPayload(values, activeFranchiseId);

    let restaurantId = primaryRestaurantId;
    if (restaurantId) {
      await updateRestaurant(restaurantId, payload);
    } else {
      const inserted = await insertRestaurant(payload);
      restaurantId = resolveRestaurantId(inserted.row, inserted.primaryKey);
    }

    if (!restaurantId) {
      throw new Error(
        'Restaurant was saved but no restaurant id was returned.',
      );
    }

    setPrimaryRestaurantId(restaurantId);
    setFranchiseId(activeFranchiseId);
    setWizardMode(activeMode);
    setValue('selectedFranchiseId', activeFranchiseId, {
      shouldDirty: false,
      shouldValidate: false,
    });

    const trimmedGooglePlaceId = values.googlePlaceId.trim();
    if (trimmedGooglePlaceId) {
      try {
        const currentUser = nhost.auth.getUser();
        await syncGoogleReviewsForRestaurant({
          restaurantId,
          placeId: trimmedGooglePlaceId,
          createdByUserId: currentUser?.id ?? null,
        });
      } catch (caughtError) {
        const reason =
          caughtError instanceof Error ? caughtError.message : 'Unknown error';
        debugLog('reviews:sync-failed', {
          restaurantId,
          placeId: trimmedGooglePlaceId,
          reason,
        });
      }
    }

    setSuccessMessage('Restaurant step 1 details saved.');
    setCurrentStep(2);
  };

  const resetWizardAfterSave = () => {
    reset(DEFAULT_FORM_VALUES);
    setPrimaryRestaurantId(null);
    setFranchiseId(null);
    setWizardMode(null);
    setCurrentStep(1);
  };

  const saveStepTwoAndContinue = async () => {
    const values = getValues();

    if (!primaryRestaurantId) {
      throw new Error(
        'Restaurant id is missing. Please complete step 1 first.',
      );
    }

    const restaurantBusinessPayload: Record<string, unknown> = {
      name: values.restaurantName.trim(),
      business_type: values.businessType.trim(),
      poc_name: optionalString(values.contactName),
      poc_phone_number: optionalString(values.contactPhone),
      poc_email: optionalString(values.contactEmail),
      phone_number: values.contactPhone.trim(),
      email: optionalString(values.contactEmail) ?? '',
      sms_name: values.restaurantName.trim(),
    };

    await updateRestaurant(primaryRestaurantId, restaurantBusinessPayload);

    const savedCard: RecentRestaurantCard = {
      id: primaryRestaurantId,
      name: values.restaurantName.trim(),
      address: [
        values.address.trim(),
        [values.city.trim(), values.postalCode.trim()]
          .filter(Boolean)
          .join(' '),
      ]
        .filter(Boolean)
        .join(', '),
      hasGooglePlace: Boolean(values.googlePlaceId.trim()),
      createdAt: new Date().toISOString(),
    };

    if (values.deploymentEnvironment === 'production') {
      if (!franchiseId) {
        throw new Error(
          'Franchise id is missing. Please complete step 1 first.',
        );
      }

      const ownerUserId = await createOwnerUser({
        email: values.ownerEmail,
        password: values.ownerPassword,
        displayName:
          values.ownerDisplayName ||
          values.contactName ||
          values.restaurantName,
      });

      await updateFranchiseOwner(franchiseId, ownerUserId);

      if (values.ownerIsLocationPoc) {
        await updateRestaurant(primaryRestaurantId, {
          poc_user_id: ownerUserId,
        });
      }

      setSuccessMessage('Production owner assignment and business info saved.');
      upsertRecentlyCreatedRestaurant(savedCard);
      showCreatedToast(savedCard.name);
      void refreshRecentlyCreatedRestaurants();
      resetWizardAfterSave();
      return;
    }

    setSuccessMessage('Staging business info saved to restaurant.');
    upsertRecentlyCreatedRestaurant(savedCard);
    showCreatedToast(savedCard.name);
    void refreshRecentlyCreatedRestaurants();
    resetWizardAfterSave();
  };

  const onContinue = async () => {
    if (isBusy) {
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);
    debugLog('continue:clicked', { currentStep });

    if (currentStep === 1) {
      const validation = await validateStep(1);

      if (!validation.isValid) {
        const message =
          validation.issues[0]?.message ??
          'Please complete required fields in step 1.';
        setErrorMessage(message);
        return;
      }

      try {
        setIsSavingStepOne(true);
        await saveStepOneAndContinue();
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to save restaurant details from step 1.';
        setErrorMessage(message);
      } finally {
        setIsSavingStepOne(false);
      }

      return;
    }

    if (currentStep === 2) {
      const validation = await validateStep(2);
      if (!validation.isValid) {
        const message =
          validation.issues[0]?.message ??
          'Please complete required fields in step 2.';
        setErrorMessage(message);
        return;
      }

      try {
        setIsSavingStepTwo(true);
        await saveStepTwoAndContinue();
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to save business info and owner assignment.';
        setErrorMessage(message);
      } finally {
        setIsSavingStepTwo(false);
      }
    }
  };

  const onStepSelect = async (nextStep: WizardStep) => {
    if (isBusy) {
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);

    if (nextStep === currentStep) {
      return;
    }

    if (nextStep < currentStep) {
      setCurrentStep(nextStep);
      return;
    }

    if (nextStep > 1 && (!franchiseId || !primaryRestaurantId)) {
      setErrorMessage('Please complete and save Step 1 first.');
      setCurrentStep(1);
      return;
    }

    for (let step = currentStep; step < nextStep; step += 1) {
      const stepToValidate = step as WizardStep;
      const validation = await validateStep(stepToValidate);

      if (!validation.isValid) {
        if (currentStep !== stepToValidate) {
          setCurrentStep(stepToValidate);
        }
        return;
      }
    }

    setCurrentStep(nextStep);
  };

  const onBack = () => {
    if (isBusy) {
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);
    setCurrentStep((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  };

  const onBackToStepOne = () => {
    setErrorMessage(null);
    setCurrentStep(1);
  };

  const showBackButton = currentStep > 1;
  const showContinueButton = currentStep < 2 && isStepOneRegistrationOpen;
  const showSaveButton = currentStep === 2;
  const hasFooterActions =
    showBackButton || showContinueButton || showSaveButton;

  return (
    <>
      {createdToastMessage ? (
        <div
          aria-live="polite"
          className={`pointer-events-none fixed right-6 top-6 z-[120] transition-all duration-300 ${
            isCreatedToastVisible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-3 opacity-0'
          }`}
          role="status"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#cfc5ff] bg-[#f6f3ff] px-4 py-3 shadow-[0_18px_40px_rgba(102,126,234,0.24)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#667eea] text-white">
              <ToastCheckIcon />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#1c1b4e]">
                Restaurant saved
              </p>
              <p className="text-sm text-[#4d4a73]">{createdToastMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-[#d7e2e6] bg-white">
      <div className="border-b border-[#d8e3e7] px-8 py-5">
        <h2 className="text-[28px] font-semibold text-[#111827]">
          New restaurant
        </h2>
      </div>

      <div className="space-y-6 p-8">
        <Stepper
          currentStep={currentStep}
          isStepOneComplete={isStepOneComplete}
          onStepSelect={onStepSelect}
        />

        {successMessage ? <FormSuccess>{successMessage}</FormSuccess> : null}

        {isHydratingDraft ? (
          <div className="rounded-xl border border-[#d8e3e7] bg-[#f5f8fa] px-4 py-3 text-sm text-[#556678]">
            Restoring draft...
          </div>
        ) : null}

        {errorMessage ? <FormError>{errorMessage}</FormError> : null}

        {currentStep === 1 ? (
          <StepRestaurantInfo
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            onRegistrationPanelOpenChange={setIsStepOneRegistrationOpen}
          />
        ) : null}

        {currentStep === 2 ? (
          <StepBusinessInfo
            control={control}
            register={register}
            errors={errors}
            franchiseId={franchiseId}
            onBackToStepOne={onBackToStepOne}
          />
        ) : null}

        {currentStep === 1 &&
        !isStepOneRegistrationOpen &&
        recentlyCreatedRestaurants.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-[#d7e2e6] bg-[#f8fbfd] p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-[#111827]">
                Recently created restaurants
              </h4>
              <p className="text-xs text-[#607180]">
                {isLoadingRecentRestaurants
                  ? 'Refreshing...'
                  : 'Showing latest 4 (read-only)'}
              </p>
            </div>

            <div className="space-y-3">
              {recentlyCreatedRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="rounded-xl border border-[#d9e3e8] bg-white p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#111827]">
                        {restaurant.name || 'Saved restaurant'}
                      </p>
                      <p className="text-sm text-[#5d6c78]">
                        {restaurant.address || 'Address not available'}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-[#667085]">
                      {formatRecentCreatedAt(restaurant.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-[#4d6070]">
                    {restaurant.hasGooglePlace
                      ? 'Google place: yes'
                      : 'Google place: no'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {hasFooterActions ? (
        <div className="flex justify-end border-t border-[#d8e3e7] bg-[#f3f7f9] px-8 py-5">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-[#d2dee4] bg-white px-5 py-2 text-[18px] font-medium text-[#111827] transition hover:bg-[#f7fafc]"
              >
                Back
              </button>
            ) : null}

            {showContinueButton ? (
              <button
                type="button"
                onClick={onContinue}
                disabled={!isStepOneComplete || isBusy}
                className="rounded-xl bg-[#667eea] px-6 py-2 text-[18px] font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#cfc8ff] disabled:text-[#f8f7ff]"
              >
                {isBusy ? 'Saving...' : 'Continue'}
              </button>
            ) : null}

            {showSaveButton ? (
              <button
                type="button"
                onClick={onContinue}
                disabled={!isStepOneComplete || !isStepTwoComplete || isBusy}
                className="rounded-xl bg-[#667eea] px-6 py-2 text-[18px] font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#cfc8ff] disabled:text-[#f8f7ff]"
              >
                {isBusy ? 'Saving...' : 'Save restaurant'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}

function formatRecentCreatedAt(value: string | null) {
  if (!value) {
    return 'Recently created';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recently created';
  }

  return parsedDate.toLocaleString();
}

function buildRestaurantPayload(
  values: NewRestaurantFormValues,
  activeFranchiseId: string,
) {
  const currentUser = nhost.auth.getUser();
  const selectedCuisineValues =
    values.selectedCuisineTypeLabels.length > 0
      ? values.selectedCuisineTypeLabels
      : values.selectedCuisineTypeIds;

  const trimmedRestaurantName = values.restaurantName.trim();
  const trimmedContactPhone = values.contactPhone.trim();
  const trimmedContactEmail = values.contactEmail.trim();
  const trimmedGooglePlaceId = values.googlePlaceId.trim();
  const gmbLink = trimmedGooglePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${trimmedGooglePlaceId}`
    : '';

  const payload: Record<string, unknown> = {
    name: trimmedRestaurantName,
    franchise_id: activeFranchiseId,
    service_model:
      values.selectedServiceModelName?.trim() ||
      values.selectedServiceModelId ||
      '',
    cuisine_types: selectedCuisineValues,
    user_id: currentUser?.id ?? null,
    phone_number: trimmedContactPhone || '',
    email: trimmedContactEmail || '',
    sms_name: trimmedRestaurantName || '',
    poc_phone_number: trimmedContactPhone || '',
    poc_email: trimmedContactEmail || '',
    poc_name: values.contactName.trim() || trimmedRestaurantName || '',
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    country: values.country.trim(),
    postal_code: values.postalCode.trim(),
    google_place_id: trimmedGooglePlaceId || '',
    gmb_link: gmbLink,
  };

  return payload;
}

function ToastCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

async function createOwnerUser({
  email,
  password,
  displayName,
}: {
  email: string;
  password?: string;
  displayName?: string;
}) {
  const accessToken = await nhost.auth.getAccessToken();
  if (!accessToken) {
    throw new Error('Your session has expired. Please login again and retry.');
  }

  const response = await fetch('/api/admin/create-owner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      email: email.trim(),
      password: optionalString(password),
      displayName: optionalString(displayName),
    }),
  });

  const payload = (await safeParseJson(response)) as {
    userId?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (!response.ok) {
    const message =
      (payload &&
        (typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string'
            ? payload.message
            : null)) ||
      'Failed to create owner user.';
    throw new Error(message);
  }

  const userId =
    payload && typeof payload.userId === 'string' ? payload.userId : '';
  if (!userId.trim()) {
    throw new Error('Owner creation succeeded but no user id was returned.');
  }

  return userId;
}

function resolveRestaurantId(
  row: Record<string, unknown>,
  fallbackPrimaryKey: string | null,
) {
  const id = row.id;
  if (typeof id === 'string' && id.trim()) {
    return id;
  }

  const restaurantId = row.restaurant_id;
  if (typeof restaurantId === 'string' && restaurantId.trim()) {
    return restaurantId;
  }

  if (fallbackPrimaryKey?.trim()) {
    return fallbackPrimaryKey;
  }

  return null;
}

type GooglePlaceReviewPayload = {
  source?: unknown;
  external_review_id?: unknown;
  rating?: unknown;
  author_name?: unknown;
  review_text?: unknown;
  author_url?: unknown;
  review_url?: unknown;
  avatar_url?: unknown;
  published_at?: unknown;
};

async function syncGoogleReviewsForRestaurant({
  restaurantId,
  placeId,
  createdByUserId,
}: {
  restaurantId: string;
  placeId: string;
  createdByUserId: string | null;
}) {
  const response = await fetch('/api/google/place-reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ placeId }),
    cache: 'no-store',
  });

  const payload = (await safeParseJson(response)) as {
    reviews?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (!response.ok) {
    const message =
      (payload &&
        (typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string'
            ? payload.message
            : null)) ||
      `Failed to fetch reviews for place id ${placeId}.`;
    throw new Error(message);
  }

  const rawReviews = Array.isArray(payload?.reviews)
    ? (payload?.reviews as GooglePlaceReviewPayload[])
    : [];

  const reviews = rawReviews
    .map((rawReview) => ({
      source:
        typeof rawReview.source === 'string' && rawReview.source.trim()
          ? rawReview.source.trim()
          : 'google',
      external_review_id:
        typeof rawReview.external_review_id === 'string' &&
        rawReview.external_review_id.trim()
          ? rawReview.external_review_id.trim()
          : null,
      rating:
        typeof rawReview.rating === 'number' && !Number.isNaN(rawReview.rating)
          ? Math.max(1, Math.min(5, Math.round(rawReview.rating)))
          : 5,
      author_name:
        typeof rawReview.author_name === 'string' && rawReview.author_name.trim()
          ? rawReview.author_name.trim()
          : null,
      review_text:
        typeof rawReview.review_text === 'string' && rawReview.review_text.trim()
          ? rawReview.review_text.trim()
          : null,
      author_url:
        typeof rawReview.author_url === 'string' && rawReview.author_url.trim()
          ? rawReview.author_url.trim()
          : null,
      review_url:
        typeof rawReview.review_url === 'string' && rawReview.review_url.trim()
          ? rawReview.review_url.trim()
          : null,
      avatar_url:
        typeof rawReview.avatar_url === 'string' && rawReview.avatar_url.trim()
          ? rawReview.avatar_url.trim()
          : null,
      published_at:
        typeof rawReview.published_at === 'string' && rawReview.published_at.trim()
          ? rawReview.published_at.trim()
          : null,
      is_hidden: false,
      created_by_user_id: createdByUserId,
    }))
    .filter(
      (review) =>
        Boolean(review.external_review_id) ||
        Boolean(review.review_text) ||
        Boolean(review.author_name),
    );

  await replaceRestaurantGoogleReviews(restaurantId, reviews);
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function optionalString(value: string | undefined | null) {
  const trimmed = value?.trim() ?? '';
  return trimmed || undefined;
}

function toWizardStep(value: string | null): WizardStep | null {
  if (value === '1' || value === '2') {
    return Number(value) as WizardStep;
  }

  if (value === '3') {
    return 2;
  }

  return null;
}

function toWizardMode(value: string | null): WizardMode | null {
  if (value === 'create' || value === 'existing') {
    return value;
  }

  return null;
}

function extractGooglePlaceId(gmbLink: string) {
  if (!gmbLink) {
    return '';
  }

  const match = gmbLink.match(/place_id:([^&]+)/);
  if (!match?.[1]) {
    return '';
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
