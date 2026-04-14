'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PurpleDotSpinner } from '@/components/dashboard/purple-dot-spinner';
import { nhost } from '@/lib/nhost';

type SaveNotice = {
  tone: 'success' | 'error';
  message: string;
};

type RestaurantScope = {
  id: string;
  name: string;
};

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
  can_connect_existing_account?: boolean;
  primary_action_label: string | null;
  account: {
    stripe_account_id: string | null;
    display_name: string | null;
    is_connected: boolean;
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    country: string | null;
    email: string | null;
    default_currency: string | null;
    last_synced_at: string | null;
    onboarding_status: StripeOwnerStatus;
    connection_mode?: 'hosted_onboarding' | 'existing_account_oauth' | null;
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

type RequirementItem = {
  raw: string;
  label: string;
  state: 'due' | 'past_due' | 'pending_review';
};

type RequirementGroup = {
  key: string;
  title: string;
  items: RequirementItem[];
};

const STRIPE_CONNECT_QUERY_KEY = 'stripe_connect';
const STRIPE_FLOW_QUERY_KEY = 'stripe_flow';
const STRIPE_NOTICE_QUERY_KEY = 'stripe_notice';

export function BankAccountsPage() {
  const restaurant = useRestaurantScope();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [accountState, setAccountState] = useState<StripeAccountState | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(Boolean(restaurant?.id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [isLaunchingOnboarding, setIsLaunchingOnboarding] = useState(false);
  const [isLaunchingExisting, setIsLaunchingExisting] = useState(false);
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

  const clearConnectQueryParams = useCallback(() => {
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
        const payload = (await safeParseJsonResponse(
          response,
        )) as StripeAccountApiResponse | null;

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
        const payload = (await safeParseJsonResponse(response)) as {
          success?: boolean;
          data?: {
            url?: string;
          };
          error?: string;
        } | null;

        if (!response.ok || payload?.success !== true || !payload?.data?.url) {
          throw new Error(payload?.error || 'Failed to start Stripe setup.');
        }

        window.location.assign(payload.data.url);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to start Stripe setup.';
        setNotice({
          tone: 'error',
          message,
        });

        if (automatic) {
          clearConnectQueryParams();
        }
      } finally {
        setIsLaunchingOnboarding(false);
      }
    },
    [cleanedReturnPath, clearConnectQueryParams, fetchWithAuth, restaurant?.id],
  );

  const launchExistingStripeConnection = useCallback(async () => {
    if (!restaurant?.id) {
      return;
    }

    setIsLaunchingExisting(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/stripe-account/connect-existing`,
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
      const payload = (await safeParseJsonResponse(response)) as {
        success?: boolean;
        data?: { url?: string };
        error?: string;
      } | null;

      if (!response.ok || payload?.success !== true || !payload?.data?.url) {
        throw new Error(
          payload?.error ||
            'Failed to start the existing Stripe account connection.',
        );
      }

      window.location.assign(payload.data.url);
    } catch (error) {
      setNotice({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to start the existing Stripe account connection.',
      });
    } finally {
      setIsLaunchingExisting(false);
    }
  }, [cleanedReturnPath, fetchWithAuth, restaurant?.id]);

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
        const payload = (await safeParseJsonResponse(
          response,
        )) as StripeAccountApiResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(
            payload?.error || 'Failed to refresh Stripe account status.',
          );
        }

        setAccountState(payload.data);
        if (successMessage || payload.message) {
          setNotice({
            tone: 'success',
            message:
              successMessage || payload.message || 'Stripe status refreshed.',
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
    const connectState =
      searchParams.get(STRIPE_CONNECT_QUERY_KEY)?.trim() ?? '';
    if (!connectState) {
      return;
    }

    if (connectState === 'refresh') {
      void launchStripeOnboarding({ automatic: true });
      return;
    }

    if (connectState === 'return') {
      const stripeFlow = searchParams.get(STRIPE_FLOW_QUERY_KEY)?.trim() ?? '';
      const successMessage =
        stripeFlow === 'existing_account'
          ? 'Existing Stripe account connected successfully.'
          : 'Stripe setup was updated successfully.';

      void refreshStripeStatus({
        successMessage,
      }).finally(() => {
        clearConnectQueryParams();
      });
      return;
    }

    if (connectState === 'oauth_error') {
      const errorMessage =
        searchParams.get(STRIPE_NOTICE_QUERY_KEY)?.trim() ||
        'Stripe could not connect the existing account.';
      setNotice({
        tone: 'error',
        message: errorMessage,
      });
      clearConnectQueryParams();
    }
  }, [
    clearConnectQueryParams,
    launchStripeOnboarding,
    refreshStripeStatus,
    searchParams,
  ]);

  if (!restaurant) {
    return <SelectionRequiredCard target="Bank Accounts" />;
  }

  if (isLoading && !accountState) {
    return <LoadingCard title="Bank Accounts" />;
  }

  if (loadError && !accountState) {
    return (
      <ErrorCard
        title="Bank Accounts"
        message={loadError}
        onRetry={() => {
          void loadStripeStatus();
        }}
      />
    );
  }

  const currentStatus = accountState?.status ?? 'not_connected';
  const account = accountState?.account ?? null;
  const requirementGroups = buildRequirementGroups(accountState);
  const showPrimaryOnboardingAction = Boolean(
    accountState?.can_launch_onboarding,
  );
  const canConnectExistingAccount = Boolean(
    accountState?.can_connect_existing_account &&
    currentStatus === 'not_connected',
  );

  return (
    <section className="space-y-5">
      <OperationsBankAccountsHeader restaurantName={restaurant.name} />
      <NoticeBanner notice={notice} />

      {/* Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Payments enabled"
          value={formatBooleanLabel(account?.charges_enabled)}
          tone={account?.charges_enabled ? 'success' : 'neutral'}
          icon={<MetricPaymentsIcon />}
          helper="Charge readiness from Stripe"
        />
        <MetricCard
          label="Payouts enabled"
          value={formatBooleanLabel(account?.payouts_enabled)}
          tone={account?.payouts_enabled ? 'success' : 'neutral'}
          icon={<MetricPayoutsIcon />}
          helper="Admin payout readiness signal"
        />
        <MetricCard
          label="Missing requirements"
          value={String(account?.requirements?.due_count ?? 0)}
          tone={account?.requirements?.due_count ? 'warning' : 'neutral'}
          icon={<MetricRequirementsIcon />}
          helper="Items Stripe still needs now"
        />
        <MetricCard
          label="Pending review"
          value={String(
            account?.requirements?.pending_verification_count ?? 0,
          )}
          tone={
            account?.requirements?.pending_verification_count
              ? 'warning'
              : 'neutral'
          }
          icon={<MetricReviewIcon />}
          helper="Submitted items under review"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* Left Column - Verification Status & Account Info */}
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <StatusPill status={currentStatus} />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600">
                  <StripeSparkIcon />
                  Stripe
                </span>
                {account?.connection_mode ? (
                  <ConnectionModePill
                    value={formatConnectionMode(account.connection_mode)}
                  />
                ) : null}
              </div>

              <div>
                <SectionEyebrow>Verification state</SectionEyebrow>
                <h2 className="mt-1.5 text-xl font-semibold text-gray-900">
                  {accountState?.status_label || 'Not connected'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {accountState?.message ||
                    'Connect Stripe to begin verification and prepare this restaurant for future payouts.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-4">
              {showPrimaryOnboardingAction ? (
                <ActionButton
                  tone="primary"
                  loading={isLaunchingOnboarding}
                  disabled={isLaunchingExisting}
                  icon={<StripeConnectIcon />}
                  onClick={() => {
                    void launchStripeOnboarding();
                  }}
                >
                  {accountState?.primary_action_label ||
                    'Connect with Stripe'}
                </ActionButton>
              ) : null}

              {canConnectExistingAccount ? (
                <ActionButton
                  tone="secondary"
                  loading={isLaunchingExisting}
                  disabled={isLaunchingOnboarding}
                  icon={<LinkAccountIcon />}
                  onClick={() => {
                    void launchExistingStripeConnection();
                  }}
                >
                  Connect existing Stripe account
                </ActionButton>
              ) : null}

              <ActionButton
                tone="ghost"
                loading={isRefreshingStatus}
                disabled={isLaunchingOnboarding || isLaunchingExisting}
                icon={<RefreshStatusIcon />}
                onClick={() => {
                  void refreshStripeStatus();
                }}
              >
                Refresh status
              </ActionButton>
            </div>
          </section>

          {/* Account Snapshot */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SectionEyebrow>Account snapshot</SectionEyebrow>
            <h2 className="mt-1.5 text-lg font-semibold text-gray-900">
              Connection overview
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Confirm which Stripe account is linked, how it was connected, and
              when we last synced the verification state.
            </p>

            <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/50">
              <InfoRow
                label="Account name"
                value={account?.display_name || 'Unavailable'}
              />
              <InfoRow
                label="Stripe account"
                value={account?.stripe_account_id || 'Not connected'}
              />
              <InfoRow
                label="Connected via"
                value={formatConnectionMode(account?.connection_mode)}
              />
              <InfoRow
                label="Contact email"
                value={account?.email || 'Unavailable'}
              />
              <InfoRow
                label="Country"
                value={account?.country || 'Unavailable'}
              />
              <InfoRow
                label="Currency"
                value={
                  account?.default_currency
                    ? account.default_currency.toUpperCase()
                    : 'Unavailable'
                }
              />
              <InfoRow
                label="Last synced"
                value={formatSyncTimestamp(account?.last_synced_at)}
              />
            </div>

            <div className="mt-4 grid gap-3 grid-cols-2">
              <SnapshotMiniCard
                label="Status"
                value={accountState?.status_label || 'Not connected'}
              />
              <SnapshotMiniCard
                label="Provider"
                value={accountState?.provider === 'stripe' ? 'Stripe' : '-'}
              />
            </div>
          </section>
        </div>

        {/* Right Column - Setup Guide/Insight & Owner Scope */}
        <div className="space-y-4">
          {/* Setup Guide or Status Insight */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {currentStatus === 'not_connected' ? (
              <CompactSetupGuide />
            ) : (
              <StatusInsightPanel
                status={currentStatus}
                connectionMode={account?.connection_mode}
                blockingIssue={accountState?.blocking_issue}
              />
            )}
          </section>

          {/* Owner Scope */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SectionEyebrow>Owner scope</SectionEyebrow>
            <h3 className="mt-1.5 text-lg font-semibold text-gray-900">
              Setup and verification only
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Owners can connect Stripe, complete setup, update required
              details, and refresh the status. Payout operations stay on the
              separate admin surface.
            </p>

            <div className="mt-4 space-y-3">
              <CompactListCard
                title="Allowed here"
                items={[
                  'Connect Stripe',
                  'Complete Stripe setup',
                  'Update required details',
                  'Refresh verification status',
                ]}
                tone="purple"
              />
              <CompactListCard
                title="Handled elsewhere"
                items={[
                  'Payout operations',
                  'Schedule changes',
                  'Withdrawals',
                  'Admin finance controls',
                ]}
                tone="slate"
              />
            </div>
          </section>
        </div>
      </div>

      {/* Requirements Section - Full width at bottom */}
      {requirementGroups.length > 0 || accountState?.blocking_issue ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                <RequirementsAlertIcon />
                Review needed
              </span>
              <h2 className="mt-3 text-lg font-semibold text-gray-900">
                Requirements to review
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-700">
                These are Stripe-managed details. Use the Stripe action above
                to submit updates, then refresh this page to pull the latest
                status back into Antler.
              </p>
            </div>
            {accountState?.blocking_issue ? (
              <div className="max-w-xl rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm leading-relaxed text-amber-700">
                {accountState.blocking_issue}
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {/* Small groups first - in a 2-column grid */}
            {requirementGroups.filter((g) => g.items.length <= 5).length > 0 ? (
              <div className="grid items-start gap-3 lg:grid-cols-2">
                {requirementGroups
                  .filter((g) => g.items.length <= 5)
                  .map((group) => (
                    <section
                      key={group.key}
                      className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {group.title}
                        </h3>
                        <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={`${group.key}-${item.raw}-${item.state}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                              <span className="text-sm text-gray-700">
                                {item.label}
                              </span>
                            </div>
                            <RequirementStateBadge state={item.state} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            ) : null}

            {/* Large groups - each takes full width */}
            {requirementGroups
              .filter((g) => g.items.length > 5)
              .map((group) => (
                <section
                  key={group.key}
                  className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {group.title}
                    </h3>
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((item) => (
                      <div
                        key={`${group.key}-${item.raw}-${item.state}`}
                        className="flex flex-col gap-1.5 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                          <span className="text-sm text-gray-700">
                            {item.label}
                          </span>
                        </div>
                        <RequirementStateBadge state={item.state} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function useRestaurantScope(): RestaurantScope | null {
  const searchParams = useSearchParams() ?? new URLSearchParams();
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

async function safeParseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildBankAccountsReturnPath(
  pathname: string,
  searchParams: { toString(): string },
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(STRIPE_CONNECT_QUERY_KEY);
  params.delete(STRIPE_FLOW_QUERY_KEY);
  params.delete(STRIPE_NOTICE_QUERY_KEY);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildRequirementGroups(
  accountState: StripeAccountState | null,
): RequirementGroup[] {
  const account = accountState?.account;
  if (!account) {
    return [];
  }

  const groups = new Map<string, RequirementGroup>();

  const addItems = (values: string[], state: RequirementItem['state']) => {
    values.forEach((value) => {
      const normalized = value.trim();
      if (!normalized) {
        return;
      }

      const groupKey = resolveRequirementGroup(normalized);
      const existing = groups.get(groupKey);
      const nextItem = {
        raw: normalized,
        label: formatStripeRequirementLabel(normalized),
        state,
      } satisfies RequirementItem;

      if (!existing) {
        groups.set(groupKey, {
          key: groupKey,
          title: REQUIREMENT_GROUP_TITLES[groupKey] || 'Additional details',
          items: [nextItem],
        });
        return;
      }

      if (
        existing.items.some(
          (item) => item.raw === nextItem.raw && item.state === nextItem.state,
        )
      ) {
        return;
      }

      existing.items.push(nextItem);
    });
  };

  addItems(account.requirements.currently_due, 'due');
  addItems(account.requirements.past_due, 'past_due');
  addItems(account.requirements.pending_verification, 'pending_review');

  return Array.from(groups.values()).sort((left, right) =>
    left.title.localeCompare(right.title),
  );
}

function resolveRequirementGroup(value: string) {
  if (value.startsWith('external_account')) {
    return 'bank_details';
  }

  if (
    value.startsWith('representative') ||
    value.startsWith('owners') ||
    value.startsWith('owner') ||
    value.startsWith('directors') ||
    value.startsWith('executives') ||
    value.startsWith('person')
  ) {
    return 'representative';
  }

  if (value.startsWith('tos_acceptance')) {
    return 'terms';
  }

  if (
    value.startsWith('business_profile') ||
    value.startsWith('settings.payments') ||
    value.startsWith('business_type') ||
    value.startsWith('company') ||
    value.startsWith('individual')
  ) {
    return 'business_profile';
  }

  if (value.includes('verification') || value.includes('document')) {
    return 'compliance';
  }

  return 'additional';
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

function formatConnectionMode(
  value: 'hosted_onboarding' | 'existing_account_oauth' | null | undefined,
) {
  if (value === 'existing_account_oauth') {
    return 'Existing Stripe account';
  }

  if (value === 'hosted_onboarding') {
    return 'Stripe hosted onboarding';
  }

  return 'Not connected';
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

function SelectionRequiredCard({ target }: { target: string }) {
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionEyebrow>{target}</SectionEyebrow>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">
          Select a restaurant to get started
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
          Pick a restaurant from the dashboard search so the Bank Accounts page
          can load the correct Stripe connection state, actions, and
          verification details.
        </p>
      </div>
    </section>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
          <PageBankIcon />
        </div>
        <div className="space-y-0.5">
          <SectionEyebrow>{title}</SectionEyebrow>
          <p className="text-sm font-medium text-gray-900">
            Loading Stripe connection state...
          </p>
        </div>
        <PurpleDotSpinner size="sm" />
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
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <SectionEyebrow>{title}</SectionEyebrow>
        <p className="max-w-2xl text-sm leading-relaxed text-red-700">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function OperationsBankAccountsHeader({
  restaurantName,
}: {
  restaurantName: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
            <PageBankIcon />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Bank Accounts</h1>
            <p className="text-sm text-gray-500">Stripe Connect integration</p>
          </div>
        </div>
        {/* <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
          <RestaurantChipIcon />
          <span className="max-w-[260px] truncate sm:max-w-[420px]">
            {restaurantName}
          </span>
        </div> */}
      </div>
    </div>
  );
}

function NoticeBanner({ notice }: { notice: SaveNotice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <p
      className={cx(
        'rounded-lg px-4 py-3 text-sm font-medium',
        notice.tone === 'success'
          ? 'border border-green-200 bg-green-50 text-green-700'
          : 'border border-red-200 bg-red-50 text-red-700',
      )}
    >
      {notice.message}
    </p>
  );
}

function ActionButton({
  children,
  icon,
  tone,
  loading,
  disabled,
  onClick,
}: {
  children: string;
  icon: ReactNode;
  tone: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
        tone === 'primary'
          ? 'bg-purple-600 text-white hover:bg-purple-700'
          : tone === 'secondary'
            ? 'border border-purple-200 bg-white text-purple-700 hover:bg-purple-50'
            : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        loading || disabled
          ? 'cursor-not-allowed opacity-50'
          : '',
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {loading ? <PurpleDotSpinner size="inline" /> : icon}
      </span>
      <span>{children}</span>
    </button>
  );
}

function StatusPill({ status }: { status: StripeOwnerStatus }) {
  const config =
    status === 'active'
      ? {
          label: 'Active',
          className: 'bg-green-100 text-green-800',
        }
      : status === 'setup_incomplete'
        ? {
            label: 'Setup incomplete',
            className: 'bg-amber-100 text-amber-800',
          }
        : status === 'action_required'
          ? {
              label: 'Action required',
              className: 'bg-red-100 text-red-800',
            }
          : {
              label: 'Not connected',
              className: 'bg-gray-100 text-gray-700',
            };

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
        config.className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone,
  helper,
  icon,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
  helper: string;
  icon: ReactNode;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-green-200 bg-green-50/50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/50'
        : 'border-gray-200 bg-white';

  const iconToneClass =
    tone === 'success'
      ? 'bg-green-100 text-green-600'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-600'
        : 'bg-gray-100 text-gray-500';

  return (
    <div
      className={cx(
        'rounded-xl border p-4 shadow-sm',
        toneClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
            {value}
          </p>
        </div>
        <div
          className={cx(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            iconToneClass,
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">{helper}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const isFallback =
    value === 'Not connected' ||
    value === 'Unavailable' ||
    value === 'Not synced yet';

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={cx(
          'max-w-[62%] break-words text-right text-sm font-medium',
          isFallback ? 'text-gray-400' : 'text-gray-900',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RequirementStateBadge({ state }: { state: RequirementItem['state'] }) {
  const config =
    state === 'past_due'
      ? {
          label: 'Past due',
          className: 'bg-red-100 text-red-700',
        }
      : state === 'pending_review'
        ? {
            label: 'Pending review',
            className: 'bg-blue-100 text-blue-700',
          }
        : {
            label: 'Required now',
            className: 'bg-amber-100 text-amber-700',
          };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

function ConnectionModePill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
      {value}
    </span>
  );
}

function StatusInsightPanel({
  status,
  connectionMode,
  blockingIssue,
}: {
  status: StripeOwnerStatus;
  connectionMode:
    | 'hosted_onboarding'
    | 'existing_account_oauth'
    | null
    | undefined;
  blockingIssue: string | null | undefined;
}) {
  const content =
    status === 'active'
      ? {
          eyebrow: 'Healthy connection',
          title: 'Stripe setup is complete for this restaurant',
          description:
            'The account is linked, verification looks healthy, and Antler can keep syncing readiness state from Stripe.',
        }
      : status === 'action_required'
        ? {
            eyebrow: 'Action required',
            title: 'Stripe needs attention before the account is fully ready',
            description:
              'Review the details Stripe flagged below, relaunch setup to submit updates, then refresh the state in Antler.',
          }
        : {
            eyebrow: 'Setup in progress',
            title: 'The account is linked, but Stripe still needs more details',
            description:
              'Continue the Stripe-managed setup to finish verification and close any remaining readiness gaps.',
          };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <SectionEyebrow>{content.eyebrow}</SectionEyebrow>
          <h2 className="mt-1.5 text-lg font-semibold text-gray-900">
            {content.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {content.description}
          </p>
        </div>
        <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
          Connected via: {formatConnectionMode(connectionMode)}
        </span>
      </div>
      {blockingIssue ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
          {blockingIssue}
        </div>
      ) : null}
    </div>
  );
}

function CompactSetupGuide() {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="mt-2 text-[1.2rem] font-semibold tracking-[-0.02em] text-[#140f23] sm:text-[1.3rem]">
            Stripe handles the setup, Antler keeps the status in sync
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#676075]">
            Choose a connection path, complete verification inside Stripe, then
            return here to review the updated readiness state.
          </p>
        </div>
        <div className="rounded-2xl border border-[#ece6fb] bg-white px-4 py-3 text-sm text-[#67598f] shadow-sm">
          Owners can connect and verify. Payout controls stay admin-only.
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {CONNECT_STEPS.map((step, index) => (
          <div
            key={step.title}
            className="rounded-[22px] border border-[#ebe6f8] bg-white px-4 py-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3ecff] text-[#6d28d9]">
                <ConnectStepIcon index={index} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a78c2]">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#171220]">
                  {step.title}
                </h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#676075]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'purple' | 'slate';
}) {
  return (
    <div
      className={cx(
        'rounded-[22px] border px-4 py-4 shadow-sm',
        tone === 'purple'
          ? 'border-[#e5dbfb] bg-[#faf7ff]'
          : 'border-[#e8ebf2] bg-[#fbfcfe]',
      )}
    >
      <p className="text-[15px] font-semibold text-[#171220]">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm leading-6 text-[#656d7e]"
          >
            <span
              className={cx(
                'mt-2 h-2 w-2 rounded-full',
                tone === 'purple' ? 'bg-[#8b5cf6]' : 'bg-[#cbd5e1]',
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OwnerScopeCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'neutral';
}) {
  return (
    <div
      className={cx(
        'rounded-[24px] border p-4 shadow-sm',
        tone === 'positive'
          ? 'border-[#ddd1fb] bg-[#faf7ff]'
          : 'border-[#e8ebf2] bg-[#fbfcfe]',
      )}
    >
      <p className="text-sm font-semibold text-[#171220]">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2.5 text-sm text-[#656d7e]"
          >
            <span
              className={cx(
                'h-2.5 w-2.5 rounded-full',
                tone === 'positive' ? 'bg-[#8b5cf6]' : 'bg-[#cbd5e1]',
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SnapshotMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#edf0f8] bg-[#fbfbfe] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a90a1]">
        {label}
      </p>
      <p className="mt-2 text-[15px] font-semibold text-[#171220]">{value}</p>
    </div>
  );
}

function PageBankIcon() {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M6 15h4" />
      <path d="M16 15h2" />
    </svg>
  );
}

function RestaurantChipIcon() {
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
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
      <path d="M3 21h18" />
      <path d="M9 7h1" />
      <path d="M14 7h1" />
      <path d="M9 11h1" />
      <path d="M14 11h1" />
    </svg>
  );
}

function StripeSparkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m18.4 5.6-2.8 2.8" />
      <path d="m8.4 15.6-2.8 2.8" />
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

function LinkAccountIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.43" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41" />
    </svg>
  );
}

function MetricPaymentsIcon() {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function MetricPayoutsIcon() {
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
      <path d="M12 3v18" />
      <path d="m17 8-5-5-5 5" />
      <path d="M20 21H4" />
    </svg>
  );
}

function MetricRequirementsIcon() {
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
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function MetricReviewIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
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
      className="h-4 w-4"
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

function ConnectStepIcon({ index }: { index: number }) {
  if (index === 0) {
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
        <path d="M8 12h8" />
        <path d="m12 8 4 4-4 4" />
        <path d="M4 12a8 8 0 0 1 8-8" />
      </svg>
    );
  }

  if (index === 1) {
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
        <path d="M12 3 4 7v6c0 5 3.4 7.8 8 8 4.6-.2 8-3 8-8V7l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

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
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const CONNECT_STEPS = [
  {
    title: 'Choose your connection path',
    description:
      'Start Stripe-hosted onboarding or connect an existing eligible Stripe account directly.',
  },
  {
    title: 'Stripe collects the sensitive details',
    description:
      'Business, verification, and external-account details stay inside Stripe-managed flows.',
  },
  {
    title: 'Antler syncs the readiness state',
    description:
      'The dashboard refreshes charges, payouts, and requirements so support can see what is still pending.',
  },
];

const REQUIREMENT_GROUP_TITLES: Record<string, string> = {
  additional: 'Additional details',
  bank_details: 'Bank or external account',
  business_profile: 'Business profile',
  compliance: 'Compliance checks',
  representative: 'Representative details',
  terms: 'Terms acceptance',
};
