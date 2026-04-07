'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChangeEvent,
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import FileUpload from '@/components/ui/file-upload';
import Toast from '@/components/ui/toast';
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

interface RestaurantFaviconApiResponse {
  success: boolean;
  data?: {
    restaurant_id?: string;
    favicon_url?: string | null;
  };
  error?: string;
}

type MediaPreviewState = {
  url: string;
  title: string;
  subtitle: string;
  kind: 'image' | 'video';
} | null;

type MyInfoTabKey =
  | 'brand'
  | 'address'
  | 'opening-hours'
  | 'google-profile'
  | 'bank-accounts';

const PHONE_COUNTRY_CODES = [
  { value: '+1', label: '+1 (US/CA)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+91', label: '+91 (IN)' },
  { value: '+61', label: '+61 (AU)' },
  { value: '+64', label: '+64 (NZ)' },
  { value: '+81', label: '+81 (JP)' },
  { value: '+86', label: '+86 (CN)' },
  { value: '+49', label: '+49 (DE)' },
  { value: '+33', label: '+33 (FR)' },
  { value: '+39', label: '+39 (IT)' },
  { value: '+34', label: '+34 (ES)' },
  { value: '+55', label: '+55 (BR)' },
  { value: '+52', label: '+52 (MX)' },
  { value: '+82', label: '+82 (KR)' },
  { value: '+65', label: '+65 (SG)' },
  { value: '+60', label: '+60 (MY)' },
  { value: '+66', label: '+66 (TH)' },
  { value: '+62', label: '+62 (ID)' },
  { value: '+63', label: '+63 (PH)' },
  { value: '+84', label: '+84 (VN)' },
  { value: '+971', label: '+971 (AE)' },
  { value: '+966', label: '+966 (SA)' },
  { value: '+972', label: '+972 (IL)' },
  { value: '+90', label: '+90 (TR)' },
  { value: '+27', label: '+27 (ZA)' },
  { value: '+234', label: '+234 (NG)' },
  { value: '+254', label: '+254 (KE)' },
  { value: '+20', label: '+20 (EG)' },
  { value: '+92', label: '+92 (PK)' },
  { value: '+880', label: '+880 (BD)' },
  { value: '+94', label: '+94 (LK)' },
  { value: '+977', label: '+977 (NP)' },
  { value: '+47', label: '+47 (NO)' },
  { value: '+46', label: '+46 (SE)' },
  { value: '+45', label: '+45 (DK)' },
  { value: '+358', label: '+358 (FI)' },
  { value: '+31', label: '+31 (NL)' },
  { value: '+32', label: '+32 (BE)' },
  { value: '+41', label: '+41 (CH)' },
  { value: '+43', label: '+43 (AT)' },
  { value: '+48', label: '+48 (PL)' },
  { value: '+351', label: '+351 (PT)' },
  { value: '+353', label: '+353 (IE)' },
  { value: '+30', label: '+30 (GR)' },
  { value: '+7', label: '+7 (RU)' },
  { value: '+380', label: '+380 (UA)' },
  { value: '+40', label: '+40 (RO)' },
  { value: '+36', label: '+36 (HU)' },
  { value: '+420', label: '+420 (CZ)' },
  { value: '+54', label: '+54 (AR)' },
  { value: '+56', label: '+56 (CL)' },
  { value: '+57', label: '+57 (CO)' },
  { value: '+51', label: '+51 (PE)' },
];

const KNOWN_DIAL_CODES = PHONE_COUNTRY_CODES.map((c) => c.value).sort(
  (a, b) => b.length - a.length,
);

function splitPhoneCountryCode(phone: string): { code: string; number: string } {
  const trimmed = phone?.trim() || '';
  if (!trimmed.startsWith('+')) return { code: '+1', number: trimmed };
  for (const code of KNOWN_DIAL_CODES) {
    if (trimmed.startsWith(code)) return { code, number: trimmed.slice(code.length) };
  }
  return { code: '+1', number: trimmed.replace(/^\+/, '') };
}

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

type GoogleProfileDetailsRecord = {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  short_address: string | null;
  maps_url: string | null;
  website_url: string | null;
  phone_number: string | null;
  rating: number | null;
  user_rating_count: number | null;
  business_status: string | null;
  open_now: boolean | null;
  weekday_descriptions: string[];
  latitude: number | null;
  longitude: number | null;
  primary_type: string | null;
};

interface GoogleProfileDetailsApiResponse {
  success: boolean;
  data?: GoogleProfileDetailsRecord;
  error?: string;
}

type GooglePlaceMatchApiResponse = {
  success?: unknown;
  data?: {
    placeId?: unknown;
    name?: unknown;
    formattedAddress?: unknown;
    googleMapsUri?: unknown;
    websiteUri?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  } | null;
  error?: unknown;
  message?: unknown;
} | null;

