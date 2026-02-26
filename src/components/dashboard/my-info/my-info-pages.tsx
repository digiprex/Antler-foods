'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import FileUpload from '@/components/ui/file-upload';
import {
  getCuisineCategories,
  getServiceModels,
  getRestaurantDraftById,
  type CuisineTypeCategory,
  type RestaurantDraftItem,
  updateRestaurant,
} from '@/lib/graphql/queries';
import { nhost } from '@/lib/nhost';
import {
  buildRestaurantInformationPath,
  parseRestaurantScopeFromPath,
} from '@/lib/restaurants/route-utils';
import { emitDashboardRouteLoadingStart } from '@/components/dashboard/route-loading-events';

type RestaurantScope = {
  id: string;
  name: string;
};

type SaveNotice = {
  tone: 'success' | 'error';
  message: string;
};

type GalleryItem = {
  id: string;
  restaurant_id: string;
  source: string;
  file_id: string | null;
  external_id: string | null;
  type: string;
  created_at: string | null;
  is_hidden: boolean;
  url: string;
};

interface GalleryApiResponse {
  success: boolean;
  data?: GalleryItem[];
  error?: string;
}

interface DeleteMediaApiResponse {
  success: boolean;
  action?: string;
  is_hidden?: boolean;
  error?: string;
}

type MediaPreviewState = {
  url: string;
  title: string;
  subtitle: string;
  kind: 'image' | 'video';
} | null;

type GoogleExternalMediaItem = {
  media_id: string;
  kind: 'photo' | 'video';
  width: number | null;
  height: number | null;
  preview_url: string;
};

type MyInfoTabKey = 'brand' | 'address' | 'opening-hours' | 'google-profile';

const BUSINESS_TYPE_OPTIONS = [
  'Restaurant',
  'Franchise',
  'Cloud Kitchen',
  'Food Truck',
];

const MY_INFO_TABS: Array<{
  key: MyInfoTabKey;
  label: string;
  segment: string;
  icon: ReactNode;
}> = [
  {
    key: 'brand',
    label: 'Brand',
    segment: 'brand',
    icon: <BrandTabIcon />,
  },
  {
    key: 'address',
    label: 'Address',
    segment: 'address',
    icon: <AddressTabIcon />,
  },
  {
    key: 'opening-hours',
    label: 'Opening Hours',
    segment: 'opening-hours',
    icon: <OpeningHoursTabIcon />,
  },
  {
    key: 'google-profile',
    label: 'Google profile',
    segment: 'google-profile',
    icon: <GoogleTabIcon />,
  },
];

interface GooglePhotosApiResponse {
  success: boolean;
  data?: GoogleExternalMediaItem[];
  error?: string;
}

type OpeningHoursProfileRecord = {
  opening_hour_id: string;
  source: 'google' | 'manual';
  timezone: string;
  is_24x7: boolean;
  notes: string | null;
  synced_at: string | null;
};

type OpeningHoursSlotRecord = {
  opening_hour_slot_id: string;
  day_of_week: number;
  slot_order: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

interface OpeningHoursApiResponse {
  success: boolean;
  data?: {
    profile: OpeningHoursProfileRecord | null;
    slots: OpeningHoursSlotRecord[];
    has_google_place_id: boolean;
    google_sync_error?: string | null;
  };
  message?: string;
  error?: string;
}

type DayScheduleSlotState = {
  id: string;
  openTime: string;
  closeTime: string;
};

type DayScheduleState = {
  dayOfWeek: number;
  label: string;
  closed: boolean;
  slots: DayScheduleSlotState[];
};

const OPENING_HOURS_DAYS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 7, label: 'Sunday' },
];

function resolveDashboardBasePath(pathname: string) {
  const match = pathname.match(/^\/dashboard\/[^/]+/);
  return match ? match[0] : '/dashboard';
}

function useMyInfoTabLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();
  const fallbackRestaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
  const fallbackRestaurantName = searchParams.get('restaurant_name')?.trim() ?? 'restaurant';
  const restaurantScope = useMemo(
    () => parseRestaurantScopeFromPath(pathname),
    [pathname],
  );
  const dashboardBasePath = useMemo(
    () => resolveDashboardBasePath(pathname),
    [pathname],
  );

  return useMemo(() => {
    if (restaurantScope) {
      return {
        brand: buildRestaurantInformationPath(
          restaurantScope.roleSegment,
          {
            id: restaurantScope.restaurantId,
            name: restaurantScope.restaurantNameFromSlug,
          },
          'brand',
        ),
        address: buildRestaurantInformationPath(
          restaurantScope.roleSegment,
          {
            id: restaurantScope.restaurantId,
            name: restaurantScope.restaurantNameFromSlug,
          },
          'address',
        ),
        'opening-hours': buildRestaurantInformationPath(
          restaurantScope.roleSegment,
          {
            id: restaurantScope.restaurantId,
            name: restaurantScope.restaurantNameFromSlug,
          },
          'opening-hours',
        ),
        'google-profile': buildRestaurantInformationPath(
          restaurantScope.roleSegment,
          {
            id: restaurantScope.restaurantId,
            name: restaurantScope.restaurantNameFromSlug,
          },
          'google-profile',
        ),
      } satisfies Record<MyInfoTabKey, string>;
    }

    const fallbackRestaurant = {
      id: fallbackRestaurantId,
      name: fallbackRestaurantName,
    };

    if (fallbackRestaurant.id) {
      return {
        brand: buildRestaurantInformationPath(
          dashboardBasePath.split('/')[2] || 'admin',
          fallbackRestaurant,
          'brand',
        ),
        address: buildRestaurantInformationPath(
          dashboardBasePath.split('/')[2] || 'admin',
          fallbackRestaurant,
          'address',
        ),
        'opening-hours': buildRestaurantInformationPath(
          dashboardBasePath.split('/')[2] || 'admin',
          fallbackRestaurant,
          'opening-hours',
        ),
        'google-profile': buildRestaurantInformationPath(
          dashboardBasePath.split('/')[2] || 'admin',
          fallbackRestaurant,
          'google-profile',
        ),
      } satisfies Record<MyInfoTabKey, string>;
    }

    const fallbackPath = paramsString
      ? `${dashboardBasePath}/restaurants?${paramsString}`
      : `${dashboardBasePath}/restaurants`;

    return {
      brand: fallbackPath,
      address: fallbackPath,
      'opening-hours': fallbackPath,
      'google-profile': fallbackPath,
    };
  }, [
    dashboardBasePath,
    fallbackRestaurantId,
    fallbackRestaurantName,
    paramsString,
    restaurantScope,
  ]);
}

function MyInfoWorkspaceShell({
  activeTab,
  children,
}: {
  activeTab: MyInfoTabKey;
  children: ReactNode;
}) {
  const tabLinks = useMyInfoTabLinks();
  const pathname = usePathname();
  const [pendingTab, setPendingTab] = useState<MyInfoTabKey | null>(null);

  useEffect(() => {
    if (!pendingTab) {
      return;
    }
    setPendingTab(null);
  }, [pathname, pendingTab]);

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-4">
        <h2 className="px-2 text-sm font-semibold uppercase tracking-wide text-[#60707c]">
          Information
        </h2>
        <nav className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {MY_INFO_TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <Link
                key={tab.key}
                href={tabLinks[tab.key]}
                onClick={() => {
                  if (isActive) {
                    return;
                  }

                  setPendingTab(tab.key);
                  emitDashboardRouteLoadingStart();
                }}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-[#9eb7ff] bg-[#eef3ff] text-[#12203d]'
                    : 'border-[#dfe7ec] text-[#5d6b77] hover:bg-[#f8fafb]'
                }`}
              >
                {pendingTab === tab.key ? (
                  <PurpleDotSpinner size="inline" />
                ) : (
                  <span className={isActive ? 'text-[#2f4fb6]' : 'text-[#7b8a96]'}>
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  );
}

function useRestaurantScope(): RestaurantScope | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restaurantScope = parseRestaurantScopeFromPath(pathname);
  if (restaurantScope) {
    return {
      id: restaurantScope.restaurantId,
      name: restaurantScope.restaurantNameFromSlug,
    };
  }

  const restaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantName = searchParams.get('restaurant_name')?.trim() ?? '';

  if (!restaurantId || !restaurantName) {
    return null;
  }

  return {
    id: restaurantId,
    name: restaurantName,
  };
}

function useRestaurantDraft(restaurantId: string | null) {
  const [draft, setDraft] = useState<RestaurantDraftItem | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(restaurantId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!restaurantId) {
      setDraft(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const nextDraft = await getRestaurantDraftById(restaurantId);
      if (!nextDraft) {
        setDraft(null);
        setLoadError('Restaurant details were not found for this selection.');
        return;
      }

      setDraft(nextDraft);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load restaurant details.';
      setDraft(null);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    draft,
    isLoading,
    loadError,
    reload,
  };
}

function SelectionRequiredCard({ target }: { target: string }) {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{target}</h1>
      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <h2 className="text-3xl font-semibold text-[#111827]">Select a restaurant</h2>
        <p className="mt-3 text-lg text-[#5f6c78]">
          Select a restaurant from the search box to manage {target.toLowerCase()}.
        </p>
      </div>
    </section>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{title}</h1>
      <div className="flex items-center gap-3 rounded-3xl border border-[#d7e2e6] bg-white p-8 text-lg text-[#5f6c78]">
        <PurpleDotSpinner size="sm" />
        <span>Loading restaurant data...</span>
      </div>
    </section>
  );
}

function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{title}</h1>
      <div className="space-y-4 rounded-3xl border border-[#f0d5d5] bg-white p-8">
        <p className="text-lg text-[#a72b2b]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded-xl bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f2937]"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function FormMessage({ notice }: { notice: SaveNotice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm ${
        notice.tone === 'success'
          ? 'bg-[#ede9fe] text-[#5b21b6]'
          : 'bg-[#fde8e8] text-[#9b1c1c]'
      }`}
    >
      {notice.message}
    </p>
  );
}

