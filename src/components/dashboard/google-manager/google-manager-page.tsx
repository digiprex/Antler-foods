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
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Google Workspace
            </div>
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">
                Google Manager
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Manage Google Business Profile OAuth, live listing details, business
                reviews, and replies without removing the existing Google Places
                fallback already used in Antler.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <InfoChip label="Restaurant" value={restaurant.name} />
              <InfoChip
                label="Source"
                value={
                  isBusinessConnected
                    ? 'Business Profile'
                    : isOauthConnected
                      ? 'OAuth connected'
                      : 'Places fallback'
                }
              />
              <InfoChip
                label="Mode"
                value={isBusinessConnected ? 'Live publish + reply' : 'Read-only fallback'}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open Google
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void launchGoogleConnection()}
              disabled={isLaunchingGoogleConnect}
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLaunchingGoogleConnect
                ? 'Redirecting...'
                : isOauthConnected
                  ? 'Reconnect Google'
                  : 'Login with Google'}
            </button>
            <button
              type="button"
              onClick={() => void loadGoogleManager({ silent: true })}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-22px_rgba(16,185,129,0.7)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadButtonLabel}
            </button>
          </div>
        </div>
      </div>

      {authNotice ? (
        <Banner
          tone={authNotice === 'oauth_error' ? 'error' : 'success'}
          title={
            authNotice === 'oauth_error'
              ? 'Google Business connection failed'
              : 'Google Business connected'
          }
          message={
            authNotice === 'oauth_error'
              ? authNoticeMessage || 'Google did not complete the OAuth flow.'
              : 'Google OAuth is connected. Select the Business Profile location to switch this page to live owner-managed data.'
          }
        />
      ) : null}

      {businessError && !isBusinessConnected && !placesProfile ? (
        <Banner
          tone="warning"
          title="Business Profile not active yet"
          message={`${businessError} The page is still trying to use the existing Google Places fallback so the current flow stays available.`}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Listing"
          value={summaryProfileLabel}
          valueClassName="text-[18px] leading-7"
          helper={
            isBusinessConnected
              ? 'Live Google Business Profile location'
              : isOauthConnected
                ? 'Google OAuth connected, location pending'
                : 'Existing Google Places fallback'
          }
        />
        <SummaryCard
          label="Average rating"
          value={summaryRating != null ? summaryRating.toFixed(1) : 'N/A'}
          helper={`${summaryReviewCount || 0} reviews available`}
        />
        <SummaryCard
          label="Category"
          value={businessProfile?.primaryCategory || placesProfile?.primary_type || 'Unavailable'}
          valueClassName="text-[18px] leading-7"
          helper="Current Google business type"
        />
        <SummaryCard
          label="Reference"
          value={summaryReference}
          valueClassName="font-mono text-sm leading-6 break-all"
          helper={
            isBusinessConnected
              ? 'Selected Google Business location'
              : 'Current Google place reference'
          }
        />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <TabButton label="Google Business Info" active={activeTab === 'info'} onClick={() => setActiveTab('info')} />
          <TabButton label="Google Reviews" active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} />
          <TabButton label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 px-2 py-16 text-sm text-slate-500">
            <PurpleDotSpinner size="sm" />
            <span>Loading Google manager...</span>
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
    <div className="space-y-6 pt-6">
      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        This restaurant is connected through Google Business Profile OAuth. Changes published here are sent to Google and reviews can be replied to from this workspace.
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Live Business Profile
              </div>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-950">
                {profile.title || 'Google Business Profile'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onPublish}
              disabled={isSavingProfile}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingProfile ? 'Publishing...' : 'Publish to Google'}
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Address
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <FormField label="Address line 1" value={editableProfile.addressLine1} onChange={(value) => onEditableProfileChange({ ...editableProfile, addressLine1: value })} />
              <FormField label="Address line 2" value={editableProfile.addressLine2} onChange={(value) => onEditableProfileChange({ ...editableProfile, addressLine2: value })} />
              <FormField label="City" value={editableProfile.locality} onChange={(value) => onEditableProfileChange({ ...editableProfile, locality: value })} />
              <FormField label="State" value={editableProfile.administrativeArea} onChange={(value) => onEditableProfileChange({ ...editableProfile, administrativeArea: value })} />
              <FormField label="Postal code" value={editableProfile.postalCode} onChange={(value) => onEditableProfileChange({ ...editableProfile, postalCode: value })} />
            </div>
          </div>

          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Action Links
            </div>
            <div className="mt-3 grid gap-4">
              <FormField label="Food ordering link" value={editableProfile.menuUrl} onChange={(value) => onEditableProfileChange({ ...editableProfile, menuUrl: value })} />
              <FormField label="Takeout link" value={editableProfile.takeoutUrl} onChange={(value) => onEditableProfileChange({ ...editableProfile, takeoutUrl: value })} />
              <FormField label="Delivery link" value={editableProfile.deliveryUrl} onChange={(value) => onEditableProfileChange({ ...editableProfile, deliveryUrl: value })} />
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Snapshot
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <DetailRow label="Category" value={profile.primaryCategory} />
              <DetailRow label="Open status" value={formatGoogleLabel(profile.openState)} />
              <DetailRow label="Store code" value={profile.storeCode} />
              <DetailRow label="Language" value={profile.languageCode} />
              <DetailRow label="Place ID" value={profile.placeId} mono />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Hours
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {profile.regularHours.length ? (
                profile.regularHours.map((entry) => (
                  <div key={entry} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    {entry}
                  </div>
                ))
              ) : (
                <p className="text-slate-500">Google did not return weekday hours.</p>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Attributes
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {profile.attributes.length ? (
                profile.attributes.map((attribute) => (
                  <div
                    key={attribute.attributeId || attribute.displayName || `${attribute.value}-${attribute.displayName}`}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="font-medium text-slate-900">
                      {attribute.displayName || attribute.attributeId || 'Attribute'}
                    </span>
                    <span className="text-right text-slate-600">
                      {attribute.value || 'Not set'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No attributes were returned by Google.</p>
              )}
            </div>
          </section>
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
    <div className="space-y-6 pt-6">
      <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Google OAuth is connected. Select the exact Business Profile location for this restaurant to unlock live profile publishing and review replies.
      </div>

      {accountLocations.length ? (
        <div className="space-y-4">
          {accountLocations.map((group) => (
            <section key={group.account.name} className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{group.account.accountName}</h2>
                  <p className="text-sm text-slate-500">{formatGoogleLabel(group.account.type)} account</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {group.locations.length} locations
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {group.locations.map((location) => {
                  const key = `${group.account.name}:${location.name}`;
                  const isSelected = selectedLocationName === location.name;

                  return (
                    <div key={location.name} className="flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-slate-950">
                          {location.title || 'Untitled Google location'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {location.placeId ? `Place ID: ${location.placeId}` : 'Place ID unavailable'}
                        </div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {location.languageCode || 'Language unavailable'}
                          {location.storeCode ? ` • Store code ${location.storeCode}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelect(group.account.name, location.name)}
                        disabled={Boolean(selectingLocationKey)}
                        className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {selectingLocationKey === key ? 'Saving...' : isSelected ? 'Selected' : 'Use this location'}
                      </button>
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
  profile: GooglePlaceProfile;
  placesError: string | null;
  onConnect: () => void;
  isLaunchingGoogleConnect: boolean;
}) {
  return (
    <div className="space-y-6 pt-6">
      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Google Business Profile OAuth is not connected yet. You are still seeing the existing Google Places data already used in Antler. Connect Google to enable publish and review replies.
      </div>

      {placesError ? <Banner tone="warning" title="Places fallback warning" message={placesError} /> : null}

      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-[24px] font-semibold tracking-tight text-slate-950">
              {profile.name || 'Google listing'}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {profile.formatted_address || 'Address not available'}
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={isLaunchingGoogleConnect}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLaunchingGoogleConnect ? 'Redirecting...' : 'Connect Google Business'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard label="Title" value={profile.name} />
        <InfoCard label="Phone Number" value={profile.phone_number} />
        <InfoCard label="Website" value={profile.website_url} href={profile.website_url} />
        <InfoCard label="Address" value={profile.formatted_address} />
        <InfoCard label="Business Status" value={formatGoogleLabel(profile.business_status)} />
        <InfoCard label="Primary Type" value={profile.primary_type} />
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
    <div className="space-y-4 pt-6">
      {reviews.map((review) => (
        <article key={review.name} className="rounded-[24px] border border-slate-200 bg-white p-5">
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
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <div className="font-semibold">Current owner reply</div>
                  <div className="mt-1 leading-6">{review.reviewReply.comment}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-700">
                    Updated {formatDateTime(review.reviewReply.updateTime)}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <textarea
                  value={replyDrafts[review.name] || ''}
                  onChange={(event) => onReplyDraftChange(review.name, event.target.value)}
                  rows={4}
                  placeholder="Write your reply..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
                <div className="flex flex-wrap gap-2">
                  {review.reviewerGoogleMapsUri ? (
                    <a
                      href={review.reviewerGoogleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Open on Google
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSubmitReply(review.name)}
                    disabled={replyingReviewName === review.name}
                    className="inline-flex items-center rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyingReviewName === review.name ? 'Publishing...' : 'Submit reply'}
                  </button>
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
    <div className="space-y-6 pt-6">
      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {isOauthConnected
          ? 'OAuth is connected, but no Business Profile location is selected yet. These are still public Google Places reviews.'
          : 'These are public Google Places reviews. Connect and select a Business Profile location to reply as the business owner.'}
      </div>

      {placesError ? (
        <EmptyState title="Unable to load reviews" message={placesError} />
      ) : reviews.length ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.external_review_id || `${review.author_name}-${review.published_at}`}
              className="rounded-[24px] border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start gap-4">
                <ReviewAvatar name={review.author_name} avatarUrl={review.avatar_url} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {review.author_name || 'Google user'}
                      </h3>
                      <ReviewStars rating={review.rating} />
                    </div>
                    <div className="text-sm text-slate-500">
                      {formatDateTime(review.published_at)}
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-slate-700">
                    {review.review_text || 'No written comment was included in this review.'}
                  </p>

                  {review.review_url ? (
                    <a
                      href={review.review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Open on Google
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No reviews found"
          message="Google did not return any public reviews for the linked place."
        />
      )}
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
  return (
    <div className="space-y-6 pt-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SettingsCard
          label="OAuth"
          value={connectionData?.connected ? 'Connected' : 'Not connected'}
          helper="Google Business Profile owner authentication"
        />
        <SettingsCard
          label="Selected location"
          value={connectionData?.connection?.googleLocationTitle || 'Not selected yet'}
          helper="The Business Profile location mapped to this restaurant"
        />
        <SettingsCard
          label="Data source"
          value={businessProfile ? 'Business Profile' : 'Places fallback'}
          helper="The source currently powering this page"
        />
        <SettingsCard
          label="Google place ID"
          value={businessProfile?.placeId || placesProfile?.place_id || 'Unavailable'}
          helper="Used by the fallback Places flow"
          mono
        />
      </div>

      {businessError ? (
        <Banner tone="warning" title="Business Profile issue" message={businessError} />
      ) : null}

      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Google Business Profile connection
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SettingsListCard
            title="Already active"
            items={[
              'Google Places profile fetch',
              'Public reviews fallback',
              'Google place ID based flows',
            ]}
          />
          <SettingsListCard
            title="Live owner-managed features"
            items={[
              connectionData?.connected ? 'OAuth is connected' : 'OAuth is not connected yet',
              connectionData?.hasSelectedLocation
                ? 'Business Profile location is selected'
                : 'Business Profile location still needs selection',
              businessProfile
                ? 'Publish and review reply are available'
                : 'Publish/reply activate after location selection',
            ]}
          />
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onConnect}
            disabled={isLaunchingGoogleConnect}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLaunchingGoogleConnect ? 'Redirecting...' : 'Connect Google Business'}
          </button>
        </div>
      </div>
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
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={`rounded-[24px] border p-4 ${toneClasses}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6">{message}</div>
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
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
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className={`break-words text-sm text-slate-900 ${mono ? 'font-mono leading-6' : 'leading-6'}`}>
        {value || 'Unavailable'}
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
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  valueClassName,
}: {
  label: string;
  value: string;
  helper: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>
      <div className={`mt-3 font-semibold tracking-tight text-slate-950 ${valueClassName || 'text-[24px]'}`}>
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{helper}</div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
      <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function InfoCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  const content = value || 'Unavailable';

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-base font-medium leading-7 text-slate-900">
        {href && value ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="break-words text-blue-600 hover:text-blue-700">
            {content}
          </a>
        ) : (
          <span className="break-words">{content}</span>
        )}
      </div>
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
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white">
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

function SettingsListCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
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
    <div className="flex min-h-[320px] items-center justify-center px-4 py-10">
      <div className="max-w-xl rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
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
