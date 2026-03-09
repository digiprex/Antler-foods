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
  // getPages, // COMMENTED OUT: Page creation removed from flow
  getRestaurants,
  getRestaurantDraftById,
  insertFranchise,
  // insertPage, // COMMENTED OUT: Page creation removed from flow
  insertRestaurant,
  replaceRestaurantGoogleReviews,
  updateFranchiseOwner,
  updateRestaurant,
} from '@/lib/graphql/queries';
import { resolveRoleSegmentFromPath } from '@/lib/auth/routes';
import { emitDashboardRestaurantsRefresh } from '@/components/dashboard/route-loading-events';
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
const DEFAULT_STAGING_DOMAIN_SUFFIX = '.antlerfoods.com';

// COMMENTED OUT: Page creation removed from flow
// const DEFAULT_SYSTEM_PAGES = [
//   { urlSlug: 'home', name: 'Home' },
//   { urlSlug: 'about', name: 'About' },
//   { urlSlug: 'contact', name: 'Contact' },
//   { urlSlug: 'menu', name: 'Menu' },
// ] as const;

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
  shouldCreateOwner: false,
  ownerEmail: '',
  ownerPassword: '',
  ownerDisplayName: '',
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
  const [saveProgressMessage, setSaveProgressMessage] = useState<string | null>(
    null,
  );
  const [saveElapsedSeconds, setSaveElapsedSeconds] = useState(0);
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

  useEffect(() => {
    if (!isSavingStepTwo) {
      setSaveElapsedSeconds(0);
      return;
    }

    const timerId = setInterval(() => {
      setSaveElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [isSavingStepTwo]);

  // Lock body scroll when loader is visible
  useEffect(() => {
    if (isSavingStepTwo && saveProgressMessage) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;

      // Lock scroll
      document.body.style.overflow = 'hidden';

      // Cleanup: restore original overflow
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSavingStepTwo, saveProgressMessage]);

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

    let restaurantId = primaryRestaurantId;
    if (restaurantId) {
      const payload = buildRestaurantPayload(values, activeFranchiseId, {
        includeDefaultStagingDomain: false,
      });
      await updateRestaurant(restaurantId, payload);
    } else {
      const payload = buildRestaurantPayload(values, activeFranchiseId, {
        includeDefaultStagingDomain: true,
      });
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

    setSaveProgressMessage('Saving business information...');
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

    if (values.shouldCreateOwner) {
      if (!franchiseId) {
        throw new Error(
          'Franchise id is missing. Please complete step 1 first.',
        );
      }

      setSaveProgressMessage('Creating owner account...');
      const ownerUserId = await createOwnerUser({
        email: values.ownerEmail,
        password: values.ownerPassword,
        displayName:
          values.ownerDisplayName ||
          values.contactName ||
          values.restaurantName,
      });

      await updateFranchiseOwner(franchiseId, ownerUserId);
    }

    // COMMENTED OUT: Page creation removed from flow
    // setSaveProgressMessage('Creating default pages...');
    // await ensureDefaultSystemPagesForRestaurant(primaryRestaurantId);

    if (values.googlePlaceId.trim()) {
      setSaveProgressMessage('Syncing Google timings...');
      await syncGoogleOpeningHoursForRestaurant(primaryRestaurantId);

      setSaveProgressMessage('Importing Google photos/videos...');
      try {
        await importAllGoogleMediaForRestaurant(primaryRestaurantId);
      } catch (caughtError) {
        debugLog('google-media:sync-failed', {
          restaurantId: primaryRestaurantId,
          reason:
            caughtError instanceof Error
              ? caughtError.message
              : 'Unknown error',
        });
      }
    }

    setSaveProgressMessage('Finalizing setup...');
    setSuccessMessage('Restaurant created successfully.');
    upsertRecentlyCreatedRestaurant(savedCard);
    showCreatedToast(savedCard.name);
    void refreshRecentlyCreatedRestaurants();

    emitDashboardRestaurantsRefresh();
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
        setSaveProgressMessage('Starting restaurant setup...');
        await saveStepTwoAndContinue();

        // Small delay to allow sidebar restaurants list to refresh before navigation
        await new Promise(resolve => setTimeout(resolve, 300));

        // Navigate to restaurants list after successful creation
        const restaurantsListPath = buildRestaurantsListPath(pathname);
        router.push(restaurantsListPath);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to complete restaurant setup.';
        setErrorMessage(message);
      } finally {
        setIsSavingStepTwo(false);
        setSaveProgressMessage(null);
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

      {isSavingStepTwo && saveProgressMessage ? (
        <div className="fixed inset-0 z-[130] overflow-hidden bg-[#13073a]/62 backdrop-blur-[3px]">
          <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-[#8f70ff]/35 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -right-14 bottom-14 h-80 w-80 rounded-full bg-[#667eea]/28 blur-3xl animate-pulse [animation-delay:400ms]" />

          <div className="relative flex min-h-full items-center justify-center px-4">
            <div className="w-full max-w-xl rounded-3xl border border-[#ddd1ff] bg-white/95 p-7 shadow-[0_35px_90px_rgba(38,14,100,0.36)]">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0">
                  <span className="absolute inset-0 rounded-full border-2 border-[#d8ccff]" />
                  <span className="absolute inset-[6px] rounded-full border-2 border-transparent border-r-[#9178ff] border-t-[#6a4cf4] animate-spin" />
                  <span className="absolute inset-[16px] rounded-full bg-[#f0ebff]" />
                  <span className="absolute inset-[22px] rounded-full bg-[#6a4cf4] animate-pulse" />
                </div>

                <div className="space-y-1">
                  <p className="text-[26px] font-semibold leading-none text-[#19143a]">
                    Creating restaurant
                  </p>
                  <p className="text-sm font-medium text-[#5f5a80]">
                    {saveProgressMessage}
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#eee9ff]">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#6b4ef6] via-[#8b73ff] to-[#667eea] animate-pulse" />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-[#6f6a95]">
                <p className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7a62ff] animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7a62ff] animate-bounce [animation-delay:140ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7a62ff] animate-bounce [animation-delay:280ms]" />
                  </span>
                  Please keep this tab open
                </p>
                <p>Elapsed: {formatElapsedTime(saveElapsedSeconds)}</p>
              </div>
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
            setValue={setValue}
            errors={errors}
            franchiseId={franchiseId}
            onBackToStepOne={onBackToStepOne}
          />
        ) : null}

        {currentStep === 1 &&
        !isStepOneRegistrationOpen &&
        recentlyCreatedRestaurants.length > 0 ? (
          <div className="space-y-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-bold text-gray-900">
                  Recently Created
                </h4>
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                {isLoadingRecentRestaurants
                  ? 'Refreshing...'
                  : `${recentlyCreatedRestaurants.length} restaurants`}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {recentlyCreatedRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-purple-200 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {restaurant.name || 'Saved restaurant'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {restaurant.address || 'Address not available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      {restaurant.hasGooglePlace ? (
                        <>
                          <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-medium text-green-700">Google Place</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-medium text-gray-500">No Google Place</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatRecentCreatedAt(restaurant.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {hasFooterActions ? (
        <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-8 py-6">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-2.5 text-base font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md active:translate-y-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : null}

            {showContinueButton ? (
              <button
                type="button"
                onClick={onContinue}
                disabled={!isStepOneComplete || isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-2.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isBusy ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            ) : null}

            {showSaveButton ? (
              <button
                type="button"
                onClick={onContinue}
                disabled={!isStepOneComplete || !isStepTwoComplete || isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-2.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isBusy ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Restaurant
                  </>
                )}
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
  options: {
    includeDefaultStagingDomain: boolean;
  },
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
  // COMMENTED OUT: Domain creation removed from flow
  // const defaultStagingDomain = options.includeDefaultStagingDomain
  //   ? buildDefaultStagingDomain(trimmedRestaurantName)
  //   : '';
  const defaultStagingDomain = '';

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

  // COMMENTED OUT: Domain creation removed from flow
  // if (defaultStagingDomain) {
  //   payload.staging_domain = defaultStagingDomain;
  // }

  return payload;
}

// COMMENTED OUT: Domain creation removed from flow
// function buildDefaultStagingDomain(restaurantName: string) {
//   const normalizedLabel = restaurantName
//     .normalize('NFKD')
//     .replace(/[\u0300-\u036f]/g, '')
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '');
//
//   const base = normalizedLabel || 'restaurant';
//   return `${base}${DEFAULT_STAGING_DOMAIN_SUFFIX}`;
// }

function formatElapsedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

  // Prioritize reviews by rating: 5-star first, then 4-star, then 3-star, etc.
  let filteredReviews = reviews;
  for (let rating = 5; rating >= 1; rating--) {
    const reviewsWithRating = reviews.filter((review) => review.rating === rating);
    if (reviewsWithRating.length > 0) {
      filteredReviews = reviewsWithRating;
      break;
    }
  }

  await replaceRestaurantGoogleReviews(restaurantId, filteredReviews);
}

// COMMENTED OUT: Page creation removed from flow
// async function ensureDefaultSystemPagesForRestaurant(restaurantId: string) {
//   const existingPages = await getPages(restaurantId);
//   const existingSlugs = new Set(
//     existingPages
//       .map((page) => page.url_slug?.trim().toLowerCase())
//       .filter((slug): slug is string => Boolean(slug)),
//   );
//
//   for (const page of DEFAULT_SYSTEM_PAGES) {
//     if (existingSlugs.has(page.urlSlug)) {
//       continue;
//     }
//
//     await insertPage({
//       url_slug: page.urlSlug,
//       name: page.name,
//       is_deleted: false,
//       meta_title: null,
//       meta_description: null,
//       restaurant_id: restaurantId,
//       is_system_page: true,
//       show_on_navbar: true,
//       show_on_footer: true,
//       keywords: null,
//       og_image: null,
//       published: false,
//     });
//   }
// }

async function syncGoogleOpeningHoursForRestaurant(restaurantId: string) {
  const response = await fetchWithSessionAuth(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/opening-hours`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_google',
      }),
    },
  );

  const payload = (await safeParseJson(response)) as {
    success?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (!response.ok || payload?.success !== true) {
    const message =
      (payload &&
        (typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string'
            ? payload.message
            : null)) ||
      'Failed to sync opening hours from Google.';
    throw new Error(message);
  }
}

async function importAllGoogleMediaForRestaurant(restaurantId: string) {
  const photosResponse = await fetchWithSessionAuth(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/google-photos`,
    {
      cache: 'no-store',
    },
  );

  const photosPayload = (await safeParseJson(photosResponse)) as {
    success?: unknown;
    data?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (!photosResponse.ok || photosPayload?.success !== true) {
    const message =
      (photosPayload &&
        (typeof photosPayload.error === 'string'
          ? photosPayload.error
          : typeof photosPayload.message === 'string'
            ? photosPayload.message
            : null)) ||
      'Failed to fetch Google media.';
    throw new Error(message);
  }

  const mediaIds = Array.from(
    new Set(
      (Array.isArray(photosPayload?.data) ? photosPayload?.data : [])
        .map((item) => {
          const record = item as { media_id?: unknown };
          return typeof record.media_id === 'string' ? record.media_id.trim() : '';
        })
        .filter(Boolean),
    ),
  );

  for (const mediaId of mediaIds) {
    const importResponse = await fetchWithSessionAuth(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/google-photos/import`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId,
        }),
      },
    );

    const importPayload = (await safeParseJson(importResponse)) as {
      success?: unknown;
      error?: unknown;
      message?: unknown;
    } | null;

    if (!importResponse.ok || importPayload?.success !== true) {
      const message =
        (importPayload &&
          (typeof importPayload.error === 'string'
            ? importPayload.error
            : typeof importPayload.message === 'string'
              ? importPayload.message
              : null)) ||
        `Failed to import Google media ${mediaId}.`;
      debugLog('google-media:import-failed', {
        restaurantId,
        mediaId,
        reason: message,
      });
    }
  }
}

function buildRestaurantsListPath(pathname: string) {
  const roleSegment = resolveRoleSegmentFromPath(pathname) || 'admin';
  return `/dashboard/${roleSegment}/restaurants`;
}

async function fetchWithSessionAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const accessToken = await nhost.auth.getAccessToken();
  if (!accessToken) {
    throw new Error('Your session has expired. Please login again.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
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
