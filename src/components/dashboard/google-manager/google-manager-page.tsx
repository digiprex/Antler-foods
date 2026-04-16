'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { nhost } from '@/lib/nhost';
import { PurpleDotSpinner } from '@/components/dashboard/purple-dot-spinner';

type RestaurantScope = {
  id: string;
  name: string;
};

type GoogleManagerTab = 'info' | 'reviews' | 'settings';

type GooglePlaceProfile = {
  place_id: string | null;
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

type GooglePlaceProfileResponse = {
  success: boolean;
  data?: GooglePlaceProfile;
  error?: string;
};

type GooglePlaceReview = {
  source: string;
  external_review_id: string | null;
  rating: number;
  author_name: string | null;
  review_text: string | null;
  author_url: string | null;
  review_url: string | null;
  avatar_url: string | null;
  published_at: string | null;
};

type GooglePlaceReviewsResponse = {
  reviews?: GooglePlaceReview[];
  error?: string;
};

type GoogleBusinessConnectionResponse = {
  success: boolean;
  data?: {
    connected: boolean;
    hasSelectedLocation: boolean;
    connection: {
      googleAccountName: string | null;
      googleAccountDisplayName: string | null;
      googleLocationName: string | null;
      googleLocationTitle: string | null;
      googlePlaceId: string | null;
      scopes: string[];
      connectedEmail: string | null;
      lastSyncedAt: string | null;
    } | null;
    accountLocations: Array<{
      account: {
        name: string;
        accountName: string;
        type: string | null;
      };
      locations: Array<{
        name: string;
        title: string | null;
        accountName: string;
        accountDisplayName: string | null;
        placeId: string | null;
        languageCode: string | null;
        storeCode: string | null;
      }>;
    }>;
    fallbackPlaceId: string | null;
  };
  error?: string;
};

type GoogleBusinessProfile = {
  name: string;
  title: string | null;
  storeCode: string | null;
  languageCode: string | null;
  websiteUri: string | null;
  primaryPhone: string | null;
  additionalPhones: string[];
  description: string | null;
  addressLines: string[];
  locality: string | null;
  administrativeArea: string | null;
  postalCode: string | null;
  regionCode: string | null;
  openState: string | null;
  placeId: string | null;
  primaryCategory: string | null;
  additionalCategories: string[];
  regularHours: string[];
  actionLinks: {
    menuUrl: string | null;
    takeoutUrl: string | null;
    deliveryUrl: string | null;
    otherLinks: Array<{
      type: string | null;
      url: string | null;
    }>;
  };
  attributes: Array<{
    attributeId: string | null;
    displayName: string | null;
    value: string | null;
  }>;
};

type GoogleBusinessProfileResponse = {
  success: boolean;
  data?: GoogleBusinessProfile;
  error?: string;
};

type GoogleBusinessReview = {
  name: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  reviewerProfilePhotoUrl: string | null;
  reviewerGoogleMapsUri: string | null;
  createTime: string | null;
  updateTime: string | null;
  reviewReply: {
    comment: string | null;
    updateTime: string | null;
  } | null;
};

type GoogleBusinessReviewsResponse = {
  success: boolean;
  data?: {
    reviews: GoogleBusinessReview[];
  };
  error?: string;
};

type EditableGoogleBusinessProfile = {
  title: string;
  primaryPhone: string;
  websiteUri: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  administrativeArea: string;
  postalCode: string;
  regionCode: string;
  menuUrl: string;
  takeoutUrl: string;
  deliveryUrl: string;
};

export function GoogleManagerPage() {
  const restaurant = useRestaurantScope();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<GoogleManagerTab>('info');
  const [isLoading, setIsLoading] = useState(Boolean(restaurant?.id));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLaunchingGoogleConnect, setIsLaunchingGoogleConnect] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [replyingReviewName, setReplyingReviewName] = useState<string | null>(null);
  const [connectionData, setConnectionData] =
    useState<GoogleBusinessConnectionResponse['data'] | null>(null);
  const [businessProfile, setBusinessProfile] = useState<GoogleBusinessProfile | null>(null);
  const [businessReviews, setBusinessReviews] = useState<GoogleBusinessReview[]>([]);
  const [placesProfile, setPlacesProfile] = useState<GooglePlaceProfile | null>(null);
  const [placesReviews, setPlacesReviews] = useState<GooglePlaceReview[]>([]);
  const [editableProfile, setEditableProfile] = useState<EditableGoogleBusinessProfile>(
    emptyEditableProfile(),
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [placesError, setPlacesError] = useState<string | null>(null);

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

  const loadFallbackPlacesData = useCallback(async () => {
    if (!restaurant?.id) {
      setPlacesProfile(null);
      setPlacesReviews([]);
      setPlacesError(null);
      return;
    }

    let profileLoaded = false;
    try {
      const profileResponse = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-profile`,
        { cache: 'no-store' },
      );
      const profilePayload =
        (await safeParseJsonResponse(profileResponse)) as GooglePlaceProfileResponse | null;

      if (!profileResponse.ok || !profilePayload?.success || !profilePayload.data) {
        throw new Error(
          profilePayload?.error || 'Failed to load Google Places profile details.',
        );
      }

      profileLoaded = true;
      setPlacesProfile(profilePayload.data);
      setPlacesError(null);

      if (!profilePayload.data.place_id) {
        setPlacesReviews([]);
        return;
      }

      const reviewsResponse = await fetchWithAuth('/api/google/place-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeId: profilePayload.data.place_id,
        }),
        cache: 'no-store',
      });

      const reviewsPayload =
        (await safeParseJsonResponse(
          reviewsResponse,
        )) as GooglePlaceReviewsResponse | null;

      if (!reviewsResponse.ok) {
        throw new Error(
          reviewsPayload?.error || 'Failed to load Google Places reviews.',
        );
      }

      setPlacesReviews(Array.isArray(reviewsPayload?.reviews) ? reviewsPayload.reviews : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load Google Places fallback.';

      if (!profileLoaded) {
        setPlacesProfile(null);
        setPlacesReviews([]);
      }
      setPlacesError(message);
    }
  }, [fetchWithAuth, restaurant?.id]);

  const loadGoogleManager = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!restaurant?.id) {
        setConnectionData(null);
        setBusinessProfile(null);
        setBusinessReviews([]);
        setPlacesProfile(null);
        setPlacesReviews([]);
        setPageError(null);
        setBusinessError(null);
        setPlacesError(null);
        setIsLoading(false);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setPageError(null);
        setBusinessError(null);

        const connectionResponse = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/connection`,
          { cache: 'no-store' },
        );
        const connectionPayload =
          (await safeParseJsonResponse(
            connectionResponse,
          )) as GoogleBusinessConnectionResponse | null;

        if (!connectionResponse.ok || !connectionPayload?.success || !connectionPayload.data) {
          throw new Error(
            connectionPayload?.error ||
              'Failed to load Google Business connection details.',
          );
        }

        setConnectionData(connectionPayload.data);

        if (connectionPayload.data.connected && connectionPayload.data.hasSelectedLocation) {
          const [profileResponse, reviewsResponse] = await Promise.all([
            fetchWithAuth(
              `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/profile`,
              { cache: 'no-store' },
            ),
            fetchWithAuth(
              `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/reviews`,
              { cache: 'no-store' },
            ),
          ]);

          const profilePayload =
            (await safeParseJsonResponse(
              profileResponse,
            )) as GoogleBusinessProfileResponse | null;
          const reviewsPayload =
            (await safeParseJsonResponse(
              reviewsResponse,
            )) as GoogleBusinessReviewsResponse | null;

          if (!profileResponse.ok || !profilePayload?.success || !profilePayload.data) {
            throw new Error(
              profilePayload?.error || 'Failed to load Google Business Profile details.',
            );
          }

          if (!reviewsResponse.ok || !reviewsPayload?.success) {
            throw new Error(
              reviewsPayload?.error || 'Failed to load Google Business reviews.',
            );
          }

          setBusinessProfile(profilePayload.data);
          setBusinessReviews(
            Array.isArray(reviewsPayload.data?.reviews) ? reviewsPayload.data.reviews : [],
          );
          setPlacesProfile(null);
          setPlacesReviews([]);
          setPlacesError(null);
          return;
        }

        setBusinessProfile(null);
        setBusinessReviews([]);
        await loadFallbackPlacesData();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load Google manager.';
        setBusinessError(message);
        setPageError(message);
        setBusinessProfile(null);
        setBusinessReviews([]);
        setConnectionData(null);
        await loadFallbackPlacesData();
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [fetchWithAuth, loadFallbackPlacesData, restaurant?.id],
  );

  useEffect(() => {
    void loadGoogleManager();
  }, [loadGoogleManager]);

  useEffect(() => {
    if (!businessProfile) {
      setEditableProfile(emptyEditableProfile());
      return;
    }

    setEditableProfile({
      title: businessProfile.title || '',
      primaryPhone: businessProfile.primaryPhone || '',
      websiteUri: businessProfile.websiteUri || '',
      description: businessProfile.description || '',
      addressLine1: businessProfile.addressLines[0] || '',
      addressLine2: businessProfile.addressLines[1] || '',
      locality: businessProfile.locality || '',
      administrativeArea: businessProfile.administrativeArea || '',
      postalCode: businessProfile.postalCode || '',
      regionCode: businessProfile.regionCode || '',
      menuUrl: businessProfile.actionLinks.menuUrl || '',
      takeoutUrl: businessProfile.actionLinks.takeoutUrl || '',
      deliveryUrl: businessProfile.actionLinks.deliveryUrl || '',
    });
  }, [businessProfile]);

  useEffect(() => {
    setReplyDrafts((previous) => {
      const next = { ...previous };
      for (const review of businessReviews) {
        if (typeof next[review.name] === 'string') {
          continue;
        }

        next[review.name] = review.reviewReply?.comment || '';
      }

      return next;
    });
  }, [businessReviews]);

  const authNotice = searchParams?.get('google_business')?.trim() || '';
  const authNoticeMessage = searchParams?.get('google_notice')?.trim() || '';
  const isBusinessConnected =
    Boolean(connectionData?.connected) && Boolean(connectionData?.hasSelectedLocation);
  const isOauthConnected = Boolean(connectionData?.connected);

  const summaryProfileLabel = useMemo(() => {
    if (isBusinessConnected && businessProfile?.title) {
      return businessProfile.title;
    }

    if (isOauthConnected) {
      return connectionData?.connection?.googleLocationTitle || 'Select location';
    }

    return placesProfile?.name || 'Not connected';
  }, [
    businessProfile?.title,
    connectionData?.connection?.googleLocationTitle,
    isBusinessConnected,
    isOauthConnected,
    placesProfile?.name,
  ]);

  const summaryRating = useMemo(() => {
    if (isBusinessConnected) {
      return calculateAverageReviewRating(businessReviews);
    }

    return placesProfile?.rating ?? calculateAveragePlaceReviewRating(placesReviews);
  }, [businessReviews, isBusinessConnected, placesProfile?.rating, placesReviews]);

  const summaryReviewCount = isBusinessConnected
    ? businessReviews.length
    : placesProfile?.user_rating_count ?? placesReviews.length;
  const summaryReference = isBusinessConnected
    ? truncateMiddle(
        connectionData?.connection?.googleLocationName || businessProfile?.name || 'Unavailable',
        28,
      )
    : truncateMiddle(placesProfile?.place_id, 28);

  const googleMapsUrl = isBusinessConnected
    ? buildMapsUrlFromPlaceId(businessProfile?.placeId)
    : placesProfile?.maps_url || buildMapsUrlFromPlaceId(placesProfile?.place_id);

  const loadButtonLabel = isRefreshing ? 'Refreshing...' : 'Refresh';

  const launchGoogleConnection = useCallback(async () => {
    if (!restaurant?.id || isLaunchingGoogleConnect) {
      return;
    }

    try {
      setIsLaunchingGoogleConnect(true);
      const currentPath =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : `/dashboard/admin/google-manager?restaurant_id=${encodeURIComponent(
              restaurant.id,
            )}&restaurant_name=${encodeURIComponent(restaurant.name)}`;

      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            returnPath: currentPath,
          }),
        },
      );

      const payload =
        (await safeParseJsonResponse(response)) as
          | {
              success?: boolean;
              data?: { url?: string };
              error?: string;
            }
          | null;

      if (!response.ok || !payload?.success || !payload.data?.url) {
        throw new Error(payload?.error || 'Failed to start Google Business connection.');
      }

      window.location.assign(payload.data.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to start Google Business connection.',
      );
    } finally {
      setIsLaunchingGoogleConnect(false);
    }
  }, [fetchWithAuth, isLaunchingGoogleConnect, restaurant?.id, restaurant?.name]);

  const selectGoogleLocation = useCallback(
    async (accountName: string, locationName: string) => {
      if (!restaurant?.id) {
        return;
      }

      const key = `${accountName}:${locationName}`;
      try {
        setIsSelectingLocation(key);
        const response = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/select-location`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accountName,
              locationName,
            }),
          },
        );

        const payload =
          (await safeParseJsonResponse(response)) as { success?: boolean; error?: string } | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to save the Google Business location.');
        }

        toast.success('Google Business location connected.');
        await loadGoogleManager({ silent: true });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to save the Google Business location.',
        );
      } finally {
        setIsSelectingLocation(null);
      }
    },
    [fetchWithAuth, loadGoogleManager, restaurant?.id],
  );

  const publishGoogleBusinessProfile = useCallback(async () => {
    if (!restaurant?.id || !isBusinessConnected) {
      return;
    }

    try {
      setIsSavingProfile(true);
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editableProfile.title,
            primaryPhone: editableProfile.primaryPhone,
            websiteUri: editableProfile.websiteUri,
            description: editableProfile.description,
            address: {
              addressLines: [
                editableProfile.addressLine1,
                editableProfile.addressLine2,
              ].filter((entry) => entry.trim()),
              locality: editableProfile.locality,
              administrativeArea: editableProfile.administrativeArea,
              postalCode: editableProfile.postalCode,
              regionCode: editableProfile.regionCode,
            },
            links: {
              menuUrl: editableProfile.menuUrl,
              takeoutUrl: editableProfile.takeoutUrl,
              deliveryUrl: editableProfile.deliveryUrl,
            },
          }),
        },
      );

      const payload =
        (await safeParseJsonResponse(response)) as GoogleBusinessProfileResponse | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Failed to publish the Google Business update.');
      }

      setBusinessProfile(payload.data);
      toast.success('Google Business profile published.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to publish the Google Business update.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  }, [editableProfile, fetchWithAuth, isBusinessConnected, restaurant?.id]);

  const submitReviewReply = useCallback(
    async (reviewName: string) => {
      if (!restaurant?.id) {
        return;
      }

      const draft = replyDrafts[reviewName]?.trim() || '';
      if (!draft) {
        toast.error('Reply text is required.');
        return;
      }

      try {
        setReplyingReviewName(reviewName);
        const response = await fetchWithAuth(
          `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-business/reviews/reply`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reviewName,
              comment: draft,
            }),
          },
        );

        const payload =
          (await safeParseJsonResponse(response)) as { success?: boolean; error?: string } | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to publish the review reply.');
        }

        toast.success('Google review reply published.');
        await loadGoogleManager({ silent: true });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to publish the review reply.',
        );
      } finally {
        setReplyingReviewName(null);
      }
    },
    [fetchWithAuth, loadGoogleManager, replyDrafts, restaurant?.id],
  );

  if (!restaurant) {
    return (
      <section className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">
            Google Manager
          </h1>
          <p className="text-sm text-slate-500">
            Select a restaurant to open the Google manager workspace.
          </p>
        </header>
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Choose a restaurant from the sidebar search first.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Google Manager
                </h1>
                <p className="text-sm text-slate-500">{restaurant.name}</p>
              </div>
            </div>
            {(isBusinessConnected || isOauthConnected) && (
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">
                <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
                {isBusinessConnected ? 'Live Connected' : 'OAuth Active'}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Maps
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void launchGoogleConnection()}
              disabled={isLaunchingGoogleConnect}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLaunchingGoogleConnect ? 'Connecting...' : isOauthConnected ? 'Reconnect' : 'Connect Google'}
            </button>
            <button
              type="button"
              onClick={() => void loadGoogleManager({ silent: true })}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loadButtonLabel}
            </button>
          </div>
        </div>
      </div>

      {authNotice ? (
        <Banner
          tone={authNotice === 'oauth_error' ? 'error' : 'success'}
          title={authNotice === 'oauth_error' ? 'Connection failed' : 'Connected successfully'}
          message={
            authNotice === 'oauth_error'
              ? authNoticeMessage || 'Unable to complete OAuth flow.'
              : 'Select a Business Profile location to continue.'
          }
        />
      ) : null}

      {businessError && !isBusinessConnected && !placesProfile ? (
        <Banner
          tone="warning"
          title="Using fallback mode"
          message="Google Places data is being used instead."
        />
      ) : null}

      {isBusinessConnected ? (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Location"
            value={summaryProfileLabel}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <SummaryCard
            label="Rating"
            value={summaryRating != null ? summaryRating.toFixed(1) : 'N/A'}
            subValue={`${summaryReviewCount || 0} reviews`}
            icon={
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            }
          />
          <SummaryCard
            label="Category"
            value={businessProfile?.primaryCategory || 'Not set'}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
          <SummaryCard
            label="Status"
            value="Live"
            subValue="Fully Connected"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 border-b border-slate-100 p-1.5">
          <TabButton label="Business Info" active={activeTab === 'info'} onClick={() => setActiveTab('info')} />
          <TabButton label="Reviews" active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} />
          <TabButton label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center py-16">
            <div className="text-center">
              <PurpleDotSpinner size="sm" />
              <p className="mt-3 text-sm text-slate-500">Loading...</p>
            </div>
          </div>
        ) : pageError && !businessProfile && !placesProfile && !isOauthConnected ? (
          <EmptyState title="Unable to load Google manager" message={pageError} />
        ) : activeTab === 'info' ? (
          isBusinessConnected && businessProfile ? (
            <GoogleBusinessProfileEditor
              profile={businessProfile}
              editableProfile={editableProfile}
              onEditableProfileChange={setEditableProfile}
              onPublish={() => void publishGoogleBusinessProfile()}
              isSavingProfile={isSavingProfile}
            />
          ) : isOauthConnected ? (
            <GoogleBusinessLocationSelector
              accountLocations={connectionData?.accountLocations || []}
              selectedLocationName={connectionData?.connection?.googleLocationName || null}
              onSelect={selectGoogleLocation}
              selectingLocationKey={isSelectingLocation}
            />
          ) : placesProfile ? (
            <GooglePlacesFallbackInfo
              profile={placesProfile}
              placesError={placesError}
              onConnect={() => void launchGoogleConnection()}
              isLaunchingGoogleConnect={isLaunchingGoogleConnect}
            />
          ) : (
            <EmptyState
              title="Google profile not connected"
              message="No Google Business Profile connection or valid Google Place ID was found for this restaurant yet."
            />
          )
        ) : activeTab === 'reviews' ? (
          isBusinessConnected ? (
            <GoogleBusinessReviewsTab
              reviews={businessReviews}
              replyDrafts={replyDrafts}
              onReplyDraftChange={(reviewName, value) =>
                setReplyDrafts((previous) => ({
                  ...previous,
                  [reviewName]: value,
                }))
              }
              onSubmitReply={(reviewName) => void submitReviewReply(reviewName)}
              replyingReviewName={replyingReviewName}
            />
          ) : (
            <GooglePlacesFallbackReviews
              reviews={placesReviews}
              placesError={placesError}
              isOauthConnected={isOauthConnected}
            />
          )
        ) : (
          <GoogleBusinessSettingsTab
            connectionData={connectionData}
            businessProfile={businessProfile}
            placesProfile={placesProfile}
            businessError={businessError}
            onConnect={() => void launchGoogleConnection()}
            isLaunchingGoogleConnect={isLaunchingGoogleConnect}
          />
        )}
      </div>
    </section>
  );
}

function GoogleBusinessProfileEditor({
  profile,
  editableProfile,
  onEditableProfileChange,
  onPublish,
  isSavingProfile,
}: {
  profile: GoogleBusinessProfile;
  editableProfile: EditableGoogleBusinessProfile;
  onEditableProfileChange: (value: EditableGoogleBusinessProfile) => void;
  onPublish: () => void;
  isSavingProfile: boolean;
}) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 text-sm text-purple-700">
        <span className="flex h-2 w-2 rounded-full bg-accent"></span>
        <span className="font-medium">Live editing enabled</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {profile.title || 'Business Profile'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Edit your Google listing</p>
            </div>
            <button
              type="button"
              onClick={onPublish}
              disabled={isSavingProfile}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingProfile ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Publishing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Publish
                </>
              )}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FormField label="Title" value={editableProfile.title} onChange={(value) => onEditableProfileChange({ ...editableProfile, title: value })} />
            <FormField label="Phone Number" value={editableProfile.primaryPhone} onChange={(value) => onEditableProfileChange({ ...editableProfile, primaryPhone: value })} />
            <FormField label="Website" value={editableProfile.websiteUri} onChange={(value) => onEditableProfileChange({ ...editableProfile, websiteUri: value })} />
            <FormField label="Region Code" value={editableProfile.regionCode} onChange={(value) => onEditableProfileChange({ ...editableProfile, regionCode: value })} />
            <TextAreaField
              label="Description"
              value={editableProfile.description}
              onChange={(value) => onEditableProfileChange({ ...editableProfile, description: value })}
              className="md:col-span-2"
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Address
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Address line 1" value={editableProfile.addressLine1} onChange={(value) => onEditableProfileChange({ ...editableProfile, addressLine1: value })} />
              <FormField label="Address line 2" value={editableProfile.addressLine2} onChange={(value) => onEditableProfileChange({ ...editableProfile, addressLine2: value })} />
              <FormField label="City" value={editableProfile.locality} onChange={(value) => onEditableProfileChange({ ...editableProfile, locality: value })} />
              <FormField label="State" value={editableProfile.administrativeArea} onChange={(value) => onEditableProfileChange({ ...editableProfile, administrativeArea: value })} />
              <FormField label="Postal code" value={editableProfile.postalCode} onChange={(value) => onEditableProfileChange({ ...editableProfile, postalCode: value })} />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Links
            </div>
            <div className="grid gap-4">
              <FormField label="Food ordering link" value={editableProfile.menuUrl} onChange={(value) => onEditableProfileChange({ ...editableProfile, menuUrl: value })} />
              <FormField label="Takeout link" value={editableProfile.takeoutUrl} onChange={(value) => onEditableProfileChange({ ...editableProfile, takeoutUrl: value })} />
              <FormField label="Delivery link" value={editableProfile.deliveryUrl} onChange={(value) => onEditableProfileChange({ ...editableProfile, deliveryUrl: value })} />
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Category" value={profile.primaryCategory} />
              <DetailRow label="Status" value={formatGoogleLabel(profile.openState)} />
              <DetailRow label="Store code" value={profile.storeCode} />
              <DetailRow label="Language" value={profile.languageCode} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Hours</h3>
            <div className="mt-4 space-y-2 text-xs">
              {profile.regularHours.length ? (
                profile.regularHours.map((entry) => (
                  <div key={entry} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                    {entry}
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No hours available</p>
              )}
            </div>
          </section>

          {profile.attributes.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Attributes</h3>
              <div className="mt-4 space-y-2 text-xs">
                {profile.attributes.slice(0, 5).map((attribute) => (
                  <div
                    key={attribute.attributeId || attribute.displayName || `${attribute.value}-${attribute.displayName}`}
                    className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="font-medium text-slate-900">
                      {attribute.displayName || attribute.attributeId || 'Attribute'}
                    </span>
                    <span className="text-slate-600">
                      {attribute.value || 'Not set'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleBusinessLocationSelector({
  accountLocations,
  selectedLocationName,
  onSelect,
  selectingLocationKey,
}: {
  accountLocations: NonNullable<NonNullable<GoogleBusinessConnectionResponse['data']>['accountLocations']>;
  selectedLocationName: string | null;
  onSelect: (accountName: string, locationName: string) => void;
  selectingLocationKey: string | null;
}) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">Select a location to enable live editing</span>
      </div>

      {accountLocations.length ? (
        <div className="space-y-4">
          {accountLocations.map((group) => (
            <section key={group.account.name} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{group.account.accountName}</h2>
                  <p className="text-xs text-slate-500">{formatGoogleLabel(group.account.type)} • {group.locations.length} locations</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {group.locations.map((location) => {
                  const key = `${group.account.name}:${location.name}`;
                  const isSelected = selectedLocationName === location.name;

                  return (
                    <div key={location.name} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {location.title || 'Untitled location'}
                          </div>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {location.placeId || 'No Place ID'}
                          {location.languageCode && ` • ${location.languageCode}`}
                          {location.storeCode && ` • ${location.storeCode}`}
                        </div>
                      </div>
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => onSelect(group.account.name, location.name)}
                          disabled={Boolean(selectingLocationKey)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {selectingLocationKey === key ? (
                            <>
                              <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Connecting...
                            </>
                          ) : (
                            'Select Location'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Business Profile locations found"
          message="The connected Google account did not return any accessible Business Profile locations."
        />
      )}
    </div>
  );
}

function GooglePlacesFallbackInfo({
  profile,
  placesError,
  onConnect,
  isLaunchingGoogleConnect,
}: {
  profile: GooglePlaceProfile | null;
  placesError: string | null;
  onConnect: () => void;
  isLaunchingGoogleConnect: boolean;
}) {
  return (
    <div className="flex min-h-[480px] items-center justify-center p-6">
      <div className="max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/10 to-purple-100">
          <svg className="h-10 w-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">
          Connect Your Google Business
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Link your Google Business Profile to manage your listing, respond to reviews, and keep your information up to date.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-left">
          <h3 className="text-sm font-semibold text-slate-900">Unlock these features:</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <svg className="h-3 w-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Manage your business profile</div>
                <div className="text-xs text-slate-600">Edit hours, phone, website, and description</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <svg className="h-3 w-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Reply to customer reviews</div>
                <div className="text-xs text-slate-600">Respond directly to Google reviews as the owner</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <svg className="h-3 w-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Live updates</div>
                <div className="text-xs text-slate-600">Changes sync instantly to Google Maps and Search</div>
              </div>
            </div>
          </div>
        </div>

        {profile?.name && (
          <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm">
            <div className="flex items-center justify-center gap-2 text-purple-900">
              <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">We found: {profile.name}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onConnect}
          disabled={isLaunchingGoogleConnect}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLaunchingGoogleConnect ? (
            <>
              <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect Google Business
            </>
          )}
        </button>

        {placesError && (
          <p className="mt-4 text-xs text-slate-500">
            Note: Unable to load business preview
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleBusinessReviewsTab({
  reviews,
  replyDrafts,
  onReplyDraftChange,
  onSubmitReply,
  replyingReviewName,
}: {
  reviews: GoogleBusinessReview[];
  replyDrafts: Record<string, string>;
  onReplyDraftChange: (reviewName: string, value: string) => void;
  onSubmitReply: (reviewName: string) => void;
  replyingReviewName: string | null;
}) {
  if (!reviews.length) {
    return (
      <div className="pt-6">
        <EmptyState
          title="No Google reviews found"
          message="Google Business Profile did not return any owner-manageable reviews for this location."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {reviews.map((review) => (
        <article key={review.name} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <ReviewAvatar name={review.reviewerName} avatarUrl={review.reviewerProfilePhotoUrl} />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {review.reviewerName || 'Google reviewer'}
                  </h3>
                  <ReviewStars rating={review.rating} />
                </div>
                <div className="text-sm text-slate-500">
                  {formatDateTime(review.updateTime || review.createTime)}
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-700">
                {review.comment || 'No written comment was included in this review.'}
              </p>

              {review.reviewReply?.comment ? (
                <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                  <div className="text-xs font-medium text-purple-900">Your reply</div>
                  <div className="mt-2 text-sm text-purple-800">{review.reviewReply.comment}</div>
                  <div className="mt-2 text-xs text-purple-600">
                    {formatDateTime(review.reviewReply.updateTime)}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2.5">
                <textarea
                  value={replyDrafts[review.name] || ''}
                  onChange={(event) => onReplyDraftChange(review.name, event.target.value)}
                  rows={3}
                  placeholder="Write your reply..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-purple-100"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSubmitReply(review.name)}
                    disabled={replyingReviewName === review.name}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyingReviewName === review.name ? (
                      <>
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Reply
                      </>
                    )}
                  </button>
                  {review.reviewerGoogleMapsUri && (
                    <a
                      href={review.reviewerGoogleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function GooglePlacesFallbackReviews({
  reviews,
  placesError,
  isOauthConnected,
}: {
  reviews: GooglePlaceReview[];
  placesError: string | null;
  isOauthConnected: boolean;
}) {
  return (
    <div className="flex min-h-[480px] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/10 to-purple-100">
          <svg className="h-10 w-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-900">
          {isOauthConnected ? 'Select a Location to View Reviews' : 'Connect to Manage Reviews'}
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          {isOauthConnected
            ? 'Choose your Business Profile location to view and reply to customer reviews.'
            : 'Connect your Google Business Profile to view reviews and respond as the business owner.'}
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>View all customer reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Reply as business owner</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Engage with customers</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          {isOauthConnected
            ? 'Go to Business Info tab to select your location'
            : 'Connect your account to unlock review management'}
        </p>
      </div>
    </div>
  );
}

function GoogleBusinessSettingsTab({
  connectionData,
  businessProfile,
  placesProfile,
  businessError,
  onConnect,
  isLaunchingGoogleConnect,
}: {
  connectionData: GoogleBusinessConnectionResponse['data'] | null;
  businessProfile: GoogleBusinessProfile | null;
  placesProfile: GooglePlaceProfile | null;
  businessError: string | null;
  onConnect: () => void;
  isLaunchingGoogleConnect: boolean;
}) {
  const isConnected = connectionData?.connected;
  const hasLocation = connectionData?.hasSelectedLocation;

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SettingsCard
          label="Connection Status"
          value={isConnected ? 'Connected' : 'Not Connected'}
          helper={isConnected ? 'OAuth active' : 'Connect to get started'}
        />
        {isConnected && (
          <SettingsCard
            label="Selected Location"
            value={connectionData?.connection?.googleLocationTitle || 'Not selected'}
            helper={hasLocation ? 'Active location' : 'Choose a location'}
          />
        )}
        {businessProfile && (
          <SettingsCard
            label="Data Source"
            value="Live Business Profile"
            helper="Real-time Google data"
          />
        )}
      </div>

      {businessError ? (
        <Banner tone="warning" title="Connection Issue" message={businessError} />
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">
          Connection Status
        </h3>
        <div className="mt-4 space-y-3">
          <StatusItem
            label="Google OAuth"
            status={isConnected ? 'connected' : 'disconnected'}
            description={isConnected ? 'Account linked successfully' : 'Not connected yet'}
          />
          <StatusItem
            label="Business Location"
            status={hasLocation ? 'connected' : 'disconnected'}
            description={hasLocation ? 'Location selected and active' : 'Select a location to continue'}
          />
          <StatusItem
            label="Live Management"
            status={businessProfile ? 'connected' : 'disconnected'}
            description={businessProfile ? 'Full editing and reply enabled' : 'Connect to unlock features'}
          />
        </div>

        {!isConnected && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onConnect}
              disabled={isLaunchingGoogleConnect}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLaunchingGoogleConnect ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect Google Business
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({
  label,
  status,
  description,
}: {
  label: string;
  status: 'connected' | 'disconnected';
  description: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          status === 'connected' ? 'bg-purple-100' : 'bg-slate-200'
        }`}>
          {status === 'connected' ? (
            <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-900">{label}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        status === 'connected'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-slate-200 text-slate-600'
      }`}>
        {status === 'connected' ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}

function useRestaurantScope(): RestaurantScope | null {
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id')?.trim() || '';
  const restaurantName = searchParams?.get('restaurant_name')?.trim() || '';

  if (!restaurantId || !restaurantName) {
    return null;
  }

  return {
    id: restaurantId,
    name: restaurantName,
  };
}

function Banner({
  tone,
  title,
  message,
}: {
  tone: 'success' | 'warning' | 'error';
  title: string;
  message: string;
}) {
  const config = {
    success: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      icon: (
        <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: (
        <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      icon: (
        <svg className="h-5 w-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
    },
  }[tone];

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <div className={`font-medium ${config.text}`}>{title}</div>
          <div className={`mt-1 text-sm ${config.text} opacity-80`}>{message}</div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-medium text-slate-700">
        {label}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className || ''}>
      <div className="mb-2 text-xs font-medium text-slate-700">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs text-slate-500">
        {label}
      </div>
      <div className={`break-words text-right text-xs font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="mt-1 flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          className={`h-4 w-4 ${index < rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
          viewBox="0 0 20 20"
        >
          <path d="M10 1.5 12.6 6.8l5.9.9-4.2 4.1 1 5.8L10 14.8 4.7 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5Z" />
        </svg>
      ))}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  subValue,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  subValue?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        {icon && (
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition group-hover:bg-purple-100 group-hover:text-accent">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 truncate text-lg font-semibold text-slate-900">
        {value}
      </div>
      {subValue && (
        <div className="mt-1 text-xs text-slate-500">{subValue}</div>
      )}
    </div>
  );
}


function ReviewAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || 'Reviewer'} className="h-12 w-12 rounded-full object-cover" />;
  }

  const initial = (name || 'G').trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-semibold text-white">
      {initial}
    </div>
  );
}

function SettingsCard({
  label,
  value,
  helper,
  mono = false,
}: {
  label: string;
  value: string;
  helper: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>
      <div className={`mt-3 break-words font-semibold tracking-tight text-slate-950 ${mono ? 'font-mono text-sm leading-6' : 'text-[18px]'}`}>
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{helper}</div>
    </div>
  );
}


function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-4 py-10">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

function emptyEditableProfile(): EditableGoogleBusinessProfile {
  return {
    title: '',
    primaryPhone: '',
    websiteUri: '',
    description: '',
    addressLine1: '',
    addressLine2: '',
    locality: '',
    administrativeArea: '',
    postalCode: '',
    regionCode: '',
    menuUrl: '',
    takeoutUrl: '',
    deliveryUrl: '',
  };
}

function buildMapsUrlFromPlaceId(placeId: string | null | undefined) {
  if (!placeId) {
    return null;
  }

  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

function truncateMiddle(value: string | null | undefined, max = 24) {
  if (!value) {
    return 'Unavailable';
  }

  if (value.length <= max) {
    return value;
  }

  const start = Math.ceil((max - 3) / 2);
  const end = Math.floor((max - 3) / 2);
  return `${value.slice(0, start)}...${value.slice(value.length - end)}`;
}

function formatGoogleLabel(value: string | null | undefined) {
  if (!value) {
    return 'Unavailable';
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function calculateAverageReviewRating(reviews: GoogleBusinessReview[]) {
  if (!reviews.length) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

function calculateAveragePlaceReviewRating(reviews: GooglePlaceReview[]) {
  if (!reviews.length) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function safeParseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
