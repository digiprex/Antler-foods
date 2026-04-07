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
    <section className="space-y-6">
      <OperationsBankAccountsHeader restaurantName={restaurant.name} />
      <NoticeBanner notice={notice} />

      <section className="overflow-hidden rounded-[32px] border border-[#e4d7ff] bg-white shadow-[0_18px_60px_rgba(113,77,255,0.08)]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="border-b border-[#ede7fb] bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#fbf9ff_100%)] p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={currentStatus} />
                  <span className="inline-flex items-center rounded-full border border-[#ded8f8] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b5ca5]">
                    Powered by Stripe
                  </span>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
                    {accountState?.status_label || 'Not connected'}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-[#5c6477]">
                    {accountState?.message ||
                      'Connect Stripe to begin verification for this restaurant.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
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
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Payments enabled"
                value={formatBooleanLabel(account?.charges_enabled)}
                tone={account?.charges_enabled ? 'success' : 'neutral'}
              />
              <MetricCard
                label="Payouts enabled"
                value={formatBooleanLabel(account?.payouts_enabled)}
                tone={account?.payouts_enabled ? 'success' : 'neutral'}
              />
              <MetricCard
                label="Missing requirements"
                value={String(account?.requirements?.due_count ?? 0)}
                tone={account?.requirements?.due_count ? 'warning' : 'neutral'}
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
              />
            </div>

            {currentStatus === 'not_connected' ? (
              <div className="mt-8 grid gap-4 rounded-[28px] border border-[#e8e0fb] bg-white/85 p-5 sm:grid-cols-3">
                {CONNECT_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-[#ede7fb] bg-[#fcfbff] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b77d9]">
                      Step {index + 1}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#111827]">
                      {step.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#61697b]">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col justify-between gap-6 bg-[#fbfbfe] p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#786aa9]">
                  Account snapshot
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
                  Connection overview
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6c78]">
                  One place to confirm which Stripe account is linked, how it
                  was connected, and when we last synced the verification state.
                </p>
              </div>

              <div className="space-y-3 rounded-[28px] border border-[#e7ebf2] bg-white p-5 shadow-sm">
                <InfoRow
                  label="Stripe account"
                  value={account?.stripe_account_id || 'Not connected'}
                />
                <InfoRow
                  label="Connected via"
                  value={formatConnectionMode(account?.connection_mode)}
                />
                <InfoRow
                  label="Email"
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
            </div>

            <div className="rounded-[28px] border border-[#e7ebf2] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#111827]">
                Owner access is limited on purpose
              </p>
              <p className="mt-2 text-sm leading-6 text-[#5f6c78]">
                Restaurant owners can connect Stripe, complete verification, and
                update required details. Payout controls remain on a separate
                Antler admin surface.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {requirementGroups.length > 0 || accountState?.blocking_issue ? (
        <section className="rounded-[32px] border border-[#f6dcc1] bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ef_100%)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f3d3a7] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b6a21]">
                <RequirementsAlertIcon />
                Review needed
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#111827]">
                Requirements to review
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#7c5b2a]">
                These are Stripe-managed details. Use the Stripe action above to
                submit updates, then refresh this page to pull the latest status
                back into Antler.
              </p>
            </div>
            {accountState?.blocking_issue ? (
              <div className="max-w-xl rounded-2xl border border-[#f1d1a4] bg-white px-4 py-3 text-sm text-[#8a5b14] shadow-sm">
                {accountState.blocking_issue}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {requirementGroups.map((group) => (
              <section
                key={group.key}
                className="rounded-[28px] border border-[#f2dac1] bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[#111827]">
                  {group.title}
                </h3>
                <div className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={`${group.key}-${item.raw}-${item.state}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f3e1ca] bg-[#fffdfa] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[#3f4451]">
                        {item.label}
                      </span>
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
      <h1 className="text-4xl font-semibold tracking-tight text-[#101827]">
        {target}
      </h1>
      <div className="rounded-[32px] border border-[#d7e2e6] bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-[#111827]">
          Select a restaurant
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#5f6c78]">
          Pick a restaurant from the dashboard search so this workspace can load
          the correct Stripe connection state.
        </p>
      </div>
    </section>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <h1 className="text-4xl font-semibold tracking-tight text-[#101827]">
        {title}
      </h1>
      <div className="flex items-center gap-3 rounded-[32px] border border-[#d7e2e6] bg-white p-8 text-sm text-[#5f6c78] shadow-sm">
        <PurpleDotSpinner size="sm" />
        <span>Loading Stripe connection state...</span>
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
      <h1 className="text-4xl font-semibold tracking-tight text-[#101827]">
        {title}
      </h1>
      <div className="space-y-4 rounded-[32px] border border-[#f0d5d5] bg-white p-8 shadow-sm">
        <p className="text-base leading-7 text-[#a72b2b]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937]"
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#e8defb] bg-white px-4 py-2 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#8b5cf6] to-[#a78bfa] text-white shadow-[0_10px_30px_rgba(124,58,237,0.32)]">
            <PageBankIcon />
          </div>
          <div>
            {/* <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b77d9]">
              Operations
            </p> */}
            <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">
              Bank Accounts
            </h1>
          </div>
        </div>
        <p className="max-w-3xl text-base leading-7 text-[#5f6c78]">
          Connect Stripe, finish verification, and monitor account readiness for
          this restaurant without exposing payout controls on the owner surface.
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[#ded8f8] bg-white px-4 py-2 text-sm font-medium text-[#4b3f79] shadow-sm">
        <RestaurantChipIcon />
        <span>{restaurantName}</span>
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
        'rounded-2xl px-4 py-3 text-sm shadow-sm',
        notice.tone === 'success'
          ? 'border border-[#d9c9ff] bg-[#f5f0ff] text-[#5b21b6]'
          : 'border border-[#f3c8c8] bg-[#fff0f0] text-[#a72b2b]',
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
        'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition',
        tone === 'primary'
          ? 'bg-[#111827] text-white hover:bg-[#1f2937]'
          : tone === 'secondary'
            ? 'border border-[#d5cdf5] bg-white text-[#31274f] hover:border-[#c3b5ee] hover:bg-[#faf8ff]'
            : 'border border-[#d2dde2] bg-white text-[#111827] hover:border-[#c4d3da] hover:bg-[#f8fafc]',
        loading || disabled ? 'cursor-not-allowed opacity-60' : '',
      )}
    >
      {loading ? <PurpleDotSpinner size="inline" /> : icon}
      <span>{children}</span>
    </button>
  );
}

function StatusPill({ status }: { status: StripeOwnerStatus }) {
  const config =
    status === 'active'
      ? {
          label: 'Active',
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : status === 'setup_incomplete'
        ? {
            label: 'Setup incomplete',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
          }
        : status === 'action_required'
          ? {
              label: 'Action required',
              className: 'border-rose-200 bg-rose-50 text-rose-700',
            }
          : {
              label: 'Not connected',
              className: 'border-slate-200 bg-slate-50 text-slate-700',
            };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function MetricCard({
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
      ? 'border-emerald-200 bg-emerald-50/70'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/70'
        : 'border-[#e4e9f1] bg-white';

  return (
    <div className={cx('rounded-[24px] border p-5 shadow-sm', toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#edf1f6] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-[#6b7280]">{label}</span>
      <span className="max-w-[62%] break-words text-right text-sm font-medium text-[#111827]">
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
          className: 'border-rose-200 bg-rose-50 text-rose-700',
        }
      : state === 'pending_review'
        ? {
            label: 'Pending review',
            className: 'border-sky-200 bg-sky-50 text-sky-700',
          }
        : {
            label: 'Required now',
            className: 'border-amber-200 bg-amber-50 text-amber-700',
          };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        config.className,
      )}
    >
      {config.label}
    </span>
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