type GooglePlaceSocialLinksApiResponse = {
  success?: unknown;
  data?: {
    websiteUrl?: unknown;
    googleBusinessLink?: unknown;
    facebookLink?: unknown;
    instagramLink?: unknown;
    xLink?: unknown;
    linkedinLink?: unknown;
    tiktokLink?: unknown;
    youtubeLink?: unknown;
    yelpLink?: unknown;
    ubereatsLink?: unknown;
    grubhubLink?: unknown;
    doordashLink?: unknown;
  } | null;
  error?: unknown;
  message?: unknown;
} | null;

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
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const paramsString = searchParams.toString();
  const fallbackRestaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
  const fallbackRestaurantName =
    searchParams.get('restaurant_name')?.trim() ?? 'restaurant';
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
        'bank-accounts': buildRestaurantInformationPath(
          restaurantScope.roleSegment,
          {
            id: restaurantScope.restaurantId,
            name: restaurantScope.restaurantNameFromSlug,
          },
          'bank-accounts',
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
        'bank-accounts': buildRestaurantInformationPath(
          dashboardBasePath.split('/')[2] || 'admin',
          fallbackRestaurant,
          'bank-accounts',
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
      'bank-accounts': fallbackPath,
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
  const pathname = usePathname() ?? '';
  const [pendingTab, setPendingTab] = useState<MyInfoTabKey | null>(null);

  useEffect(() => {
    if (!pendingTab) {
      return;
    }
    setPendingTab(null);
  }, [pathname, pendingTab]);

  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-bold tracking-tight text-gray-900">
            Information
          </h2>
        </div>
        <nav className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 text-gray-900 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-50/50 hover:text-gray-900'
                }`}
              >
                {pendingTab === tab.key ? (
                  <PurpleDotSpinner size="inline" />
                ) : (
                  <span
                    className={`transition-colors ${isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-purple-500'}`}
                  >
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
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
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

async function fetchRestaurantFaviconSnapshot(restaurantId: string) {
  try {
    const response = await fetch(
      `/api/restaurant-favicon?restaurant_id=${encodeURIComponent(restaurantId)}`,
      {
        cache: 'no-store',
      },
    );
    const payload = (await response.json()) as RestaurantFaviconApiResponse;

    if (!response.ok || !payload.success || !payload.data) {
      return null;
    }

    const faviconUrl =
      typeof payload.data.favicon_url === 'string'
        ? payload.data.favicon_url.trim()
        : '';
    if (!faviconUrl) {
      return null;
    }

    return {
      faviconUrl,
    };
  } catch {
    return null;
  }
}

function useRestaurantDraft(
  restaurantId: string | null,
  options?: { hydrateFavicon?: boolean },
) {
  const hydrateFavicon = Boolean(options?.hydrateFavicon);
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
      const faviconSnapshotPromise = hydrateFavicon
        ? fetchRestaurantFaviconSnapshot(restaurantId)
        : Promise.resolve(null);

      const [loadedDraft, faviconSnapshot] = await Promise.all([
        getRestaurantDraftById(restaurantId),
        faviconSnapshotPromise,
      ]);
      let nextDraft = loadedDraft;

      if (!nextDraft) {
        setDraft(null);
        setLoadError('Restaurant details were not found for this selection.');
        return;
      }

      if (
        hydrateFavicon &&
        !nextDraft.faviconUrl &&
        faviconSnapshot
      ) {
        nextDraft = {
          ...nextDraft,
          faviconUrl: faviconSnapshot.faviconUrl,
        };
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
  }, [hydrateFavicon, restaurantId]);

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
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">
        {target}
      </h1>
      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <h2 className="text-3xl font-semibold text-[#111827]">
          Select a restaurant
        </h2>
        <p className="mt-3 text-lg text-[#5f6c78]">
          Select a restaurant from the search box to manage{' '}
          {target.toLowerCase()}.
        </p>
      </div>
    </section>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-[#101827]">
        {title}
      </h1>
      <div className="flex items-center gap-3 rounded-3xl border border-[#d7e2e6] bg-white p-8 text-sm text-[#5f6c78]">
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
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">
        {title}
      </h1>
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
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
        <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="text-sm text-gray-600">{subtitle}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-purple-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {restaurantName}
        </p>
      </div>
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
    { hydrateFavicon: true },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [toastNotice, setToastNotice] = useState<SaveNotice | null>(null);
  const [legalName, setLegalName] = useState('');
  const [smsName, setSmsName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pocPhoneCountryCode, setPocPhoneCountryCode] = useState('+1');
  const [pocPhone, setPocPhone] = useState('');
  const [pocEmail, setPocEmail] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [serviceModel, setServiceModel] = useState('');
  const [serviceModelOptions, setServiceModelOptions] = useState<string[]>([]);
  const [isServiceModelsLoading, setIsServiceModelsLoading] = useState(true);
  const [facebookLink, setFacebookLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [xLink, setXLink] = useState('');
  const [linkedinLink, setLinkedinLink] = useState('');
  const [tiktokLink, setTiktokLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [googleBusinessLink, setGoogleBusinessLink] = useState('');
  const [yelpLink, setYelpLink] = useState('');
  const [ubereatsLink, setUbereatsLink] = useState('');
  const [grubhubLink, setGrubhubLink] = useState('');
  const [doordashLink, setDoordashLink] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState('');
  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [cuisineSearchTerm, setCuisineSearchTerm] = useState('');
  const [selectedCuisineTypes, setSelectedCuisineTypes] = useState<string[]>(
    [],
  );
  const [cuisineCategories, setCuisineCategories] = useState<
    CuisineTypeCategory[]
  >([]);
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
    const parsedPhone = splitPhoneCountryCode(draft.phoneNumber);
    setPhoneCountryCode(parsedPhone.code);
    setPhoneNumber(parsedPhone.number);
    const parsedPocPhone = splitPhoneCountryCode(draft.pocPhoneNumber);
    setPocPhoneCountryCode(parsedPocPhone.code);
    setPocPhone(parsedPocPhone.number);
    setPocEmail(draft.pocEmail);
    setEmail(draft.email);
    setBusinessType(draft.businessType);
    setServiceModel(draft.serviceModel);
    setSelectedCuisineTypes(draft.cuisineTypes);
    setFacebookLink(draft.facebookLink || '');
    setInstagramLink(draft.instagramLink || '');
    setXLink(draft.xLink || '');
    setLinkedinLink(draft.linkedinLink || '');
    setTiktokLink(draft.tiktokLink || '');
    setYoutubeLink(draft.youtubeLink || '');
    setGoogleBusinessLink(draft.gmbLink || '');
    setYelpLink(draft.yelpLink || '');
    setUbereatsLink(draft.ubereatsLink || '');
    setGrubhubLink(draft.grubhubLink || '');
    setDoordashLink(draft.doordashLink || '');
    setLogoUrl(draft.logo || '');
    setFaviconUrl(draft.faviconUrl || '');
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

        const names = models.map((model) => model.name.trim()).filter(Boolean);
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
        const categoryMatches = category.label
          .toLowerCase()
          .includes(normalizedSearch);
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

  const uploadLogo = async (file: File) => {
    if (!restaurant?.id) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setNotice({
        tone: 'error',
        message: 'Only image files are allowed for logo upload.',
      });
      return;
    }

    setIsLogoUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurant.id);

      const response = await fetch('/api/upload-optimized-media', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { file_id?: string; url?: string };
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.file_id) {
        throw new Error(payload.error || 'Failed to upload logo.');
      }

      const nextLogoUrl =
        payload.data.url ||
        `/api/image-proxy?fileId=${encodeURIComponent(payload.data.file_id)}`;

      setLogoUrl(nextLogoUrl);
      setNotice({
        tone: 'success',
        message: 'Logo uploaded. Click Save brand to apply changes.',
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to upload logo.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const onLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void uploadLogo(file);
    event.target.value = '';
  };

  const onRemoveLogo = () => {
    setLogoUrl('');
    setNotice({
      tone: 'success',
      message: 'Logo removed. Click Save brand to apply changes.',
    });
  };

  const uploadFavicon = async (file: File) => {
    if (!restaurant?.id) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setNotice({
        tone: 'error',
        message: 'Only image files are allowed for favicon upload.',
      });
      return;
    }

    setIsFaviconUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurant.id);

      const response = await fetch('/api/upload-optimized-media', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { file_id?: string; url?: string };
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.file_id) {
        throw new Error(payload.error || 'Failed to upload favicon.');
      }

      const nextFaviconUrl =
        payload.data.url ||
        `/api/image-proxy?fileId=${encodeURIComponent(payload.data.file_id)}`;

      setFaviconUrl(nextFaviconUrl);
      setNotice({
        tone: 'success',
        message: 'Favicon uploaded. Click Save brand to apply changes.',
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to upload favicon.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsFaviconUploading(false);
    }
  };

  const onFaviconFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void uploadFavicon(file);
    event.target.value = '';
  };

  const onRemoveFavicon = () => {
    setFaviconUrl('');
    setNotice({
      tone: 'success',
      message: 'Favicon removed. Click Save brand to apply changes.',
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setToastNotice(null);

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
      linkedinLink,
      tiktokLink,
      youtubeLink,
      googleBusinessLink,
      yelpLink,
      ubereatsLink,
      grubhubLink,
      doordashLink,
    });

    setIsSaving(true);

    try {
      const currentFaviconUrl = faviconUrl.trim();
      const existingFaviconUrl = (draft.faviconUrl || '').trim();
      const shouldSyncFavicon =
        currentFaviconUrl !== existingFaviconUrl;

      await updateRestaurant(restaurant.id, {
        name: trimmedLegalName,
        sms_name: trimmedSmsName,
        phone_number: `${phoneCountryCode}${phoneNumber.trim()}`,
        email: email.trim(),
        poc_phone_number: `${pocPhoneCountryCode}${pocPhone.trim()}`,
        poc_email: pocEmail.trim(),
        business_type: businessType.trim(),
        service_model: serviceModel.trim(),
        cuisine_types: selectedCuisineTypes
          .map((entry) => entry.trim())
          .filter(Boolean),
        logo: logoUrl.trim() || null,
        favicon_url: currentFaviconUrl || null,
        ...socialLinksPayload,
      });

      if (shouldSyncFavicon) {
        try {
          const faviconResponse = await fetch('/api/restaurant-favicon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              restaurant_id: restaurant.id,
              favicon_url: currentFaviconUrl || null,
            }),
          });

          const faviconPayload = (await faviconResponse.json()) as {
            success?: boolean;
            error?: string;
          };

          if (!faviconResponse.ok || !faviconPayload.success) {
            setNotice({
              tone: 'error',
              message:
                faviconPayload.error ||
                'Brand details were saved, but favicon failed to sync.',
            });
          }
        } catch {
          setNotice({
            tone: 'error',
            message: 'Brand details were saved, but favicon failed to sync.',
          });
        }
      }

      setToastNotice({
        tone: 'success',
        message: 'Brand details updated successfully.',
      });
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
      {toastNotice ? (
        <Toast
          message={toastNotice.message}
          type={toastNotice.tone === 'success' ? 'success' : 'error'}
          onClose={() => setToastNotice(null)}
        />
      ) : null}
      <Header
        title="Brand"
        subtitle="Manage legal name, SMS name, business model, and cuisine setup."
        restaurantName={restaurant.name}
      />

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <FormMessage notice={notice} />

        <div className="rounded-2xl border border-[#d7e2e6] bg-[#f8fafb] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">Logo</h3>
              <p className="text-xs text-[#5f6c78]">
                Upload restaurant logo (PNG/JPG/WebP, upto 5MB, Prefer below
                1MB).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="brand-logo-upload"
                type="file"
                accept="image/*"
                onChange={onLogoFileChange}
                disabled={isSaving || isLogoUploading}
                className="hidden"
              />
              <label
                htmlFor="brand-logo-upload"
                className={cx(
                  'inline-flex cursor-pointer items-center rounded-xl border px-4 py-2 text-sm font-semibold transition',
                  isSaving || isLogoUploading
                    ? 'cursor-not-allowed border-[#d7dfea] bg-[#eef2f7] text-[#8b98a5] pointer-events-none'
                    : 'border-[#bac8d5] bg-white text-[#2a3a4d] hover:bg-[#f2f6fb]',
                )}
              >
                {isLogoUploading
                  ? 'Uploading...'
                  : logoUrl
                    ? 'Replace logo'
                    : 'Upload logo'}
              </label>
              {logoUrl ? (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  disabled={isSaving || isLogoUploading}
                  className="inline-flex items-center rounded-xl border border-[#efc4c4] bg-white px-4 py-2 text-sm font-semibold text-[#c23939] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-[#d7e2e6] bg-white">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${legalName || restaurant.name} logo`}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-[10px] font-medium text-[#8b98a5]">
                  No logo
                </span>
              )}
            </div>
          </div>

        </div>

        <div className="rounded-2xl border border-[#d7e2e6] bg-[#f8fafb] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">Favicon</h3>
              <p className="text-xs text-[#5f6c78]">
                Upload browser tab icon (PNG/JPG/ICO/WebP, upto 5MB, Prefer
                below 1MB).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="brand-favicon-upload"
                type="file"
                accept="image/*,.ico"
                onChange={onFaviconFileChange}
                disabled={isSaving || isFaviconUploading}
                className="hidden"
              />
              <label
                htmlFor="brand-favicon-upload"
                className={cx(
                  'inline-flex cursor-pointer items-center rounded-xl border px-4 py-2 text-sm font-semibold transition',
                  isSaving || isFaviconUploading
                    ? 'cursor-not-allowed border-[#d7dfea] bg-[#eef2f7] text-[#8b98a5] pointer-events-none'
                    : 'border-[#bac8d5] bg-white text-[#2a3a4d] hover:bg-[#f2f6fb]',
                )}
              >
                {isFaviconUploading
                  ? 'Uploading...'
                  : faviconUrl
                    ? 'Replace favicon'
                    : 'Upload favicon'}
              </label>
              {faviconUrl ? (
                <button
                  type="button"
                  onClick={onRemoveFavicon}
                  disabled={isSaving || isFaviconUploading}
                  className="inline-flex items-center rounded-xl border border-[#efc4c4] bg-white px-4 py-2 text-sm font-semibold text-[#c23939] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#d7e2e6] bg-white">
              {faviconUrl ? (
                <Image
                  src={faviconUrl}
                  alt={`${legalName || restaurant.name} favicon`}
                  width={48}
                  height={48}
                  unoptimized
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-[10px] font-medium text-[#8b98a5]">
                  No icon
                </span>
              )}
            </div>
          </div>
        </div>

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
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111827]">Phone number</span>
            <div className="flex gap-2">
              <select
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                className="h-[50px] w-[130px] shrink-0 rounded-xl border border-[#d2dde2] bg-white px-2 text-sm text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
              >
                {PHONE_COUNTRY_CODES.map((cc) => (
                  <option key={cc.value} value={cc.value}>{cc.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
              />
            </div>
          </label>
          <FormField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111827]">POC phone number</span>
            <div className="flex gap-2">
              <select
                value={pocPhoneCountryCode}
                onChange={(e) => setPocPhoneCountryCode(e.target.value)}
                className="h-[50px] w-[130px] shrink-0 rounded-xl border border-[#d2dde2] bg-white px-2 text-sm text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
              >
                {PHONE_COUNTRY_CODES.map((cc) => (
                  <option key={cc.value} value={cc.value}>{cc.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={pocPhone}
                onChange={(e) => setPocPhone(e.target.value)}
                className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#667eea] focus:ring-2 focus:ring-[#ddd6fe]"
              />
            </div>
          </label>
          <FormField
            label="POC email"
            value={pocEmail}
            onChange={setPocEmail}
            type="email"
          />
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

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                Cuisine Types
              </h3>
              <p className="text-sm text-gray-600">
                Select all cuisine types that describe your restaurant
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={cuisineSearchTerm}
              onChange={(event) => setCuisineSearchTerm(event.target.value)}
              placeholder="Search cuisine types..."
              className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>

          {selectedCuisineTypes.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedCuisineTypes.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-800"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => onCuisineTypeToggle(label)}
                    className="rounded-full p-0.5 transition hover:bg-purple-200"
                    aria-label="Remove cuisine"
                  >
                    <CloseIcon />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {isCuisineLoading ? (
              <div className="flex items-center justify-center px-4 py-8">
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Loading cuisines...</span>
                </div>
              </div>
            ) : null}

            {cuisineError ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {cuisineError}
              </div>
            ) : null}

            {!isCuisineLoading &&
            !cuisineError &&
            !filteredCuisineCategories.length ? (
              <p className="px-4 py-3 text-sm text-gray-500">
                No cuisine categories found.
              </p>
            ) : null}

            {filteredCuisineCategories.map((category) => {
              const isExpanded = expandedCategories[category.id] ?? false;

              return (
                <div
                  key={category.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategories((previous) => ({
                        ...previous,
                        [category.id]: !isExpanded,
                      }))
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                  >
                    <ChevronRightIcon isExpanded={isExpanded} />
                    {category.label}
                  </button>

                  {isExpanded ? (
                    <div className="grid gap-2 border-t border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {category.cuisineTypes.map((type) => {
                        const isSelected = selectedCuisineTypes.includes(
                          type.label,
                        );

                        return (
                          <button
                            key={`${category.id}-${type.id}`}
                            type="button"
                            onClick={() => onCuisineTypeToggle(type.label)}
                            className={cx(
                              'rounded-lg border px-3 py-2 text-left text-sm font-medium transition',
                              isSelected
                                ? 'border-purple-500 bg-purple-100 text-purple-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
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
            label="Google business link"
            value={googleBusinessLink}
            onChange={setGoogleBusinessLink}
            readOnly
          />
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
          <FormField
            label="X (Twitter) link"
            value={xLink}
            onChange={setXLink}
          />
          <FormField
            label="LinkedIn link"
            value={linkedinLink}
            onChange={setLinkedinLink}
          />
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
          <FormField
            label="Yelp link"
            value={yelpLink}
            onChange={setYelpLink}
          />
          <FormField
            label="Uber Eats link"
            value={ubereatsLink}
            onChange={setUbereatsLink}
          />
          <FormField
            label="Grubhub link"
            value={grubhubLink}
            onChange={setGrubhubLink}
          />
          <FormField
            label="DoorDash link"
            value={doordashLink}
            onChange={setDoordashLink}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-purple-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Brand Information
            </>
          )}
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
  const [toastNotice, setToastNotice] = useState<SaveNotice | null>(null);
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
    setToastNotice(null);
    setIsSaving(true);

    try {
      await updateRestaurant(restaurant.id, {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postal_code: postalCode.trim(),
      });

      setToastNotice({
        tone: 'success',
        message: 'Address details updated successfully.',
      });
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
      {toastNotice ? (
        <Toast
          message={toastNotice.message}
          type={toastNotice.tone === 'success' ? 'success' : 'error'}
          onClose={() => setToastNotice(null)}
        />
      ) : null}
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
        <FormField
          label="Address"
          value={address}
          onChange={setAddress}
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="City" value={city} onChange={setCity} required />
          <FormField label="State" value={state} onChange={setState} required />
          <FormField
            label="Country"
            value={country}
            onChange={setCountry}
            required
          />
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
  const [savingDayOfWeek, setSavingDayOfWeek] = useState<number | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [toastNotice, setToastNotice] = useState<SaveNotice | null>(null);
  const [source, setSource] = useState<'google' | 'manual'>('manual');
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [is24x7, setIs24x7] = useState(false);
  const [notes, setNotes] = useState('');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [hasGooglePlaceId, setHasGooglePlaceId] = useState(false);
  const [daySchedules, setDaySchedules] = useState<DayScheduleState[]>(
    buildDefaultDaySchedule,
  );
  const [persistedDaySchedules, setPersistedDaySchedules] = useState<
    DayScheduleState[]
  >(buildDefaultDaySchedule);
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const dirtyDayOfWeeks = useMemo(() => {
    const persistedByDay = new Map(
      persistedDaySchedules.map((day) => [day.dayOfWeek, day]),
    );

    return new Set(
      daySchedules
        .filter((day) => {
          const persistedDay = persistedByDay.get(day.dayOfWeek);
          if (!persistedDay) {
            return true;
          }
          return !areDaySchedulesEquivalent(day, persistedDay);
        })
        .map((day) => day.dayOfWeek),
    );
  }, [daySchedules, persistedDaySchedules]);

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
      const safeTimezone =
        profile?.timezone || timezone || getBrowserTimezone();
      setTimezone(
        timezoneOptions.includes(safeTimezone)
          ? safeTimezone
          : getBrowserTimezone(),
      );
      const resolvedSource = profile?.source === 'google' ? 'google' : 'manual';
      setSource(resolvedSource);
      setIs24x7(Boolean(profile?.is_24x7));
      setNotes(profile?.notes || '');
      setSyncedAt(profile?.synced_at || null);
      const nextSchedules = buildScheduleFromSlots(
        slots || [],
        Boolean(profile?.is_24x7),
      );
      setDaySchedules(nextSchedules);
      setPersistedDaySchedules(nextSchedules);
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
      const defaults = buildDefaultDaySchedule();
      setDaySchedules(defaults);
      setPersistedDaySchedules(defaults);
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

  const buildScheduleForSingleDaySave = useCallback(
    (targetDayOfWeek: number) => {
      const currentByDay = new Map(
        daySchedules.map((day) => [day.dayOfWeek, day]),
      );
      const persistedByDay = new Map(
        persistedDaySchedules.map((day) => [day.dayOfWeek, day]),
      );

      return OPENING_HOURS_DAYS.map((day) => {
        const fallbackDay = {
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
        } satisfies DayScheduleState;

        if (day.dayOfWeek === targetDayOfWeek) {
          return (
            currentByDay.get(day.dayOfWeek) ||
            persistedByDay.get(day.dayOfWeek) ||
            fallbackDay
          );
        }

        return (
          persistedByDay.get(day.dayOfWeek) ||
          currentByDay.get(day.dayOfWeek) ||
          fallbackDay
        );
      });
    },
    [daySchedules, persistedDaySchedules],
  );

  const handleSaveManualDay = async (dayOfWeek: number) => {
    if (!restaurant?.id) {
      return;
    }

    const scheduleForSave = buildScheduleForSingleDaySave(dayOfWeek);
    const validationMessage = validateScheduleForSubmit(
      scheduleForSave,
      is24x7,
    );
    if (validationMessage) {
      setNotice({
        tone: 'error',
        message: validationMessage,
      });
      return;
    }

    setIsSaving(true);
    setSavingDayOfWeek(dayOfWeek);
    setNotice(null);
    setToastNotice(null);

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
            slots: scheduleToApiSlots(scheduleForSave, is24x7),
          }),
        },
      );
      const payload = (await response.json()) as OpeningHoursApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to save opening hours.');
      }

      applyOpeningHoursState(payload.data.profile, payload.data.slots);
      setToastNotice({
        tone: 'success',
        message: payload.message || `${getDayLabel(dayOfWeek)} hours saved.`,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to save opening hours.';
      setToastNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
      setSavingDayOfWeek(null);
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
      {toastNotice ? (
        <Toast
          message={toastNotice.message}
          type={toastNotice.tone === 'success' ? 'success' : 'error'}
          onClose={() => setToastNotice(null)}
        />
      ) : null}
      <Header
        title="Opening Hours"
        subtitle="Manage day-wise timing slots"
        restaurantName={restaurant.name}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <section className="space-y-5 rounded-3xl border border-[#d7e2e6] bg-white p-6">
          <FormMessage notice={notice} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#111827]">
                * Timezone
              </span>
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
              <span className="text-sm font-medium text-[#111827]">
                Open 24 x 7
              </span>
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
        </section>

        <aside className="space-y-3 rounded-3xl border border-[#d7e2e6] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#111827]">
            Profile status
          </h2>
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
              <dd
                className={
                  hasGooglePlaceId ? 'text-[#1f8b4c]' : 'text-[#a72b2b]'
                }
              >
                {hasGooglePlaceId ? 'Connected' : 'Not connected'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Last Google sync</dt>
              <dd className="font-medium text-[#111827]">
                {syncedAt
                  ? new Date(syncedAt).toLocaleString()
                  : 'Not synced yet'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#111827]">
            Weekly schedule
          </h2>
          <p className="text-xs font-medium text-[#6c7a87]">
            12-hour format. Add break slots and overnight ranges (example: 11:00
            AM to 2:00 AM).
          </p>
        </div>

        {is24x7 ? (
          <div className="rounded-2xl border border-[#d7d2fe] bg-[#f5f3ff] p-4 text-sm text-[#4c2fc5]">
            Restaurant is marked as open 24 x 7. Turn this off to manage
            day-wise slots.
          </div>
        ) : null}

        <div className="space-y-3">
          {daySchedules.map((day) => (
            <article
              key={day.dayOfWeek}
              className={cx(
                'rounded-2xl border p-4',
                day.closed
                  ? 'border-[#e3e8ee] bg-[#f9fbfd]'
                  : 'border-[#d7d2fe] bg-[#fcfbff]',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[#111827]">
                  {day.label}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveManualDay(day.dayOfWeek)}
                    disabled={
                      is24x7 || isSaving || !dirtyDayOfWeeks.has(day.dayOfWeek)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#6f4cf6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#5e3de1] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving && savingDayOfWeek === day.dayOfWeek ? (
                      <PurpleDotSpinner size="inline" />
                    ) : null}
                    {isSaving && savingDayOfWeek === day.dayOfWeek
                      ? 'Saving...'
                      : 'Save'}
                  </button>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[#4b5563]">
                    <input
                      type="checkbox"
                      checked={day.closed}
                      disabled={is24x7}
                      onChange={(event) =>
                        setDayClosed(day.dayOfWeek, event.target.checked)
                      }
                      className="h-4 w-4 accent-[#6f4cf6]"
                    />
                    Closed
                  </label>
                </div>
              </div>

              {!day.closed ? (
                <div className="mt-3 space-y-2">
                  {day.slots.map((slot, index) => {
                    const slotHint = isOvernightRange(
                      slot.openTime,
                      slot.closeTime,
                    )
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
                              updateBreakSlotTime(
                                day.dayOfWeek,
                                slot.id,
                                'openTime',
                                value,
                              )
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
                              updateBreakSlotTime(
                                day.dayOfWeek,
                                slot.id,
                                'closeTime',
                                value,
                              )
                            }
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              removeBreakSlot(day.dayOfWeek, slot.id)
                            }
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
                <p className="mt-3 text-sm text-[#6b7b88]">
                  Closed for this day.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </MyInfoWorkspaceShell>
  );
}

function normalizeDaySlotsForDirtyCompare(day: DayScheduleState) {
  if (day.closed) {
    return [] as Array<{ openTime: string; closeTime: string }>;
  }

  return day.slots
    .map((slot) => ({
      openTime: slot.openTime,
      closeTime: slot.closeTime,
    }))
    .sort((left, right) => {
      const openDiff = toMinutes(left.openTime) - toMinutes(right.openTime);
      if (openDiff !== 0) {
        return openDiff;
      }
      return toMinutes(left.closeTime) - toMinutes(right.closeTime);
    });
}

function areDaySchedulesEquivalent(
  left: DayScheduleState,
  right: DayScheduleState,
) {
  if (left.closed !== right.closed) {
    return false;
  }

  const leftSlots = normalizeDaySlotsForDirtyCompare(left);
  const rightSlots = normalizeDaySlotsForDirtyCompare(right);
  if (leftSlots.length !== rightSlots.length) {
    return false;
  }

  return leftSlots.every((slot, index) => {
    const rightSlot = rightSlots[index];
    return (
      rightSlot != null &&
      slot.openTime === rightSlot.openTime &&
      slot.closeTime === rightSlot.closeTime
    );
  });
}

function getBrowserTimezone() {
  const resolved =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  return typeof resolved === 'string' && resolved.trim()
    ? resolved.trim()
    : 'UTC';
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
    if (
      !slot ||
      slot.day_of_week < 1 ||
      slot.day_of_week > 7 ||
      slot.is_closed
    ) {
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
      entry
        .slice()
        .sort((a, b) => toMinutes(a.openTime) - toMinutes(b.openTime)),
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
    const currentConsumed =
      consumedByDay.get(day.dayOfWeek) ?? new Set<string>();
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
      ...(slotsByDay.get(day.dayOfWeek) ?? []).filter(
        (slot) => !consumed.has(slot.id),
      ),
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
  return (
    OPENING_HOURS_DAYS.find((entry) => entry.dayOfWeek === dayOfWeek)?.label ||
    `Day ${dayOfWeek}`
  );
}

function buildDailyIntervalsFromSchedules(daySchedules: DayScheduleState[]) {
  const intervalsByDay = new Map<number, DayInterval[]>();
  OPENING_HOURS_DAYS.forEach((day) => intervalsByDay.set(day.dayOfWeek, []));

  daySchedules.forEach((day) => {
    if (day.closed) {
      return;
    }

    if (!day.slots.length) {
      throw new Error(
        `${day.label}: add at least one slot or mark the day as closed.`,
      );
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
        throw new Error(
          `${day.label}: open and close time cannot be the same.`,
        );
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

function normalizeAndValidateIntervalsForDay(
  dayOfWeek: number,
  intervals: DayInterval[],
) {
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
      throw new Error(
        `${getDayLabel(dayOfWeek)}: slots overlap. Adjust break timings.`,
      );
    }

    if (interval.start === previous.end) {
      previous.end = interval.end;
      return;
    }

    merged.push({ ...interval });
  });

  if (merged.length > 5) {
    throw new Error(
      `${getDayLabel(dayOfWeek)}: maximum 5 break slots allowed.`,
    );
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

function validateScheduleForSubmit(
  daySchedules: DayScheduleState[],
  is24x7: boolean,
) {
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
  const hourOptions = Array.from({ length: 12 }, (_, index) =>
    String(index + 1),
  );
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
  const [profileDetails, setProfileDetails] =
    useState<GoogleProfileDetailsRecord | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isRepairingConnection, setIsRepairingConnection] = useState(false);
  const [hasAttemptedConnectionRepair, setHasAttemptedConnectionRepair] =
    useState(false);

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

  useEffect(() => {
    if (!draft) {
      return;
    }

    setGooglePlaceId(draft.googlePlaceId);
    setGoogleBusinessLink(draft.gmbLink);
  }, [draft]);

  useEffect(() => {
    setHasAttemptedConnectionRepair(false);
    setIsRepairingConnection(false);
  }, [restaurant?.id]);

  useEffect(() => {
    let isActive = true;

    const repairGoogleConnection = async () => {
      if (
        !restaurant?.id ||
        !draft ||
        draft.googlePlaceId.trim() ||
        hasAttemptedConnectionRepair
      ) {
        return;
      }

      setHasAttemptedConnectionRepair(true);
      setIsRepairingConnection(true);
      setProfileError(null);

      try {
        const matchedPlace =
          (await resolveGooglePlaceMatchFromDraft(fetchWithAuth, draft)) || null;

        if (!matchedPlace?.placeId) {
          return;
        }

        const nextGoogleBusinessLink =
          matchedPlace.googleMapsUri ||
          buildGoogleMapsPlaceUrlFromPlaceId(matchedPlace.placeId) ||
          '';

        await updateRestaurant(restaurant.id, {
          google_place_id: matchedPlace.placeId,
          gmb_link: nextGoogleBusinessLink || null,
        });

        if (!isActive) {
          return;
        }

        setGooglePlaceId(matchedPlace.placeId);
        setGoogleBusinessLink(nextGoogleBusinessLink);

        void syncGoogleConnectionBackfill({
          restaurantId: restaurant.id,
          placeId: matchedPlace.placeId,
          fetchWithAuth,
        }).finally(() => {
          void reload();
        });
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to connect Google profile automatically.';
        setProfileError(message);
      } finally {
        if (isActive) {
          setIsRepairingConnection(false);
        }
      }
    };

    void repairGoogleConnection();

    return () => {
      isActive = false;
    };
  }, [
    draft,
    fetchWithAuth,
    googlePlaceId,
    hasAttemptedConnectionRepair,
    reload,
    restaurant?.id,
  ]);

  useEffect(() => {
    let isActive = true;

    const loadGoogleProfileDetails = async () => {
      if (!restaurant?.id || !googlePlaceId.trim()) {
        setProfileDetails(null);
        setProfileError(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);
      setProfileError(null);

      try {
        const response = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-profile`,
          {
            cache: 'no-store',
          },
        );
        const payload =
          (await response.json()) as GoogleProfileDetailsApiResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(
            payload.error || 'Failed to load Google profile details.',
          );
        }

        if (!isActive) {
          return;
        }

        setProfileDetails(payload.data);
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to load Google profile details.';
        setProfileDetails(null);
        setProfileError(message);
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadGoogleProfileDetails();

    return () => {
      isActive = false;
    };
  }, [fetchWithAuth, googlePlaceId, restaurant?.id]);

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

  const hasConnectedProfile = Boolean(googlePlaceId.trim());
  const mapsUrl =
    profileDetails?.maps_url ||
    googleBusinessLink ||
    buildGoogleMapsPlaceUrlFromPlaceId(googlePlaceId) ||
    null;
  const resolvedName = profileDetails?.name || draft.name || 'Google listing';
  const resolvedAddress =
    profileDetails?.formatted_address ||
    buildAddressSummaryFromDraft(draft) ||
    'Address unavailable';
  const roundedRating =
    typeof profileDetails?.rating === 'number'
      ? Math.max(0, Math.min(5, Math.round(profileDetails.rating * 10) / 10))
      : null;
  const ratingCount =
    typeof profileDetails?.user_rating_count === 'number'
      ? profileDetails.user_rating_count
      : null;
  const statusLabel = formatGoogleBusinessStatus(
    profileDetails?.business_status,
  );
  const openNowLabel = formatOpenNowLabel(profileDetails?.open_now);
  const reviewsUrl = buildGoogleReviewsUrlFromPlaceId(
    profileDetails?.place_id || googlePlaceId,
  );

  return (
    <MyInfoWorkspaceShell activeTab="google-profile">
      <Header
        title="Google profile"
        subtitle="Connected Google listing details with rating snapshot (read-only)."
        restaurantName={restaurant.name}
      />

      <section className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">
              Connected profile
            </h2>
            <p className="text-sm text-[#5f6c78]">
              Google Place live details for this restaurant profile.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              hasConnectedProfile
                ? 'bg-[#e8f7ef] text-[#177245]'
                : 'bg-[#fde8e8] text-[#a72b2b]'
            }`}
          >
            {hasConnectedProfile ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {!hasConnectedProfile ? (
          <div className="rounded-2xl border border-dashed border-[#d9e3ec] bg-[#f8fafc] p-4 text-sm text-[#5f6c78]">
            Add a Google Place ID in restaurant data to load live Google profile
            details.
          </div>
        ) : null}

        {isRepairingConnection ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#dbe6ef] bg-[#f7fbff] p-4 text-[#5f6c78]">
            <PurpleDotSpinner size="sm" />
            <span>
              Matching this restaurant with Google and syncing available details...
            </span>
          </div>
        ) : null}

        {isProfileLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#dbe6ef] bg-[#f7fbff] p-4 text-[#5f6c78]">
            <PurpleDotSpinner size="sm" />
            <span>Loading connected Google profile...</span>
          </div>
        ) : null}

        {profileError ? (
          <div className="rounded-2xl border border-[#f0d5d5] bg-[#fff6f6] p-4 text-sm text-[#a72b2b]">
            {profileError}
          </div>
        ) : null}

        <article className="rounded-2xl border border-[#d9e3ec] bg-gradient-to-br from-white via-[#f9fbff] to-[#eef4ff] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold text-[#101827]">
                  {resolvedName}
                </h3>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c8d8ea] bg-white text-[#3158be] transition hover:bg-[#eef3ff]"
                    aria-label="Open in Google Maps"
                    title="Open in Google Maps"
                  >
                    <ExternalLinkIcon />
                  </a>
                ) : null}
              </div>
              <p className="flex items-center gap-2 text-sm text-[#435363]">
                <MapPinCardIcon />
                <span>{resolvedAddress}</span>
              </p>
            </div>

            {openNowLabel ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  profileDetails?.open_now
                    ? 'bg-[#e8f7ef] text-[#177245]'
                    : 'bg-[#f3f4f6] text-[#4b5563]'
                }`}
              >
                {openNowLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {roundedRating != null ? (
              <>
                <span className="text-xl font-semibold text-[#111827]">
                  {roundedRating.toFixed(1)}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => (
                    <StarIcon
                      key={index}
                      filled={index < Math.round(roundedRating)}
                    />
                  ))}
                </div>
                <span className="flex items-center gap-1 text-[#4b5563]">
                  {reviewsUrl ? (
                    <a
                      href={reviewsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#3158be] transition hover:bg-[#edf3ff]"
                      title="Open Google reviews"
                      aria-label="Open Google reviews"
                    >
                      <ReviewCountIcon />
                    </a>
                  ) : (
                    <ReviewCountIcon />
                  )}
                  <span>
                    ({ratingCount != null ? ratingCount.toLocaleString() : '0'})
                  </span>
                </span>
              </>
            ) : (
              <span className="text-[#5f6c78]">
                Rating not available from Google.
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <GoogleInfoPill
              icon={<PhoneCardIcon />}
              label={profileDetails?.phone_number || 'Phone not available'}
            />
            <GoogleInfoPill
              icon={<GlobeCardIcon />}
              label={profileDetails?.website_url || 'Website not available'}
              href={profileDetails?.website_url || undefined}
            />
            <GoogleInfoPill
              icon={<StatusCardIcon />}
              label={statusLabel || 'Status unavailable'}
            />
            <GoogleInfoPill
              icon={<CategoryCardIcon />}
              label={profileDetails?.primary_type || 'Category unavailable'}
            />
            <GoogleInfoPill
              icon={<CoordinatesCardIcon />}
              label={
                profileDetails?.latitude != null &&
                profileDetails?.longitude != null
                  ? `${profileDetails.latitude.toFixed(4)}, ${profileDetails.longitude.toFixed(
                      4,
                    )}`
                  : 'Coordinates unavailable'
              }
            />
          </div>

          {Array.isArray(profileDetails?.weekday_descriptions) &&
          profileDetails.weekday_descriptions.length > 0 ? (
            <div className="mt-4 rounded-xl border border-[#d7e3ee] bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold text-[#111827]">
                Hours snapshot
              </h4>
              <div className="space-y-1 text-sm text-[#4b5563]">
                {profileDetails.weekday_descriptions.map((entry) => (
                  <p key={entry}>{entry}</p>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-6">
        <h2 className="text-xl font-semibold text-[#111827]">
          Reference fields
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
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
      </section>
    </MyInfoWorkspaceShell>
  );
}

async function resolveGooglePlaceMatchFromDraft(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  draft: RestaurantDraftItem,
) {
  const derivedPlaceId = extractGooglePlaceIdFromGoogleMapsLink(draft.gmbLink);
  if (derivedPlaceId) {
    return {
      placeId: derivedPlaceId,
      name: draft.name,
      googleMapsUri: draft.gmbLink,
    };
  }

  const response = await fetchWithAuth('/api/google/place-match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: draft.name,
      address: draft.address,
      city: draft.city,
      state: draft.state,
      postalCode: draft.postalCode,
      country: draft.country,
    }),
    cache: 'no-store',
  });

  const payload = (await safeParseJsonResponse(response)) as GooglePlaceMatchApiResponse;
  if (!response.ok || payload?.success !== true) {
    const message =
      (payload &&
        (typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string'
            ? payload.message
            : null)) ||
      'Unable to match this restaurant to a Google listing.';
    throw new Error(message);
  }

  const data = payload?.data;
  const placeId = typeof data?.placeId === 'string' ? data.placeId.trim() : '';
  if (!placeId) {
    return null;
  }

  return {
    placeId,
    name: typeof data?.name === 'string' ? data.name.trim() : draft.name,
    googleMapsUri:
      typeof data?.googleMapsUri === 'string' ? data.googleMapsUri.trim() : '',
  };
}

async function syncGoogleConnectionBackfill({
  restaurantId,
  placeId,
  fetchWithAuth,
}: {
  restaurantId: string;
  placeId: string;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}) {
  await Promise.allSettled([
    syncGoogleSocialLinksAfterConnection({
      restaurantId,
      placeId,
      fetchWithAuth,
    }),
    syncGoogleOpeningHoursAfterConnection({
      restaurantId,
      fetchWithAuth,
    }),
    importAllGoogleMediaAfterConnection({
      restaurantId,
      fetchWithAuth,
    }),
  ]);
}

async function syncGoogleSocialLinksAfterConnection({
  restaurantId,
  placeId,
  fetchWithAuth,
}: {
  restaurantId: string;
  placeId: string;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}) {
  const response = await fetchWithAuth('/api/google/place-social-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ placeId }),
    cache: 'no-store',
  });

  const payload = (await safeParseJsonResponse(response)) as GooglePlaceSocialLinksApiResponse;
  if (!response.ok || payload?.success !== true) {
    return;
  }

  const data = payload?.data;
  const socialLinksPayload = buildSocialLinksUpdatePayload({
    facebookLink: typeof data?.facebookLink === 'string' ? data.facebookLink : '',
    instagramLink: typeof data?.instagramLink === 'string' ? data.instagramLink : '',
    xLink: typeof data?.xLink === 'string' ? data.xLink : '',
    linkedinLink: typeof data?.linkedinLink === 'string' ? data.linkedinLink : '',
    tiktokLink: typeof data?.tiktokLink === 'string' ? data.tiktokLink : '',
    youtubeLink: typeof data?.youtubeLink === 'string' ? data.youtubeLink : '',
    googleBusinessLink:
      typeof data?.googleBusinessLink === 'string' ? data.googleBusinessLink : '',
    yelpLink: typeof data?.yelpLink === 'string' ? data.yelpLink : '',
    ubereatsLink: typeof data?.ubereatsLink === 'string' ? data.ubereatsLink : '',
    grubhubLink: typeof data?.grubhubLink === 'string' ? data.grubhubLink : '',
    doordashLink: typeof data?.doordashLink === 'string' ? data.doordashLink : '',
  });

  if (!Object.keys(socialLinksPayload).length) {
    return;
  }

  await updateRestaurant(restaurantId, socialLinksPayload);
}

async function syncGoogleOpeningHoursAfterConnection({
  restaurantId,
  fetchWithAuth,
}: {
  restaurantId: string;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}) {
  const response = await fetchWithAuth(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/opening-hours`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_google',
      }),
      cache: 'no-store',
    },
  );

  const payload = (await safeParseJsonResponse(response)) as {
    success?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (!response.ok || payload?.success !== true) {
    throw new Error(
      (payload &&
        (typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string'
            ? payload.message
            : null)) ||
        'Failed to sync opening hours from Google.',
    );
  }
}

async function importAllGoogleMediaAfterConnection({
  restaurantId,
  fetchWithAuth,
}: {
  restaurantId: string;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}) {
  const photosResponse = await fetchWithAuth(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/google-photos`,
    {
      cache: 'no-store',
    },
  );

  const photosPayload = (await safeParseJsonResponse(photosResponse)) as {
    success?: unknown;
    data?: unknown;
    error?: unknown;
    message?: unknown;
  } | null;

  if (!photosResponse.ok || photosPayload?.success !== true) {
    throw new Error(
      (photosPayload &&
        (typeof photosPayload.error === 'string'
          ? photosPayload.error
          : typeof photosPayload.message === 'string'
            ? photosPayload.message
            : null)) ||
        'Failed to fetch Google media.',
    );
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
    const importResponse = await fetchWithAuth(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/google-photos/import`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId,
        }),
        cache: 'no-store',
      },
    );

    const importPayload = (await safeParseJsonResponse(importResponse)) as {
      success?: unknown;
      error?: unknown;
      message?: unknown;
    } | null;

    if (!importResponse.ok || importPayload?.success !== true) {
      continue;
    }
  }
}

type StripeOwnerStatus =
  | 'not_connected'
  | 'setup_incomplete'
  | 'active'
  | 'action_required';

type StripeAccountState = {
  provider: 'stripe';
  status: StripeOwnerStatus;
  status_label: string;
  message: string;
  blocking_issue: string | null;
  can_launch_onboarding: boolean;
  primary_action_label: string | null;
  account: {
    stripe_account_id: string | null;
    is_connected: boolean;
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    country: string | null;
    email: string | null;
    default_currency: string | null;
    last_synced_at: string | null;
    onboarding_status: StripeOwnerStatus;
    requirements: {
      currently_due: string[];
      past_due: string[];
      pending_verification: string[];
      disabled_reason: string | null;
      due_count: number;
      pending_verification_count: number;
    };
  } | null;
};

type StripeAccountApiResponse = {
  success: boolean;
  data?: StripeAccountState;
  message?: string;
  error?: string;
};

const STRIPE_CONNECT_QUERY_KEY = 'stripe_connect';

export function MyInfoBankAccountsPage() {
  const restaurant = useRestaurantScope();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [accountState, setAccountState] = useState<StripeAccountState | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(restaurant?.id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [isLaunchingOnboarding, setIsLaunchingOnboarding] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

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

  const cleanedReturnPath = useMemo(
    () => buildBankAccountsReturnPath(pathname, searchParams),
    [pathname, searchParams],
  );

  const clearStripeConnectQueryParam = useCallback(() => {
    const cleanedPath = buildBankAccountsReturnPath(pathname, searchParams);
    router.replace(cleanedPath, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadStripeStatus = useCallback(
    async ({
      silent = false,
      successMessage,
    }: {
      silent?: boolean;
      successMessage?: string;
    } = {}) => {
      if (!restaurant?.id) {
        setAccountState(null);
        setLoadError(null);
        setIsLoading(false);
        return;
      }

      if (!silent) {
        setIsLoading(true);
      }

      try {
        setLoadError(null);
        const response = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/stripe-account?sync=true`,
          { cache: 'no-store' },
        );
        const payload = (await safeParseJsonResponse(response)) as StripeAccountApiResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(
            payload?.error || 'Failed to load Stripe account status.',
          );
        }

        setAccountState(payload.data);
        if (successMessage) {
          setNotice({
            tone: 'success',
            message: successMessage,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load Stripe account status.';
        setLoadError(message);
        if (!silent) {
          setNotice({
            tone: 'error',
            message,
          });
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [fetchWithAuth, restaurant?.id],
  );

  const launchStripeOnboarding = useCallback(
    async ({ automatic = false }: { automatic?: boolean } = {}) => {
      if (!restaurant?.id) {
        return;
      }

      setIsLaunchingOnboarding(true);
      setNotice(null);

      try {
        const response = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/stripe-account/onboarding`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              returnPath: cleanedReturnPath,
            }),
            cache: 'no-store',
          },
        );
        const payload = (await safeParseJsonResponse(response)) as
          | {
              success?: boolean;
              data?: {
                url?: string;
              };
              error?: string;
            }
          | null;

        if (!response.ok || payload?.success !== true || !payload?.data?.url) {
          throw new Error(payload?.error || 'Failed to start Stripe setup.');
        }

        window.location.assign(payload.data.url);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to start Stripe setup.';
        setNotice({
          tone: 'error',
          message,
        });

        if (automatic) {
          clearStripeConnectQueryParam();
        }
      } finally {
        setIsLaunchingOnboarding(false);
      }
    },
    [cleanedReturnPath, clearStripeConnectQueryParam, fetchWithAuth, restaurant?.id],
  );

  const refreshStripeStatus = useCallback(
    async ({ successMessage }: { successMessage?: string } = {}) => {
      if (!restaurant?.id) {
        return;
      }

      setIsRefreshingStatus(true);
      try {
        const response = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/stripe-account/refresh`,
          {
            method: 'POST',
            cache: 'no-store',
          },
        );
        const payload = (await safeParseJsonResponse(response)) as StripeAccountApiResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(
            payload?.error || 'Failed to refresh Stripe account status.',
          );
        }

        setAccountState(payload.data);
        if (successMessage || payload.message) {
          setNotice({
            tone: 'success',
            message: successMessage || payload.message || 'Stripe status refreshed.',
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to refresh Stripe account status.';
        setNotice({
          tone: 'error',
          message,
        });
      } finally {
        setIsRefreshingStatus(false);
      }
    },
    [fetchWithAuth, restaurant?.id],
  );

  useEffect(() => {
    void loadStripeStatus();
  }, [loadStripeStatus]);

  useEffect(() => {
    const connectState = searchParams.get(STRIPE_CONNECT_QUERY_KEY)?.trim() ?? '';
    if (!connectState) {
      return;
    }

    if (connectState === 'refresh') {
      void launchStripeOnboarding({ automatic: true });
      return;
    }

    if (connectState === 'return') {
      void refreshStripeStatus({
        successMessage: 'Stripe setup was updated successfully.',
      }).finally(() => {
        clearStripeConnectQueryParam();
      });
    }
  }, [
    clearStripeConnectQueryParam,
    launchStripeOnboarding,
    refreshStripeStatus,
    searchParams,
  ]);

  if (!restaurant) {
    return (
      <MyInfoWorkspaceShell activeTab="bank-accounts">
        <SelectionRequiredCard target="Bank Accounts" />
      </MyInfoWorkspaceShell>
    );
  }

  if (isLoading && !accountState) {
    return (
      <MyInfoWorkspaceShell activeTab="bank-accounts">
        <LoadingCard title="Bank Accounts" />
      </MyInfoWorkspaceShell>
    );
  }

  if (loadError && !accountState) {
    return (
      <MyInfoWorkspaceShell activeTab="bank-accounts">
        <ErrorCard
          title="Bank Accounts"
          message={loadError}
          onRetry={() => {
            void loadStripeStatus();
          }}
        />
      </MyInfoWorkspaceShell>
    );
  }

  const currentStatus = accountState?.status ?? 'not_connected';
  const account = accountState?.account ?? null;
  const requirementItems = buildStripeRequirementItems(accountState);

  return (
    <MyInfoWorkspaceShell activeTab="bank-accounts">
      <section className="space-y-6">
        <Header
          title="Bank Accounts"
          subtitle="Connect Stripe, complete verification, and review connection status for this restaurant."
          restaurantName={restaurant.name}
        />

        <FormMessage notice={notice} />

        <section className="grid gap-5 rounded-3xl border border-[#d7e2e6] bg-white p-6 shadow-sm xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <StripeStatusBadge status={currentStatus} />
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">
                    {accountState?.status_label || 'Not connected'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6c78]">
                    {accountState?.message ||
                      'Connect with Stripe to begin account verification.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {accountState?.can_launch_onboarding ? (
                  <button
                    type="button"
                    onClick={() => void launchStripeOnboarding()}
                    disabled={isLaunchingOnboarding}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLaunchingOnboarding ? (
                      <PurpleDotSpinner size="inline" />
                    ) : (
                      <StripeConnectIcon />
                    )}
                    <span>
                      {accountState?.primary_action_label || 'Connect with Stripe'}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void refreshStripeStatus()}
                  disabled={isRefreshingStatus || isLaunchingOnboarding}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d2dde2] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:border-[#c4d3da] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshingStatus ? (
                    <PurpleDotSpinner size="inline" />
                  ) : (
                    <RefreshStatusIcon />
                  )}
                  <span>Refresh status</span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StripeMetricCard
                label="Payments enabled"
                value={formatBooleanLabel(account?.charges_enabled)}
                tone={account?.charges_enabled ? 'success' : 'neutral'}
              />
              <StripeMetricCard
                label="Payouts enabled"
                value={formatBooleanLabel(account?.payouts_enabled)}
                tone={account?.payouts_enabled ? 'success' : 'neutral'}
              />
              <StripeMetricCard
                label="Missing requirements"
                value={String(account?.requirements?.due_count ?? 0)}
                tone={account?.requirements?.due_count ? 'warning' : 'neutral'}
              />
              <StripeMetricCard
                label="Pending verification"
                value={String(account?.requirements?.pending_verification_count ?? 0)}
                tone={
                  account?.requirements?.pending_verification_count ? 'warning' : 'neutral'
                }
              />
            </div>

            <div className="rounded-2xl border border-[#d7e2e6] bg-[#f8fbfd] p-4">
              <p className="text-sm font-medium text-[#111827]">
                Owner access on this page is limited to Stripe connection and verification status only.
              </p>
              <p className="mt-1 text-sm text-[#5f6c78]">
                Antler Foods admin manages payout controls separately. No payout schedule,
                withdrawal, or bank settings controls are available here.
              </p>
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border border-[#d7e2e6] bg-[#fbfdff] p-5">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                Account snapshot
              </h3>
              <div className="mt-4 space-y-3 text-sm text-[#111827]">
                <StripeInfoRow
                  label="Stripe account"
                  value={account?.stripe_account_id || 'Not connected'}
                />
                <StripeInfoRow
                  label="Email"
                  value={account?.email || 'Unavailable'}
                />
                <StripeInfoRow
                  label="Country"
                  value={account?.country || 'Unavailable'}
                />
                <StripeInfoRow
                  label="Currency"
                  value={
                    account?.default_currency
                      ? account.default_currency.toUpperCase()
                      : 'Unavailable'
                  }
                />
                <StripeInfoRow
                  label="Last synced"
                  value={formatSyncTimestamp(account?.last_synced_at)}
                />
              </div>
            </div>
          </aside>
        </section>

        {requirementItems.length > 0 || accountState?.blocking_issue ? (
          <section className="space-y-4 rounded-3xl border border-[#f5dcc0] bg-[#fffaf5] p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[#f59e0b]/10 p-2 text-[#b45309]">
                <RequirementsAlertIcon />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">
                  Requirements to review
                </h2>
                <p className="mt-1 text-sm text-[#7c5b2a]">
                  Review the items below and use the Stripe setup action to submit any
                  missing or updated details.
                </p>
              </div>
            </div>

            {accountState?.blocking_issue ? (
              <div className="rounded-2xl border border-[#f5d6a8] bg-white px-4 py-3 text-sm text-[#8a5b14]">
                {accountState.blocking_issue}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {requirementItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#f5d6a8] bg-white px-4 py-3 text-sm text-[#4b5563]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </MyInfoWorkspaceShell>
  );
}

async function safeParseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildGoogleMapsPlaceUrlFromPlaceId(placeId: string) {
  const normalized = placeId.trim();
  if (!normalized) {
    return null;
  }
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(normalized)}`;
}

function buildGoogleReviewsUrlFromPlaceId(placeId: string | null | undefined) {
  const normalized = typeof placeId === 'string' ? placeId.trim() : '';
  if (!normalized) {
    return null;
  }

  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(normalized)}`;
}

function extractGooglePlaceIdFromGoogleMapsLink(gmbLink: string) {
  if (!gmbLink) {
    return '';
  }

  const match = gmbLink.match(/place_id:([^&]+)/i);
  return match?.[1]?.trim() || '';
}

function buildAddressSummaryFromDraft(draft: RestaurantDraftItem) {
  const parts = [
    draft.address,
    draft.city,
    draft.state,
    draft.postalCode,
    draft.country,
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parts.length ? parts.join(', ') : null;
}

function formatGoogleBusinessStatus(value: string | null | undefined) {
  const normalized =
    typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!normalized) {
    return null;
  }

  if (normalized === 'OPERATIONAL') {
    return 'Open for business';
  }
  if (normalized === 'CLOSED_TEMPORARILY') {
    return 'Temporarily closed';
  }
  if (normalized === 'CLOSED_PERMANENTLY') {
    return 'Permanently closed';
  }

  return normalized
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

function formatOpenNowLabel(value: boolean | null | undefined) {
  if (value === true) {
    return 'Open now';
  }
  if (value === false) {
    return 'Closed now';
  }
  return null;
}

function GoogleInfoPill({
  icon,
  label,
  href,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
}) {
  return (
    <div className="flex min-h-10 items-center gap-2 rounded-lg border border-[#d6e2ee] bg-white px-3 py-2 text-sm text-[#3f4d5c]">
      <span className="text-[#3e5cb9]">{icon}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[#2d4fb3] underline-offset-2 hover:underline"
          title={label}
        >
          {label}
        </a>
      ) : (
        <span className="truncate" title={label}>
          {label}
        </span>
      )}
    </div>
  );
}

export function MyInfoGalleryPage() {
  const restaurant = useRestaurantScope();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(restaurant));
  const [previewImage, setPreviewImage] = useState<MediaPreviewState>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [toastNotice, setToastNotice] = useState<SaveNotice | null>(null);

  const showToast = useCallback((tone: SaveNotice['tone'], message: string) => {
    setToastNotice({ tone, message });
  }, []);

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

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

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
  ) => `${action}:${mediaId}`;

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
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to download media.';
      setNotice({
        tone: 'error',
        message,
      });
      showToast('error', message);
    } finally {
      setPendingActionKey((current) =>
        current === actionKey ? null : current,
      );
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

      if (payload.action === 'hidden') {
        setItems((previous) =>
          previous.map((item) =>
            item.id === mediaId
              ? {
                  ...item,
                  is_hidden: true,
                }
              : item,
          ),
        );
        showToast('success', 'Media hidden from gallery.');
      } else {
        setItems((previous) => previous.filter((item) => item.id !== mediaId));
        showToast('success', 'Gallery media removed.');
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to remove gallery image.';
      setNotice({
        tone: 'error',
        message,
      });
      showToast('error', message);
    } finally {
      setPendingActionKey((current) =>
        current === actionKey ? null : current,
      );
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

      const nextHiddenState =
        typeof payload.is_hidden === 'boolean'
          ? payload.is_hidden
          : !item.is_hidden;

      setItems((previous) =>
        previous.map((current) =>
          current.id === item.id
            ? {
                ...current,
                is_hidden: nextHiddenState,
              }
            : current,
        ),
      );
      showToast(
        'success',
        nextHiddenState ? 'Media has been hidden.' : 'Media is now visible.',
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update media visibility.';
      setNotice({
        tone: 'error',
        message,
      });
      showToast('error', message);
    } finally {
      setPendingActionKey((current) =>
        current === actionKey ? null : current,
      );
    }
  };

  const onUpload = (mediaFile: {
    id: string;
    file_id: string;
    url: string;
    type: string;
  }) => {
    const nextItem: GalleryItem = {
      id: mediaFile.id,
      restaurant_id: restaurant.id,
      source: 'manual',
      file_id: mediaFile.file_id,
      external_id: null,
      type: mediaFile.type,
      created_at: new Date().toISOString(),
      is_hidden: false,
      url: mediaFile.url,
    };

    setItems((previous) => [
      nextItem,
      ...previous.filter((item) => item.id !== nextItem.id),
    ]);
    showToast('success', 'Gallery media uploaded.');
  };
  const visibleItems = items.filter((item) => !item.is_hidden);
  const totalGalleryItems = visibleItems.length;
  const totalGalleryVideos = visibleItems.filter((item) =>
    isVideoMimeType(item.type),
  ).length;
  const totalGalleryImages = Math.max(
    0,
    totalGalleryItems - totalGalleryVideos,
  );
  const totalHiddenItems = items.filter((item) => item.is_hidden).length;

  return (
    <section className="space-y-6">
      {toastNotice ? (
        <Toast
          message={toastNotice.message}
          type={toastNotice.tone === 'success' ? 'success' : 'error'}
          onClose={() => setToastNotice(null)}
        />
      ) : null}

      <Header
        title="Media Studio"
        subtitle="Upload, preview, and manage restaurant gallery assets."
        restaurantName={restaurant.name}
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-purple-50/50 p-6 shadow-sm">
          <FormMessage notice={notice} />
          <FileUpload
            accept="both"
            label="Upload gallery media"
            description="Add restaurant images or videos to the gallery."
            restaurantId={restaurant.id}
            onUpload={onUpload}
          />
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-bold tracking-tight text-gray-900">
              Media overview
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-semibold text-purple-700">
                  Gallery images
                </p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalGalleryImages}
              </p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-semibold text-purple-700">
                  Gallery videos
                </p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalGalleryVideos}
              </p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-600">
            <svg className="h-3.5 w-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Use the top-right icons to view, download, hide, or delete quickly.
          </p>
          {totalHiddenItems > 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hidden items: {totalHiddenItems}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white via-purple-50/20 to-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Existing Media
            </h2>
          </div>
          <p className="hidden text-xs font-medium text-gray-500 sm:block">
            Hover cards for quick actions
          </p>
        </div>

        {isLoading ? (
          <div className="mt-6 flex items-center gap-3 text-gray-600">
            <PurpleDotSpinner size="sm" />
            <p className="text-sm">Loading gallery...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 py-12">
            <svg className="h-12 w-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-600">No gallery media found yet.</p>
            <p className="mt-1 text-xs text-gray-500">Upload images or videos to get started.</p>
          </div>
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
                    'group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md',
                    isHidden
                      ? 'border-purple-300 opacity-60 ring-1 ring-purple-200'
                      : 'border-gray-200 hover:border-purple-200',
                  )}
                >
                  <div className="relative h-28 w-full overflow-hidden">
                    {isVideo ? (
                      <video
                        src={item.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Gallery image ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover transition duration-300 group-hover:scale-110"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                    {isHidden ? (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-purple-600/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
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
                          void onDownloadMedia(
                            item.url,
                            item.id,
                            isVideo ? 'video' : 'image',
                          )
                        }
                        disabled={actionsLocked}
                      >
                        {isDownloading ? (
                          <PurpleDotSpinner size="icon" />
                        ) : (
                          <DownloadIcon />
                        )}
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
                        {isDeleting ? (
                          <PurpleDotSpinner size="icon" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </MediaActionIconButton>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3 w-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[10px] font-medium text-gray-600">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recently uploaded'}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    {previewImage.kind === 'video' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {previewImage.title}
                  </h3>
                  <p className="text-xs font-medium text-purple-600">
                    {previewImage.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                aria-label="Close preview"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="relative h-[70vh] min-h-[320px] bg-gray-900">
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
  linkedinLink,
  tiktokLink,
  youtubeLink,
  googleBusinessLink,
  yelpLink,
  ubereatsLink,
  grubhubLink,
  doordashLink,
}: {
  facebookLink: string;
  instagramLink: string;
  xLink: string;
  linkedinLink: string;
  tiktokLink: string;
  youtubeLink: string;
  googleBusinessLink: string;
  yelpLink: string;
  ubereatsLink: string;
  grubhubLink: string;
  doordashLink: string;
}) {
  const payload: Record<string, string> = {};
  const facebook = facebookLink.trim();
  const instagram = instagramLink.trim();
  const x = xLink.trim();
  const linkedin = linkedinLink.trim();
  const tiktok = tiktokLink.trim();
  const youtube = youtubeLink.trim();
  const gmb = googleBusinessLink.trim();
  const yelp = yelpLink.trim();
  const ubereats = ubereatsLink.trim();
  const grubhub = grubhubLink.trim();
  const doordash = doordashLink.trim();

  if (facebook) {
    payload.fb_link = facebook;
  }
  if (instagram) {
    payload.insta_link = instagram;
  }
  if (x) {
    payload.x_link = x;
  }
  if (linkedin) {
    payload.linkedin_link = linkedin;
  }
  if (tiktok) {
    payload.tiktok_link = tiktok;
  }
  if (youtube) {
    payload.yt_link = youtube;
  }
  if (gmb) {
    payload.gmb_link = gmb;
  }
  if (yelp) {
    payload.yelp_link = yelp;
  }
  if (ubereats) {
    payload.ubereats_link = ubereats;
  }
  if (grubhub) {
    payload.grubhub_link = grubhub;
  }
  if (doordash) {
    payload.doordash_link = doordash;
  }

  return payload;
}

function cx(...values: Array<string | null | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function buildBankAccountsReturnPath(
  pathname: string,
  searchParams: { toString(): string },
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(STRIPE_CONNECT_QUERY_KEY);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildStripeRequirementItems(
  accountState: StripeAccountState | null,
) {
  const account = accountState?.account;
  if (!account) {
    return [];
  }

  const items = [
    ...account.requirements.currently_due,
    ...account.requirements.past_due,
    ...account.requirements.pending_verification,
  ];

  return Array.from(new Set(items.map(formatStripeRequirementLabel)));
}

function formatStripeRequirementLabel(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return 'Additional verification details are required.';
  }

  return normalized
    .replace(/[\[\].]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function formatBooleanLabel(value: boolean | null | undefined) {
  return value ? 'Yes' : 'No';
}

function formatSyncTimestamp(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return 'Not synced yet';
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not synced yet';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StripeStatusBadge({ status }: { status: StripeOwnerStatus }) {
  const config =
    status === 'active'
      ? {
          label: 'Active',
          className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : status === 'setup_incomplete'
        ? {
            label: 'Setup incomplete',
            className: 'border border-amber-200 bg-amber-50 text-amber-700',
          }
        : status === 'action_required'
          ? {
              label: 'Action required',
              className: 'border border-rose-200 bg-rose-50 text-rose-700',
            }
          : {
              label: 'Not connected',
              className: 'border border-slate-200 bg-slate-50 text-slate-700',
            };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function StripeMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/60'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/60'
        : 'border-[#d7e2e6] bg-white';

  return (
    <div className={cx('rounded-2xl border p-4', toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
        {value}
      </p>
    </div>
  );
}

function StripeInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#e5edf2] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[#6b7280]">{label}</span>
      <span className="max-w-[62%] break-words text-right font-medium text-[#111827]">
        {value}
      </span>
    </div>
  );
}

function ChevronRightIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cx(
        'h-4 w-4 transition-transform',
        isExpanded ? 'rotate-90' : '',
      )}
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

function ExternalLinkIcon() {
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
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 13v6H5V5h6" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={filled ? 'h-4 w-4 text-[#f5b800]' : 'h-4 w-4 text-[#d3d9df]'}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="m10 1.7 2.24 4.54 5.01.73-3.63 3.54.86 4.99L10 13.13 5.52 15.5l.86-4.99L2.75 6.97l5-.73L10 1.7Z" />
    </svg>
  );
}

function MapPinCardIcon() {
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
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneCardIcon() {
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
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.12.9.35 1.77.68 2.6a2 2 0 0 1-.45 2.11L9 10.62a16 16 0 0 0 4.4 4.4l1.24-1.24a2 2 0 0 1 2.1-.45c.84.33 1.72.56 2.6.68A2 2 0 0 1 22 16.9Z" />
    </svg>
  );
}

function GlobeCardIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
      <path d="M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}

function StatusCardIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

function CategoryCardIcon() {
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
      <path d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function CoordinatesCardIcon() {
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
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ReviewCountIcon() {
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
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
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
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-white shadow-sm backdrop-blur-sm transition-all',
        tone === 'danger'
          ? 'border-red-300/60 bg-red-600/60 hover:bg-red-700/75'
          : 'border-white/50 bg-black/40 hover:bg-black/60',
        disabled ? 'cursor-not-allowed opacity-50' : '',
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

function PurpleDotSpinner({
  size = 'sm',
}: {
  size?: 'sm' | 'inline' | 'icon';
}) {
  const dotSize =
    size === 'icon'
      ? 'h-1.5 w-1.5'
      : size === 'inline'
        ? 'h-1.5 w-1.5'
        : 'h-2.5 w-2.5';
  const containerClass =
    size === 'icon' ? 'h-4 w-4' : size === 'inline' ? 'h-3.5 w-3.5' : 'h-7 w-7';

  return (
    <span
      className={cx(
        'inline-grid grid-cols-2 grid-rows-2 gap-1',
        containerClass,
      )}
      role="status"
      aria-label="Loading"
    >
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_infinite] rounded-full bg-[#6f4cf6]',
        )}
      />
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_0.2s_infinite] rounded-full bg-[#8f6cff]',
        )}
      />
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_0.3s_infinite] rounded-full bg-[#9f84ff]',
        )}
      />
      <span
        className={cx(
          dotSize,
          'animate-[pulse_0.9s_ease-in-out_0.45s_infinite] rounded-full bg-[#b19dff]',
        )}
      />
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

function BankAccountsTabIcon() {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 15h2" />
      <path d="M6 15h4" />
    </svg>
  );
}

function StripeConnectIcon() {
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
      <path d="M8 12h8" />
      <path d="m12 8 4 4-4 4" />
      <path d="M4 12a8 8 0 0 1 8-8" />
      <path d="M20 12a8 8 0 0 1-8 8" />
    </svg>
  );
}

function RefreshStatusIcon() {
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
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function RequirementsAlertIcon() {
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
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}