function Header({
  title,
  subtitle,
  restaurantName,
}: {
  title: string;
  subtitle: string;
  restaurantName: string;
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{title}</h1>
      <p className="text-lg text-[#5f6c78]">{subtitle}</p>
      <p className="text-sm font-medium text-[#111827]">Restaurant: {restaurantName}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  type?: 'text' | 'email';
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#111827]">
        {required ? '* ' : ''}
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border border-[#d2dde2] px-4 py-3 text-base outline-none transition ${
          readOnly
            ? 'cursor-not-allowed bg-[#f4f7f9] text-[#5f6c78]'
            : 'bg-white text-[#111827] focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]'
        }`}
      />
    </label>
  );
}

function FormSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#111827]">
        {required ? '* ' : ''}
        {label}
      </span>
      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe] disabled:cursor-not-allowed disabled:bg-[#f4f7f9] disabled:text-[#5f6c78]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MyInfoBrandPage() {
  const restaurant = useRestaurantScope();
  const { draft, isLoading, loadError, reload } = useRestaurantDraft(
    restaurant?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [legalName, setLegalName] = useState('');
  const [smsName, setSmsName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [serviceModel, setServiceModel] = useState('');
  const [serviceModelOptions, setServiceModelOptions] = useState<string[]>([]);
  const [isServiceModelsLoading, setIsServiceModelsLoading] = useState(true);
  const [facebookLink, setFacebookLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [xLink, setXLink] = useState('');
  const [tiktokLink, setTiktokLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [cuisineSearchTerm, setCuisineSearchTerm] = useState('');
  const [selectedCuisineTypes, setSelectedCuisineTypes] = useState<string[]>([]);
  const [cuisineCategories, setCuisineCategories] = useState<CuisineTypeCategory[]>(
    [],
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [isCuisineLoading, setIsCuisineLoading] = useState(true);
  const [cuisineError, setCuisineError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }

    setLegalName(draft.name);
    setSmsName(draft.smsName || draft.name);
    setPhoneNumber(draft.phoneNumber);
    setEmail(draft.email);
    setBusinessType(draft.businessType);
    setServiceModel(draft.serviceModel);
    setSelectedCuisineTypes(draft.cuisineTypes);
  }, [draft]);

  useEffect(() => {
    let isActive = true;

    const loadServiceModels = async () => {
      try {
        setIsServiceModelsLoading(true);
        const models = await getServiceModels();
        if (!isActive) {
          return;
        }

        const names = models
          .map((model) => model.name.trim())
          .filter(Boolean);
        setServiceModelOptions(Array.from(new Set(names)));
      } catch {
        if (isActive) {
          setServiceModelOptions([]);
        }
      } finally {
        if (isActive) {
          setIsServiceModelsLoading(false);
        }
      }
    };

    void loadServiceModels();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadCuisineCategories = async () => {
      try {
        setIsCuisineLoading(true);
        setCuisineError(null);
        const categories = await getCuisineCategories();

        if (!isActive) {
          return;
        }

        setCuisineCategories(categories);
        if (categories[0]) {
          setExpandedCategories((previous) => ({
            ...previous,
            [categories[0].id]: previous[categories[0].id] ?? true,
          }));
        }
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load cuisine categories.';
        setCuisineError(message);
      } finally {
        if (isActive) {
          setIsCuisineLoading(false);
        }
      }
    };

    void loadCuisineCategories();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredCuisineCategories = useMemo(() => {
    const normalizedSearch = cuisineSearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return cuisineCategories;
    }

    return cuisineCategories
      .map((category) => {
        const categoryMatches = category.label.toLowerCase().includes(normalizedSearch);
        const filteredTypes = category.cuisineTypes.filter((type) =>
          type.label.toLowerCase().includes(normalizedSearch),
        );

        if (!categoryMatches && filteredTypes.length === 0) {
          return null;
        }

        return {
          ...category,
          cuisineTypes: categoryMatches ? category.cuisineTypes : filteredTypes,
        };
      })
      .filter(
        (category): category is CuisineTypeCategory =>
          category !== null && category.cuisineTypes.length > 0,
      );
  }, [cuisineCategories, cuisineSearchTerm]);

  if (!restaurant) {
    return (
      <MyInfoWorkspaceShell activeTab="brand">
        <SelectionRequiredCard target="Brand" />
      </MyInfoWorkspaceShell>
    );
  }

  if (isLoading) {
    return (
      <MyInfoWorkspaceShell activeTab="brand">
        <LoadingCard title="Brand" />
      </MyInfoWorkspaceShell>
    );
  }

  if (!draft || loadError) {
    return (
      <MyInfoWorkspaceShell activeTab="brand">
        <ErrorCard
          title="Brand"
          message={loadError || 'Restaurant brand details were not found.'}
          onRetry={reload}
        />
      </MyInfoWorkspaceShell>
    );
  }

  const onCuisineTypeToggle = (label: string) => {
    setSelectedCuisineTypes((previous) => {
      if (previous.includes(label)) {
        return previous.filter((entry) => entry !== label);
      }

      return [...previous, label];
    });
  };

  const mergedServiceModelOptions =
    serviceModel && !serviceModelOptions.includes(serviceModel)
      ? [serviceModel, ...serviceModelOptions]
      : serviceModelOptions;

  const mergedBusinessTypeOptions =
    businessType && !BUSINESS_TYPE_OPTIONS.includes(businessType)
      ? [businessType, ...BUSINESS_TYPE_OPTIONS]
      : BUSINESS_TYPE_OPTIONS;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const trimmedLegalName = legalName.trim();
    if (!trimmedLegalName) {
      setNotice({
        tone: 'error',
        message: 'Legal name is required.',
      });
      return;
    }

    const trimmedSmsName = smsName.trim() || trimmedLegalName;
    const socialLinksPayload = buildSocialLinksUpdatePayload({
      facebookLink,
      instagramLink,
      xLink,
      tiktokLink,
      youtubeLink,
    });

    setIsSaving(true);

    try {
      await updateRestaurant(restaurant.id, {
        name: trimmedLegalName,
        sms_name: trimmedSmsName,
        phone_number: phoneNumber.trim(),
        email: email.trim(),
        business_type: businessType.trim(),
        service_model: serviceModel.trim(),
        cuisine_types: selectedCuisineTypes.map((entry) => entry.trim()).filter(Boolean),
        ...socialLinksPayload,
      });

      setNotice({
        tone: 'success',
        message: 'Brand details updated.',
      });
      await reload();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update brand details.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MyInfoWorkspaceShell activeTab="brand">
      <Header
        title="Brand"
        subtitle="Manage legal name, SMS name, business model, and cuisine setup."
        restaurantName={restaurant.name}
      />

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl border border-[#d7e2e6] bg-white p-8"
      >
        <FormMessage notice={notice} />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Legal name"
            value={legalName}
            onChange={setLegalName}
            required
          />
          <FormField
            label="SMS name"
            value={smsName}
            onChange={setSmsName}
            required
          />
          <FormField
            label="Phone number"
            value={phoneNumber}
            onChange={setPhoneNumber}
          />
          <FormField label="Email" value={email} onChange={setEmail} type="email" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormSelectField
            label="Business type"
            value={businessType}
            onChange={setBusinessType}
            options={mergedBusinessTypeOptions}
            placeholder="Select business type"
          />
          <FormSelectField
            label="Service model"
            value={serviceModel}
            onChange={setServiceModel}
            options={mergedServiceModelOptions}
            placeholder="Select service model"
            disabled={isServiceModelsLoading}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-[#d7e2e6] bg-[#f8fafb] p-4">
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">Cuisine types</h3>
            <p className="text-sm text-[#5f6c78]">
              Manage cuisines similar to add-restaurant setup.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#d2dde2] bg-white px-3 py-2">
            <SearchIcon />
            <input
              type="text"
              value={cuisineSearchTerm}
              onChange={(event) => setCuisineSearchTerm(event.target.value)}
              placeholder="Search cuisine types"
              className="w-full bg-transparent text-sm text-[#111827] placeholder:text-[#8ea0af] outline-none"
            />
          </div>

          {selectedCuisineTypes.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedCuisineTypes.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full bg-[#e7f0ff] px-3 py-1 text-sm font-medium text-[#22458f]"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => onCuisineTypeToggle(label)}
                    className="rounded-full p-0.5 transition hover:bg-[#d2e4ff]"
                    aria-label="Remove cuisine"
                  >
                    <CloseIcon />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-[#d2dde2] bg-white">
            {isCuisineLoading ? (
              <p className="px-4 py-3 text-sm text-[#5f6c78]">Loading cuisines...</p>
            ) : null}

            {cuisineError ? (
              <p className="px-4 py-3 text-sm text-[#a72b2b]">{cuisineError}</p>
            ) : null}

            {!isCuisineLoading && !cuisineError && !filteredCuisineCategories.length ? (
              <p className="px-4 py-3 text-sm text-[#5f6c78]">
                No cuisine categories found.
              </p>
            ) : null}

            {filteredCuisineCategories.map((category) => {
              const isExpanded = expandedCategories[category.id] ?? false;

              return (
                <div
                  key={category.id}
                  className="border-b border-[#e2e8ee] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategories((previous) => ({
                        ...previous,
                        [category.id]: !isExpanded,
                      }))
                    }
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[#1f2937] transition hover:bg-[#f8fafb]"
                  >
                    <ChevronRightIcon isExpanded={isExpanded} />
                    {category.label}
                  </button>

                  {isExpanded ? (
                    <div className="grid gap-2 border-t border-[#eef2f5] p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {category.cuisineTypes.map((type) => {
                        const isSelected = selectedCuisineTypes.includes(type.label);

                        return (
                          <button
                            key={`${category.id}-${type.id}`}
                            type="button"
                            onClick={() => onCuisineTypeToggle(type.label)}
                            className={cx(
                              'rounded-lg border px-3 py-2 text-left text-sm transition',
                              isSelected
                                ? 'border-[#90b2ff] bg-[#e7f0ff] text-[#1f3f86]'
                                : 'border-[#d7e2e6] bg-white text-[#27303a] hover:bg-[#f8fafb]',
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

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Facebook link"
            value={facebookLink}
            onChange={setFacebookLink}
          />
          <FormField
            label="Instagram link"
            value={instagramLink}
            onChange={setInstagramLink}
          />
          <FormField label="X (Twitter) link" value={xLink} onChange={setXLink} />
          <FormField
            label="TikTok link"
            value={tiktokLink}
            onChange={setTiktokLink}
          />
          <FormField
            label="YouTube link"
            value={youtubeLink}
            onChange={setYoutubeLink}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-xl bg-[#667eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b6dd6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save brand'}
        </button>
      </form>
    </MyInfoWorkspaceShell>
  );
}

export function MyInfoAddressPage() {
  const restaurant = useRestaurantScope();
  const { draft, isLoading, loadError, reload } = useRestaurantDraft(
    restaurant?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (!draft) {
      return;
    }

    setAddress(draft.address);
    setCity(draft.city);
    setState(draft.state);
    setCountry(draft.country);
    setPostalCode(draft.postalCode);
  }, [draft]);

  if (!restaurant) {
    return (
      <MyInfoWorkspaceShell activeTab="address">
        <SelectionRequiredCard target="Address" />
      </MyInfoWorkspaceShell>
    );
  }

  if (isLoading) {
    return (
      <MyInfoWorkspaceShell activeTab="address">
        <LoadingCard title="Address" />
      </MyInfoWorkspaceShell>
    );
  }

  if (!draft || loadError) {
    return (
      <MyInfoWorkspaceShell activeTab="address">
        <ErrorCard
          title="Address"
          message={loadError || 'Address details were not found.'}
          onRetry={reload}
        />
      </MyInfoWorkspaceShell>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setIsSaving(true);

    try {
      await updateRestaurant(restaurant.id, {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postal_code: postalCode.trim(),
      });

      setNotice({
        tone: 'success',
        message: 'Address details updated.',
      });
      await reload();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update address details.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MyInfoWorkspaceShell activeTab="address">
      <Header
        title="Address"
        subtitle="Manage restaurant location and mailing details."
        restaurantName={restaurant.name}
      />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8"
      >
        <FormMessage notice={notice} />
        <FormField label="Address" value={address} onChange={setAddress} required />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="City" value={city} onChange={setCity} required />
          <FormField label="State" value={state} onChange={setState} required />
          <FormField label="Country" value={country} onChange={setCountry} required />
          <FormField
            label="Postal code"
            value={postalCode}
            onChange={setPostalCode}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-xl bg-[#667eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b6dd6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save address'}
        </button>
      </form>
    </MyInfoWorkspaceShell>
  );
}

export function MyInfoOpeningHoursPage() {
  const restaurant = useRestaurantScope();
  const [isLoading, setIsLoading] = useState(Boolean(restaurant));
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [source, setSource] = useState<'google' | 'manual'>('manual');
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [is24x7, setIs24x7] = useState(false);
  const [notes, setNotes] = useState('');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [hasGooglePlaceId, setHasGooglePlaceId] = useState(false);
  const [daySchedules, setDaySchedules] = useState<DayScheduleState[]>(
    buildDefaultDaySchedule,
  );
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
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
    },
    [],
  );

  const applyOpeningHoursState = useCallback(
    (
      profile: OpeningHoursProfileRecord | null,
      slots: OpeningHoursSlotRecord[] | undefined,
    ) => {
      const safeTimezone = profile?.timezone || timezone || getBrowserTimezone();
      setTimezone(
        timezoneOptions.includes(safeTimezone) ? safeTimezone : getBrowserTimezone(),
      );
      const resolvedSource = profile?.source === 'google' ? 'google' : 'manual';
      setSource(resolvedSource);
      setIs24x7(Boolean(profile?.is_24x7));
      setNotes(profile?.notes || '');
      setSyncedAt(profile?.synced_at || null);
      setDaySchedules(
        buildScheduleFromSlots(
          slots || [],
          Boolean(profile?.is_24x7),
        ),
      );
    },
    [timezone, timezoneOptions],
  );

  const loadOpeningHours = useCallback(async () => {
    if (!restaurant?.id) {
      setIsLoading(false);
      setHasGooglePlaceId(false);
      setSource('manual');
      setIs24x7(false);
      setNotes('');
      setSyncedAt(null);
      setDaySchedules(buildDefaultDaySchedule());
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/opening-hours`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as OpeningHoursApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to load opening hours.');
      }

      setHasGooglePlaceId(Boolean(payload.data.has_google_place_id));
      applyOpeningHoursState(payload.data.profile, payload.data.slots);

      if (payload.data.google_sync_error && !payload.data.profile) {
        setNotice({
          tone: 'error',
          message: payload.data.google_sync_error,
        });
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load opening hours.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [applyOpeningHoursState, fetchWithAuth, restaurant?.id]);

  useEffect(() => {
    void loadOpeningHours();
  }, [loadOpeningHours]);

  const setDayClosed = (dayOfWeek: number, closed: boolean) => {
    setDaySchedules((previous) =>
      previous.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        if (closed) {
          return {
            ...day,
            closed: true,
          };
        }

        return {
          ...day,
          closed: false,
          slots:
            day.slots.length > 0
              ? day.slots
              : [
                  {
                    id: createScheduleSlotId(day.dayOfWeek),
                    openTime: '09:00',
                    closeTime: '17:00',
                  },
                ],
        };
      }),
    );
  };

  const addBreakSlot = (dayOfWeek: number) => {
    setDaySchedules((previous) =>
      previous.map((day) => {
        if (day.dayOfWeek !== dayOfWeek || day.slots.length >= 5) {
          return day;
        }

        return {
          ...day,
          closed: false,
          slots: [
            ...day.slots,
            {
              id: createScheduleSlotId(day.dayOfWeek),
              openTime: '17:00',
              closeTime: '21:00',
            },
          ],
        };
      }),
    );
  };

  const removeBreakSlot = (dayOfWeek: number, slotId: string) => {
    setDaySchedules((previous) =>
      previous.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        const filtered = day.slots.filter((slot) => slot.id !== slotId);
        return {
          ...day,
          slots: filtered,
          closed: filtered.length === 0 ? true : day.closed,
        };
      }),
    );
  };

  const updateBreakSlotTime = (
    dayOfWeek: number,
    slotId: string,
    field: 'openTime' | 'closeTime',
    value: string,
  ) => {
    setDaySchedules((previous) =>
      previous.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        return {
          ...day,
          slots: day.slots.map((slot) =>
            slot.id === slotId
              ? {
                  ...slot,
                  [field]: value,
                }
              : slot,
          ),
        };
      }),
    );
  };

  const handleSaveManual = async () => {
    if (!restaurant?.id) {
      return;
    }

    const validationMessage = validateScheduleForSubmit(daySchedules, is24x7);
    if (validationMessage) {
      setNotice({
        tone: 'error',
        message: validationMessage,
      });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/opening-hours`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save_manual',
            timezone,
            is_24x7: is24x7,
            notes: notes.trim() || null,
            slots: scheduleToApiSlots(daySchedules, is24x7),
          }),
        },
      );
      const payload = (await response.json()) as OpeningHoursApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to save opening hours.');
      }

      applyOpeningHoursState(payload.data.profile, payload.data.slots);
      setNotice({
        tone: 'success',
        message: payload.message || 'Opening hours saved.',
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to save opening hours.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleSync = async () => {
    if (!restaurant?.id) {
      return;
    }

    if (!hasGooglePlaceId) {
      setNotice({
        tone: 'error',
        message: 'Google Place ID is missing for this restaurant.',
      });
      return;
    }

    setIsSyncing(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/opening-hours`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'sync_google',
            timezone,
          }),
        },
      );
      const payload = (await response.json()) as OpeningHoursApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to sync opening hours from Google.');
      }

      applyOpeningHoursState(payload.data.profile, payload.data.slots);
      setNotice({
        tone: 'success',
        message: payload.message || 'Opening hours synced from Google.',
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to sync opening hours from Google.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!restaurant) {
    return (
      <MyInfoWorkspaceShell activeTab="opening-hours">
        <SelectionRequiredCard target="Opening Hours" />
      </MyInfoWorkspaceShell>
    );
  }

  if (isLoading) {
    return (
      <MyInfoWorkspaceShell activeTab="opening-hours">
        <LoadingCard title="Opening Hours" />
      </MyInfoWorkspaceShell>
    );
  }

  return (
    <MyInfoWorkspaceShell activeTab="opening-hours">
      <Header
        title="Opening Hours"
        subtitle="Sync from Google or manage manual day-wise timing slots with break time."
        restaurantName={restaurant.name}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <section className="space-y-5 rounded-3xl border border-[#d7e2e6] bg-white p-6">
          <FormMessage notice={notice} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#111827]">* Timezone</span>
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
              >
                {timezoneOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[#d2dde2] px-4 py-3">
              <span className="text-sm font-medium text-[#111827]">Open 24 x 7</span>
              <input
                type="checkbox"
                checked={is24x7}
                onChange={(event) => setIs24x7(event.target.checked)}
                className="h-4 w-4 accent-[#6f4cf6]"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111827]">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Optional notes for operations."
              className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveManual()}
              disabled={isSaving || isSyncing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6f4cf6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5e3de1] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <PurpleDotSpinner size="inline" /> : null}
              {isSaving ? 'Saving...' : 'Save manual hours'}
            </button>

            <button
              type="button"
              onClick={() => void handleGoogleSync()}
              disabled={!hasGooglePlaceId || isSaving || isSyncing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#9eb7ff] px-5 py-2.5 text-sm font-semibold text-[#3f51b5] transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? <PurpleDotSpinner size="inline" /> : null}
              {isSyncing ? 'Syncing...' : 'Sync from Google'}
            </button>

            <button
              type="button"
              onClick={() => void loadOpeningHours()}
              disabled={isSaving || isSyncing}
              className="inline-flex items-center rounded-xl border border-[#d2dde2] px-4 py-2.5 text-sm font-semibold text-[#3c4a56] transition hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Refresh
            </button>
          </div>
        </section>

        <aside className="space-y-3 rounded-3xl border border-[#d7e2e6] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Profile status</h2>
          <dl className="space-y-2 text-sm text-[#5f6c78]">
            <div className="flex items-center justify-between gap-2">
              <dt>Source</dt>
              <dd className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#5b21b6]">
                {source}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Timezone</dt>
              <dd className="font-medium text-[#111827]">{timezone}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Mode</dt>
              <dd className="font-medium text-[#111827]">
                {is24x7 ? 'Open 24 x 7' : 'Custom slots'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Google profile</dt>
              <dd className={hasGooglePlaceId ? 'text-[#1f8b4c]' : 'text-[#a72b2b]'}>
                {hasGooglePlaceId ? 'Connected' : 'Not connected'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Last Google sync</dt>
              <dd className="font-medium text-[#111827]">
                {syncedAt ? new Date(syncedAt).toLocaleString() : 'Not synced yet'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#111827]">Weekly schedule</h2>
          <p className="text-xs font-medium text-[#6c7a87]">
            12-hour format. Add break slots and overnight ranges (example: 11:00 AM to 2:00 AM).
          </p>
        </div>

        {is24x7 ? (
          <div className="rounded-2xl border border-[#d7d2fe] bg-[#f5f3ff] p-4 text-sm text-[#4c2fc5]">
            Restaurant is marked as open 24 x 7. Turn this off to manage day-wise slots.
          </div>
        ) : null}

        <div className="space-y-3">
          {daySchedules.map((day) => (
            <article
              key={day.dayOfWeek}
              className={cx(
                'rounded-2xl border p-4',
                day.closed ? 'border-[#e3e8ee] bg-[#f9fbfd]' : 'border-[#d7d2fe] bg-[#fcfbff]',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[#111827]">{day.label}</h3>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#4b5563]">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    disabled={is24x7}
                    onChange={(event) => setDayClosed(day.dayOfWeek, event.target.checked)}
                    className="h-4 w-4 accent-[#6f4cf6]"
                  />
                  Closed
                </label>
              </div>

              {!day.closed ? (
                <div className="mt-3 space-y-2">
                  {day.slots.map((slot, index) => {
                    const slotHint = isOvernightRange(slot.openTime, slot.closeTime)
                      ? 'Overnight hours (closes next day)'
                      : day.slots.length > 1
                        ? `Session ${index + 1}`
                        : '';

                    return (
                      <div
                        key={slot.id}
                        className="grid gap-2 rounded-xl border border-[#dde4ea] bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#748493]">
                            Open
                          </p>
                          <TwelveHourTimeInput
                            value={slot.openTime}
                            onChange={(value) =>
                              updateBreakSlotTime(day.dayOfWeek, slot.id, 'openTime', value)
                            }
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#748493]">
                            Close
                          </p>
                          <TwelveHourTimeInput
                            value={slot.closeTime}
                            onChange={(value) =>
                              updateBreakSlotTime(day.dayOfWeek, slot.id, 'closeTime', value)
                            }
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeBreakSlot(day.dayOfWeek, slot.id)}
                            disabled={day.slots.length === 1}
                            className="inline-flex items-center rounded-lg border border-[#f3c5c5] px-3 py-2 text-xs font-semibold text-[#c73a3a] transition hover:bg-[#fff4f4] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                        {slotHint ? (
                          <p className="md:col-span-3 text-[11px] text-[#748493]">
                            {slotHint}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => addBreakSlot(day.dayOfWeek)}
                    disabled={day.slots.length >= 5}
                    className="inline-flex items-center rounded-lg border border-[#cfd9ff] px-3 py-1.5 text-xs font-semibold text-[#3f51b5] transition hover:bg-[#eff3ff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add break slot
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#6b7b88]">Closed for this day.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </MyInfoWorkspaceShell>
  );
}

function getBrowserTimezone() {
  const resolved =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  return typeof resolved === 'string' && resolved.trim() ? resolved.trim() : 'UTC';
}

function getTimezoneOptions() {
  const fallback = [
    'UTC',
    getBrowserTimezone(),
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Asia/Kolkata',
    'Europe/London',
  ];
  const intlWithSupported = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  const supported =
    typeof intlWithSupported.supportedValuesOf === 'function'
      ? intlWithSupported.supportedValuesOf('timeZone')
      : [];

  return Array.from(new Set([...fallback, ...supported])).sort((a, b) =>
    a.localeCompare(b),
  );
}

function createScheduleSlotId(dayOfWeek: number) {
  return `day-${dayOfWeek}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function buildDefaultDaySchedule() {
  return OPENING_HOURS_DAYS.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    label: day.label,
    closed: true,
    slots: [
      {
        id: createScheduleSlotId(day.dayOfWeek),
        openTime: '09:00',
        closeTime: '17:00',
      },
    ],
  })) satisfies DayScheduleState[];
}

function normalizeSlotTimeForUi(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}`;
}

function buildScheduleFromSlots(
  slots: OpeningHoursSlotRecord[],
  is24x7: boolean,
): DayScheduleState[] {
  if (is24x7) {
    return OPENING_HOURS_DAYS.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      closed: false,
      slots: [
        {
          id: createScheduleSlotId(day.dayOfWeek),
          openTime: '00:00',
          closeTime: '23:59',
        },
      ],
    }));
  }

  const slotsByDay = new Map<number, DayScheduleSlotState[]>();
  OPENING_HOURS_DAYS.forEach((day) => slotsByDay.set(day.dayOfWeek, []));

  for (const slot of slots) {
    if (!slot || slot.day_of_week < 1 || slot.day_of_week > 7 || slot.is_closed) {
      continue;
    }

    const openTime = normalizeSlotTimeForUi(slot.open_time);
    const closeTime = normalizeSlotTimeForUi(slot.close_time);
    if (!openTime || !closeTime) {
      continue;
    }

    const entry = slotsByDay.get(slot.day_of_week) ?? [];
    entry.push({
      id: slot.opening_hour_slot_id || createScheduleSlotId(slot.day_of_week),
      openTime,
      closeTime,
    });
    slotsByDay.set(slot.day_of_week, entry);
  }

  slotsByDay.forEach((entry, dayOfWeek) => {
    slotsByDay.set(
      dayOfWeek,
      entry.slice().sort((a, b) => toMinutes(a.openTime) - toMinutes(b.openTime)),
    );
  });

  const consumedByDay = new Map<number, Set<string>>();
  const mergedOvernightByDay = new Map<number, DayScheduleSlotState[]>();
  OPENING_HOURS_DAYS.forEach((day) => {
    consumedByDay.set(day.dayOfWeek, new Set<string>());
    mergedOvernightByDay.set(day.dayOfWeek, []);
  });

  for (const day of OPENING_HOURS_DAYS) {
    const nextDayOfWeek = getNextDayOfWeek(day.dayOfWeek);
    const currentDaySlots = slotsByDay.get(day.dayOfWeek) ?? [];
    const nextDaySlots = slotsByDay.get(nextDayOfWeek) ?? [];
    const currentConsumed = consumedByDay.get(day.dayOfWeek) ?? new Set<string>();
    const nextConsumed = consumedByDay.get(nextDayOfWeek) ?? new Set<string>();
    const overnightSlots = mergedOvernightByDay.get(day.dayOfWeek) ?? [];

    const lateSlots = currentDaySlots.filter(
      (slot) => slot.closeTime === '23:59' && !currentConsumed.has(slot.id),
    );
    const earlySlots = nextDaySlots.filter(
      (slot) => slot.openTime === '00:00' && !nextConsumed.has(slot.id),
    );

    while (lateSlots.length > 0 && earlySlots.length > 0) {
      const lateSlot = lateSlots.shift();
      const earlySlot = earlySlots.shift();
      if (!lateSlot || !earlySlot) {
        break;
      }

      currentConsumed.add(lateSlot.id);
      nextConsumed.add(earlySlot.id);
      overnightSlots.push({
        id: `${lateSlot.id}--overnight--${earlySlot.id}`,
        openTime: lateSlot.openTime,
        closeTime: earlySlot.closeTime,
      });
    }

    consumedByDay.set(day.dayOfWeek, currentConsumed);
    consumedByDay.set(nextDayOfWeek, nextConsumed);
    mergedOvernightByDay.set(day.dayOfWeek, overnightSlots);
  }

  return OPENING_HOURS_DAYS.map((day) => {
    const consumed = consumedByDay.get(day.dayOfWeek) ?? new Set<string>();
    const mergedOvernight = mergedOvernightByDay.get(day.dayOfWeek) ?? [];
    const openSlots = [
      ...mergedOvernight,
      ...(slotsByDay.get(day.dayOfWeek) ?? []).filter((slot) => !consumed.has(slot.id)),
    ].sort((a, b) => toMinutes(a.openTime) - toMinutes(b.openTime));

    if (!openSlots.length) {
      return {
        dayOfWeek: day.dayOfWeek,
        label: day.label,
        closed: true,
        slots: [
          {
            id: createScheduleSlotId(day.dayOfWeek),
            openTime: '09:00',
            closeTime: '17:00',
          },
        ],
      };
    }

    return {
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      closed: false,
      slots: openSlots,
    };
  });
}

function toApiTimeValue(value: string) {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}:00`;
}

function toMinutes(value: string) {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return NaN;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function getNextDayOfWeek(dayOfWeek: number) {
  return dayOfWeek === 7 ? 1 : dayOfWeek + 1;
}

function isOvernightRange(openTime: string, closeTime: string) {
  const openMinutes = toMinutes(openTime);
  const closeMinutes = toMinutes(closeTime);
  return (
    Number.isFinite(openMinutes) &&
    Number.isFinite(closeMinutes) &&
    closeMinutes < openMinutes
  );
}

type DayInterval = {
  start: number;
  end: number;
};

function getDayLabel(dayOfWeek: number) {
  return OPENING_HOURS_DAYS.find((entry) => entry.dayOfWeek === dayOfWeek)?.label || `Day ${dayOfWeek}`;
}

function buildDailyIntervalsFromSchedules(daySchedules: DayScheduleState[]) {
  const intervalsByDay = new Map<number, DayInterval[]>();
  OPENING_HOURS_DAYS.forEach((day) => intervalsByDay.set(day.dayOfWeek, []));

  daySchedules.forEach((day) => {
    if (day.closed) {
      return;
    }

    if (!day.slots.length) {
      throw new Error(`${day.label}: add at least one slot or mark the day as closed.`);
    }

    day.slots.forEach((slot) => {
      const openTime = toApiTimeValue(slot.openTime);
      const closeTime = toApiTimeValue(slot.closeTime);

      if (!openTime || !closeTime) {
        throw new Error(
          `${day.label}: invalid time format. Please choose time again in 12-hour picker.`,
        );
      }

      const openMinutes = toMinutes(slot.openTime);
      const closeMinutes = toMinutes(slot.closeTime);

      if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) {
        throw new Error(
          `${day.label}: invalid time format. Please choose time again in 12-hour picker.`,
        );
      }

      if (openMinutes === closeMinutes) {
        throw new Error(`${day.label}: open and close time cannot be the same.`);
      }

      const dayIntervals = intervalsByDay.get(day.dayOfWeek) ?? [];
      if (closeMinutes > openMinutes) {
        dayIntervals.push({
          start: openMinutes,
          end: closeMinutes,
        });
        intervalsByDay.set(day.dayOfWeek, dayIntervals);
        return;
      }

      dayIntervals.push({
        start: openMinutes,
        end: 1440,
      });
      intervalsByDay.set(day.dayOfWeek, dayIntervals);

      const nextDay = getNextDayOfWeek(day.dayOfWeek);
      const nextIntervals = intervalsByDay.get(nextDay) ?? [];
      nextIntervals.push({
        start: 0,
        end: closeMinutes,
      });
      intervalsByDay.set(nextDay, nextIntervals);
    });
  });

  return intervalsByDay;
}

function normalizeAndValidateIntervalsForDay(dayOfWeek: number, intervals: DayInterval[]) {
  const sorted = intervals
    .slice()
    .filter((entry) => entry.start < entry.end)
    .sort((a, b) => a.start - b.start);

  const merged: DayInterval[] = [];
  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...interval });
      return;
    }

    if (interval.start < previous.end) {
      throw new Error(`${getDayLabel(dayOfWeek)}: slots overlap. Adjust break timings.`);
    }

    if (interval.start === previous.end) {
      previous.end = interval.end;
      return;
    }

    merged.push({ ...interval });
  });

  if (merged.length > 5) {
    throw new Error(`${getDayLabel(dayOfWeek)}: maximum 5 break slots allowed.`);
  }

  return merged;
}

function minutesToApiTimeValue(minutes: number) {
  const bounded = Math.max(0, Math.min(1440, minutes));
  if (bounded >= 1440) {
    return '23:59:59';
  }

  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function validateScheduleForSubmit(daySchedules: DayScheduleState[], is24x7: boolean) {
  if (is24x7) {
    return null;
  }

  try {
    const intervalsByDay = buildDailyIntervalsFromSchedules(daySchedules);
    for (const day of OPENING_HOURS_DAYS) {
      const intervals = intervalsByDay.get(day.dayOfWeek) ?? [];
      normalizeAndValidateIntervalsForDay(day.dayOfWeek, intervals);
    }
  } catch (caughtError) {
    return caughtError instanceof Error
      ? caughtError.message
      : 'Invalid schedule. Please review opening hours.';
  }

  return null;
}

function scheduleToApiSlots(daySchedules: DayScheduleState[], is24x7: boolean) {
  if (is24x7) {
    return [];
  }

  const intervalsByDay = buildDailyIntervalsFromSchedules(daySchedules);

  const rows: Array<{
    day_of_week: number;
    slot_order: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
  }> = [];

  OPENING_HOURS_DAYS.forEach((day) => {
    const normalizedIntervals = normalizeAndValidateIntervalsForDay(
      day.dayOfWeek,
      intervalsByDay.get(day.dayOfWeek) ?? [],
    );

    if (!normalizedIntervals.length) {
      rows.push({
        day_of_week: day.dayOfWeek,
        slot_order: 1,
        is_closed: true,
        open_time: null,
        close_time: null,
      });
      return;
    }

    normalizedIntervals.forEach((slot, index) => {
      rows.push({
        day_of_week: day.dayOfWeek,
        slot_order: index + 1,
        is_closed: false,
        open_time: minutesToApiTimeValue(slot.start),
        close_time: minutesToApiTimeValue(slot.end),
      });
    });
  });

  return rows;
}

function TwelveHourTimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const parsed = parseTwelveHourTime(value);
  const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
  const minuteOptions = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, '0'),
  );

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={String(parsed.hour12)}
        onChange={(event) =>
          onChange(
            fromTwelveHourParts(
              Number(event.target.value),
              parsed.minute,
              parsed.meridiem,
            ),
          )
        }
        className="rounded-lg border border-[#d2dde2] px-2 py-1 text-sm text-[#111827] outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
      >
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>

      <span className="text-sm text-[#6b7280]">:</span>

      <select
        value={String(parsed.minute).padStart(2, '0')}
        onChange={(event) =>
          onChange(
            fromTwelveHourParts(
              parsed.hour12,
              Number(event.target.value),
              parsed.meridiem,
            ),
          )
        }
        className="rounded-lg border border-[#d2dde2] px-2 py-1 text-sm text-[#111827] outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
      >
        {minuteOptions.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>

      <select
        value={parsed.meridiem}
        onChange={(event) =>
          onChange(
            fromTwelveHourParts(
              parsed.hour12,
              parsed.minute,
              event.target.value === 'PM' ? 'PM' : 'AM',
            ),
          )
        }
        className="rounded-lg border border-[#d2dde2] px-2 py-1 text-sm text-[#111827] outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function parseTwelveHourTime(value: string) {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return {
      hour12: 9,
      minute: 0,
      meridiem: 'AM' as const,
    };
  }

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12Raw = hour24 % 12;

  return {
    hour12: hour12Raw === 0 ? 12 : hour12Raw,
    minute,
    meridiem,
  };
}

function fromTwelveHourParts(
  hour12: number,
  minute: number,
  meridiem: 'AM' | 'PM',
) {
  let hour = hour12 % 12;
  if (meridiem === 'PM') {
    hour += 12;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function MyInfoGoogleProfilePage() {
  const restaurant = useRestaurantScope();
  const { draft, isLoading, loadError, reload } = useRestaurantDraft(
    restaurant?.id ?? null,
  );
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleBusinessLink, setGoogleBusinessLink] = useState('');

  useEffect(() => {
    if (!draft) {
      return;
    }

    setGooglePlaceId(draft.googlePlaceId);
    setGoogleBusinessLink(draft.gmbLink);
  }, [draft]);

  if (!restaurant) {
    return (
      <MyInfoWorkspaceShell activeTab="google-profile">
        <SelectionRequiredCard target="Google profile" />
      </MyInfoWorkspaceShell>
    );
  }

  if (isLoading) {
    return (
      <MyInfoWorkspaceShell activeTab="google-profile">
        <LoadingCard title="Google profile" />
      </MyInfoWorkspaceShell>
    );
  }

  if (!draft || loadError) {
    return (
      <MyInfoWorkspaceShell activeTab="google-profile">
        <ErrorCard
          title="Google profile"
          message={loadError || 'Google profile details were not found.'}
          onRetry={reload}
        />
      </MyInfoWorkspaceShell>
    );
  }

  return (
    <MyInfoWorkspaceShell activeTab="google-profile">
      <Header
        title="Google profile"
        subtitle="Google place details for this restaurant (read-only)."
        restaurantName={restaurant.name}
      />

      <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <FormField
          label="Google Place ID"
          value={googlePlaceId}
          onChange={setGooglePlaceId}
          readOnly
        />
        <FormField
          label="Google Business Link"
          value={googleBusinessLink}
          onChange={setGoogleBusinessLink}
          readOnly
        />
      </div>
    </MyInfoWorkspaceShell>
  );
}

export function MyInfoGalleryPage() {
  const restaurant = useRestaurantScope();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [googlePhotos, setGooglePhotos] = useState<GoogleExternalMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(restaurant));
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [hasLoadedGooglePhotos, setHasLoadedGooglePhotos] = useState(false);
  const [importingPhotoId, setImportingPhotoId] = useState<string | null>(null);
  const [sessionImportedGooglePhotoIds, setSessionImportedGooglePhotoIds] =
    useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<MediaPreviewState>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
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
    },
    [],
  );

  const loadGallery = useCallback(async () => {
    if (!restaurant?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/admin/restaurant-media?restaurant_id=${encodeURIComponent(
          restaurant.id,
        )}`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as GalleryApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load gallery items.');
      }

      setItems(payload.data || []);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load gallery items.';
      setNotice({
        tone: 'error',
        message,
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, restaurant?.id]);

  const loadGooglePhotos = useCallback(async () => {
    if (!restaurant?.id) {
      setGooglePhotos([]);
      setIsGoogleLoading(false);
      setHasLoadedGooglePhotos(false);
      return;
    }

    setHasLoadedGooglePhotos(true);
    setIsGoogleLoading(true);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-photos`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as GooglePhotosApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load Google place media.');
      }

      setGooglePhotos(payload.data || []);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load Google place media.';
      setNotice({
        tone: 'error',
        message,
      });
      setGooglePhotos([]);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [fetchWithAuth, restaurant?.id]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    setSessionImportedGooglePhotoIds([]);
    setGooglePhotos([]);
    setHasLoadedGooglePhotos(false);
    setIsGoogleLoading(false);
  }, [restaurant?.id]);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewImage(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewImage]);

  if (!restaurant) {
    return <SelectionRequiredCard target="Media" />;
  }

  const buildActionKey = (
    action: 'hide' | 'delete' | 'download',
    mediaId: string,
  ) =>
    `${action}:${mediaId}`;

  const isVideoMimeType = (value: string | null | undefined) =>
    typeof value === 'string' && value.toLowerCase().startsWith('video/');

  const onDownloadMedia = async (
    mediaUrl: string,
    mediaId: string,
    kind: 'image' | 'video',
  ) => {
    const actionKey = buildActionKey('download', mediaId);
    setPendingActionKey(actionKey);

    try {
      const response = await fetch(mediaUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to download media file.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const extension =
        kind === 'video'
          ? blob.type.includes('webm')
            ? 'webm'
            : blob.type.includes('quicktime')
              ? 'mov'
              : 'mp4'
          : blob.type.includes('png')
            ? 'png'
            : blob.type.includes('webp')
              ? 'webp'
              : 'jpg';

      anchor.href = objectUrl;
      anchor.download = `media-${mediaId}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to download media.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setPendingActionKey((current) => (current === actionKey ? null : current));
    }
  };

  const onDeleteItem = async (mediaId: string) => {
    const actionKey = buildActionKey('delete', mediaId);
    setPendingActionKey(actionKey);
    setNotice(null);

    try {
      const response = await fetchWithAuth('/api/admin/restaurant-media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_id: mediaId,
        }),
      });

      const payload = (await response.json()) as DeleteMediaApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to remove gallery image.');
      }

      setNotice({
        tone: 'success',
        message:
          payload.action === 'hidden'
            ? 'Media hidden from gallery.'
            : 'Gallery media removed.',
      });
      await loadGallery();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to remove gallery image.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setPendingActionKey((current) => (current === actionKey ? null : current));
    }
  };

  const onHideItem = async (item: GalleryItem) => {
    const actionKey = buildActionKey('hide', item.id);
    setPendingActionKey(actionKey);
    setNotice(null);

    try {
      const response = await fetchWithAuth('/api/admin/restaurant-media', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_id: item.id,
          action: 'toggle_hidden',
          is_hidden: !item.is_hidden,
        }),
      });

      const payload = (await response.json()) as DeleteMediaApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update media visibility.');
      }

      setNotice({
        tone: 'success',
        message:
          payload.action === 'unhidden'
            ? 'Media is now visible.'
            : 'Media has been hidden.',
      });
      await loadGallery();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update media visibility.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setPendingActionKey((current) => (current === actionKey ? null : current));
    }
  };

  const onImportGooglePhoto = async (mediaId: string) => {
    if (!restaurant?.id) {
      return;
    }

    setImportingPhotoId(mediaId);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-photos/import`,
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

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to import Google media.');
      }

      setNotice({
        tone: 'success',
        message: 'Google media imported into gallery.',
      });
      setSessionImportedGooglePhotoIds((previous) =>
        previous.includes(mediaId) ? previous : [...previous, mediaId],
      );
      await loadGallery();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to import Google media.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setImportingPhotoId(null);
    }
  };

  const onUpload = async () => {
    setNotice({
      tone: 'success',
      message: 'Gallery media uploaded.',
    });
    await loadGallery();
  };

  const importedGooglePhotoIds = new Set(
    [
      ...sessionImportedGooglePhotoIds,
      ...items
        .filter((item) => item.source === 'google' && item.external_id)
        .map((item) => item.external_id as string),
    ],
  );
  const visibleItems = items.filter((item) => !item.is_hidden);
  const totalGooglePhotos = googlePhotos.filter((item) => item.kind === 'photo').length;
  const totalGoogleVideos = googlePhotos.filter((item) => item.kind === 'video').length;
  const totalGalleryItems = visibleItems.length;
  const totalGalleryVideos = visibleItems.filter((item) =>
    isVideoMimeType(item.type),
  ).length;
  const totalGalleryImages = Math.max(0, totalGalleryItems - totalGalleryVideos);
  const totalHiddenItems = items.filter((item) => item.is_hidden).length;

  return (
    <section className="space-y-6">
      <Header
        title="Media Studio"
        subtitle="Upload, preview, and manage restaurant gallery assets."
        restaurantName={restaurant.name}
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-gradient-to-br from-[#f8f4ff] via-white to-[#eef2ff] p-6 shadow-sm">
          <FormMessage notice={notice} />
          <FileUpload
            accept="both"
            label="Upload gallery media"
            description="Add restaurant images or videos to the gallery."
            restaurantId={restaurant.id}
            onUpload={onUpload}
          />
        </div>

        <div className="rounded-3xl border border-[#d7e2e6] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6d7c88]">
            Media overview
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#d9d9ff] bg-[#f5f3ff] px-4 py-3">
              <p className="text-xs font-medium text-[#6d6ca8]">Gallery images</p>
              <p className="mt-1 text-2xl font-semibold text-[#2b2c6f]">
                {totalGalleryImages}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d9d9ff] bg-[#f5f3ff] px-4 py-3">
              <p className="text-xs font-medium text-[#6d6ca8]">Google photos</p>
              <p className="mt-1 text-2xl font-semibold text-[#2b2c6f]">
                {totalGooglePhotos}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d9d9ff] bg-[#f5f3ff] px-4 py-3">
              <p className="text-xs font-medium text-[#6d6ca8]">Gallery videos</p>
              <p className="mt-1 text-2xl font-semibold text-[#2b2c6f]">
                {totalGalleryVideos}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d9d9ff] bg-[#f5f3ff] px-4 py-3">
              <p className="text-xs font-medium text-[#6d6ca8]">Google videos</p>
              <p className="mt-1 text-2xl font-semibold text-[#2b2c6f]">
                {totalGoogleVideos}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#6a7a87]">
            Use the top-right icons to view, download, hide, or delete quickly.
          </p>
          {totalHiddenItems > 0 ? (
            <p className="mt-1 text-xs font-medium text-[#6f4cf6]">
              Hidden images: {totalHiddenItems}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-gradient-to-br from-white via-[#fcfdff] to-[#f4f7ff] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#111827]">Google Place Media</h2>
          <button
            type="button"
            onClick={() => void loadGooglePhotos()}
            disabled={isGoogleLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#cfd9ff] px-3 py-2 text-xs font-semibold text-[#33429f] transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleLoading ? <PurpleDotSpinner size="inline" /> : null}
            {isGoogleLoading
              ? hasLoadedGooglePhotos
                ? 'Refreshing...'
                  : 'Loading...'
              : hasLoadedGooglePhotos
                ? 'Refresh'
                : 'Load Google Media'}
          </button>
        </div>

        {!hasLoadedGooglePhotos ? (
          <div className="rounded-2xl border border-dashed border-[#ced8f5] bg-[#f8fbff] px-4 py-5">
            <p className="text-sm text-[#4f5f7a]">
              Google preview is on-demand. Click <strong>Load Google Media</strong> to fetch
              latest photos/videos from Google.
            </p>
          </div>
        ) : isGoogleLoading ? (
          <div className="flex items-center gap-3 text-[#5f6c78]">
            <PurpleDotSpinner size="sm" />
            <p>Loading Google media...</p>
          </div>
        ) : googlePhotos.length === 0 ? (
          <p className="text-[#5f6c78]">No Google photos/videos found for this place.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {googlePhotos.map((media, index) => {
              const isImported = importedGooglePhotoIds.has(media.media_id);
              const isImporting = importingPhotoId === media.media_id;
              const isVideo = media.kind === 'video';

              return (
                <article
                  key={media.media_id}
                  className="group overflow-hidden rounded-2xl border border-[#d7e2e6] bg-[#f8fafb]"
                >
                  <div className="relative h-24 w-full overflow-hidden">
                    {isVideo ? (
                      <video
                        src={media.preview_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={media.preview_url}
                        alt={`Google place media ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <MediaActionIconButton
                        title="View media"
                        ariaLabel="View media"
                        onClick={() =>
                          setPreviewImage({
                            url: media.preview_url,
                            title: `Google ${isVideo ? 'video' : 'photo'} ${index + 1}`,
                            subtitle:
                              media.width && media.height
                                ? `${media.width} x ${media.height}`
                                : `Google Place ${isVideo ? 'video' : 'photo'}`,
                            kind: isVideo ? 'video' : 'image',
                          })
                        }
                      >
                        <ViewIcon />
                      </MediaActionIconButton>
                      <MediaActionIconButton
                        title="Download media"
                        ariaLabel="Download media"
                        onClick={() =>
                          void onDownloadMedia(
                            media.preview_url,
                            media.media_id,
                            isVideo ? 'video' : 'image',
                          )
                        }
                        disabled={Boolean(pendingActionKey)}
                      >
                        {pendingActionKey === buildActionKey('download', media.media_id) ? (
                          <PurpleDotSpinner size="icon" />
                        ) : (
                          <DownloadIcon />
                        )}
                      </MediaActionIconButton>
                    </div>
                    <p className="absolute bottom-1.5 left-2 text-[11px] font-medium uppercase text-white">
                      {isVideo ? 'video' : 'photo'}
                    </p>
                  </div>
                  <div className="flex items-center justify-end p-2.5">
                    <button
                      type="button"
                      disabled={isImported || isImporting}
                      onClick={() => void onImportGooglePhoto(media.media_id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#9eb7ff] px-2.5 py-1 text-[11px] font-semibold text-[#3f51b5] transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isImporting ? <PurpleDotSpinner size="inline" /> : null}
                      {isImported
                        ? 'Imported'
                        : isImporting
                          ? 'Importing...'
                          : 'Import to gallery'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#d7e2e6] bg-gradient-to-br from-white via-[#fcfdff] to-[#f6f7fb] p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#111827]">Existing Media</h2>
          <p className="text-xs font-medium text-[#6c7a87]">
            Hover image cards for quick actions
          </p>
        </div>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-3 text-[#5f6c78]">
            <PurpleDotSpinner size="sm" />
            <p>Loading gallery...</p>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-[#5f6c78]">No gallery media found yet.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {items.map((item, index) => {
              const deleteKey = buildActionKey('delete', item.id);
              const hideKey = buildActionKey('hide', item.id);
              const downloadKey = buildActionKey('download', item.id);
              const isDeleting = pendingActionKey === deleteKey;
              const isHiding = pendingActionKey === hideKey;
              const isDownloading = pendingActionKey === downloadKey;
              const actionsLocked = Boolean(pendingActionKey);
              const isVideo = isVideoMimeType(item.type);
              const isHidden = item.is_hidden;

              return (
                <article
                  key={item.id}
                  className={cx(
                    'group overflow-hidden rounded-2xl border bg-[#f8fafb]',
                    isHidden ? 'border-[#c6b8ff] opacity-65' : 'border-[#d7e2e6]',
                  )}
                >
                  <div className="relative h-24 w-full overflow-hidden">
                    {isVideo ? (
                      <video
                        src={item.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Gallery image ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />
                    {isHidden ? (
                      <span className="absolute left-2 top-2 rounded-md bg-[#6f4cf6cc] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Hidden
                      </span>
                    ) : null}
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <MediaActionIconButton
                        title="View media"
                        ariaLabel="View media"
                        onClick={() =>
                          setPreviewImage({
                            url: item.url,
                            title: `Gallery ${isVideo ? 'video' : 'image'} ${index + 1}`,
                            subtitle:
                              item.source === 'google'
                                ? 'Imported from Google'
                                : 'Uploaded manually',
                            kind: isVideo ? 'video' : 'image',
                          })
                        }
                        disabled={actionsLocked}
                      >
                        <ViewIcon />
                      </MediaActionIconButton>
                      <MediaActionIconButton
                        title="Download media"
                        ariaLabel="Download media"
                        onClick={() =>
                          void onDownloadMedia(item.url, item.id, isVideo ? 'video' : 'image')
                        }
                        disabled={actionsLocked}
                      >
                        {isDownloading ? <PurpleDotSpinner size="icon" /> : <DownloadIcon />}
                      </MediaActionIconButton>
                      <MediaActionIconButton
                        title={isHidden ? 'Unhide media' : 'Hide media'}
                        ariaLabel={isHidden ? 'Unhide media' : 'Hide media'}
                        onClick={() => void onHideItem(item)}
                        disabled={actionsLocked}
                      >
                        {isHiding ? (
                          <PurpleDotSpinner size="icon" />
                        ) : isHidden ? (
                          <ViewIcon />
                        ) : (
                          <HiddenIcon />
                        )}
                      </MediaActionIconButton>
                      <MediaActionIconButton
                        title="Delete media"
                        ariaLabel="Delete media"
                        onClick={() => void onDeleteItem(item.id)}
                        disabled={actionsLocked}
                        tone="danger"
                      >
                        {isDeleting ? <PurpleDotSpinner size="icon" /> : <DeleteIcon />}
                      </MediaActionIconButton>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-[11px] text-[#60707c]">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : 'Uploaded recently'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b122080] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl border border-[#cfd7df] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e3eaf0] px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0f172a]">{previewImage.title}</h3>
                <p className="text-xs text-[#5f6c78]">{previewImage.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d5dde5] text-[#374151] transition hover:bg-[#f4f7fa]"
                aria-label="Close preview"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="relative h-[70vh] min-h-[320px] bg-[#0f172a]">
              {previewImage.kind === 'video' ? (
                <video
                  src={previewImage.url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <Image
                  src={previewImage.url}
                  alt={previewImage.title}
                  fill
                  unoptimized
                  className="object-contain p-4"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildSocialLinksUpdatePayload({
  facebookLink,
  instagramLink,
  xLink,
  tiktokLink,
  youtubeLink,
}: {
  facebookLink: string;
  instagramLink: string;
  xLink: string;
  tiktokLink: string;
  youtubeLink: string;
}) {
  const payload: Record<string, string> = {};
  const facebook = facebookLink.trim();
  const instagram = instagramLink.trim();
  const x = xLink.trim();
  const tiktok = tiktokLink.trim();
  const youtube = youtubeLink.trim();

  if (facebook) {
    payload.facebook_link = facebook;
    payload.facebook_url = facebook;
  }
  if (instagram) {
    payload.instagram_link = instagram;
    payload.instagram_url = instagram;
  }
  if (x) {
    payload.x_link = x;
    payload.x_url = x;
    payload.twitter_link = x;
    payload.twitter_url = x;
  }
  if (tiktok) {
    payload.tiktok_link = tiktok;
    payload.tiktok_url = tiktok;
  }
  if (youtube) {
    payload.youtube_link = youtube;
    payload.youtube_url = youtube;
  }

  return payload;
}

function cx(...values: Array<string | null | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function ChevronRightIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cx('h-4 w-4 transition-transform', isExpanded ? 'rotate-90' : '')}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-[#90a0ad]"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 5 15 15" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

function MediaActionIconButton({
  children,
  title,
  ariaLabel,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: ReactNode;
  title: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border text-white shadow-sm backdrop-blur-sm transition',
        tone === 'danger'
          ? 'border-red-300/70 bg-red-600/70 hover:bg-red-700/80'
          : 'border-white/60 bg-black/55 hover:bg-black/75',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      )}
    >
      {children}
    </button>
  );
}

function ViewIcon() {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HiddenIcon() {
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
      <path d="M2 12s3.5-7 10-7c2 0 3.8.6 5.3 1.4" />
      <path d="M22 12s-3.5 7-10 7c-2 0-3.8-.6-5.3-1.4" />
      <path d="m3 3 18 18" />
      <path d="M9.8 9.8a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function DeleteIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function DownloadIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function PurpleDotSpinner({ size = 'sm' }: { size?: 'sm' | 'inline' | 'icon' }) {
  const dotSize = size === 'icon' ? 'h-1.5 w-1.5' : size === 'inline' ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5';
  const containerClass =
    size === 'icon'
      ? 'h-4 w-4'
      : size === 'inline'
        ? 'h-3.5 w-3.5'
        : 'h-7 w-7';

  return (
    <span
      className={cx('inline-grid grid-cols-2 grid-rows-2 gap-1', containerClass)}
      role="status"
      aria-label="Loading"
    >
      <span className={cx(dotSize, 'animate-[pulse_0.9s_ease-in-out_infinite] rounded-full bg-[#6f4cf6]')} />
      <span className={cx(dotSize, 'animate-[pulse_0.9s_ease-in-out_0.2s_infinite] rounded-full bg-[#8f6cff]')} />
      <span className={cx(dotSize, 'animate-[pulse_0.9s_ease-in-out_0.3s_infinite] rounded-full bg-[#9f84ff]')} />
      <span className={cx(dotSize, 'animate-[pulse_0.9s_ease-in-out_0.45s_infinite] rounded-full bg-[#b19dff]')} />
    </span>
  );
}

function BrandTabIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 10h18" />
      <path d="M8 4v6" />
    </svg>
  );
}

function AddressTabIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function OpeningHoursTabIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GoogleTabIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20a8 8 0 1 1 7.7-10H12v4h4.4A4.5 4.5 0 1 1 12 8" />
    </svg>
  );
}
