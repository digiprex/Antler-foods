'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { nhost } from '@/lib/nhost';

type RestaurantScope = {
  id: string;
  name: string;
};

type SaveNotice = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

type PendingPayoutOrder = {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  payoutStatus: string;
  payoutAmount: number;
  placedAt: string | null;
};

type PayoutBatchSummary = {
  payoutBatchId: string;
  restaurantId: string;
  stripeConnectedAccountId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  orderCount: number;
  totalPayoutAmount: number;
  stripeTransferId: string | null;
  status: string;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PayoutDashboardData = {
  stripeConnectedAccountId: string | null;
  currency: string;
  pendingOrderCount: number;
  pendingPayoutAmount: number;
  pendingOrders: PendingPayoutOrder[];
  recentBatches: PayoutBatchSummary[];
};

type PayoutDashboardResponse = {
  success: boolean;
  data?: PayoutDashboardData;
  error?: string;
};

type PayoutRunResponse = {
  success: boolean;
  data?: {
    status: 'created' | 'skipped';
    batch: PayoutBatchSummary | null;
    claimedOrderCount: number;
    totalPayoutAmount: number;
    message: string;
  };
  error?: string;
};

export function PayoutsPage() {
  const restaurant = useRestaurantScope();
  const [data, setData] = useState<PayoutDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(restaurant?.id));
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | string>(
    'all',
  );
  const [orderSearch, setOrderSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | string>(
    'all',
  );

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

  const loadPayouts = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!restaurant?.id) {
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (!silent) {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response = await fetchWithAuth(
          `/api/payout-batches?restaurant_id=${encodeURIComponent(restaurant.id)}`,
          { cache: 'no-store' },
        );
        const payload = (await safeParseJsonResponse(
          response,
        )) as PayoutDashboardResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.error || 'Failed to load payout data.');
        }

        setData(payload.data);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load payout data.';
        setError(message);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [fetchWithAuth, restaurant?.id],
  );

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const runPayoutNow = useCallback(async () => {
    if (!restaurant?.id) {
      return;
    }

    setIsRunning(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth('/api/payout-batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
        }),
      });
      const payload = (await safeParseJsonResponse(
        response,
      )) as PayoutRunResponse | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Failed to create payout batch.');
      }

      setNotice({
        tone:
          payload.data.status === 'created'
            ? 'success'
            : 'info',
        message: payload.data.message,
      });
      await loadPayouts({ silent: true });
    } catch (runError) {
      setNotice({
        tone: 'error',
        message:
          runError instanceof Error
            ? runError.message
            : 'Failed to create payout batch.',
      });
    } finally {
      setIsRunning(false);
    }
  }, [fetchWithAuth, loadPayouts, restaurant?.id]);

  const currency = useMemo(
    () => (data?.currency || 'usd').toUpperCase(),
    [data?.currency],
  );
  const latestBatch = data?.recentBatches[0] || null;
  const latestSuccessfulBatch = useMemo(
    () =>
      data?.recentBatches.find((batch) => batch.status.toLowerCase() === 'transferred') ||
      null,
    [data?.recentBatches],
  );
  const latestFailedBatch = useMemo(
    () =>
      data?.recentBatches.find((batch) =>
        ['failed', 'reversed'].includes(batch.status.toLowerCase()),
      ) || null,
    [data?.recentBatches],
  );

  const filteredBatches = useMemo(() => {
    const items = data?.recentBatches || [];
    const normalizedSearch = batchSearch.trim().toLowerCase();

    return items.filter((batch) => {
      const matchesStatus =
        batchStatusFilter === 'all' ||
        batch.status.toLowerCase() === batchStatusFilter.toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        batch.payoutBatchId.toLowerCase().includes(normalizedSearch) ||
        (batch.stripeTransferId || '').toLowerCase().includes(normalizedSearch) ||
        formatDate(batch.periodStart).toLowerCase().includes(normalizedSearch) ||
        formatDate(batch.periodEnd).toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [batchSearch, batchStatusFilter, data?.recentBatches]);

  const filteredPendingOrders = useMemo(() => {
    const items = data?.pendingOrders || [];
    const normalizedSearch = orderSearch.trim().toLowerCase();

    return items.filter((order) => {
      const matchesPaymentStatus =
        paymentStatusFilter === 'all' ||
        order.paymentStatus.toLowerCase() === paymentStatusFilter.toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.orderId.toLowerCase().includes(normalizedSearch);

      return matchesPaymentStatus && matchesSearch;
    });
  }, [data?.pendingOrders, orderSearch, paymentStatusFilter]);

  const batchStatuses = useMemo(
    () =>
      Array.from(
        new Set((data?.recentBatches || []).map((batch) => batch.status.toLowerCase())),
      ).sort(),
    [data?.recentBatches],
  );
  const paymentStatuses = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.pendingOrders || []).map((order) => order.paymentStatus.toLowerCase()),
        ),
      ).sort(),
    [data?.pendingOrders],
  );

  if (!restaurant) {
    return (
      <section className="space-y-5">
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">
          Payouts
        </h1>
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Select a restaurant to review payout batches.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">
              Weekly payout ledger
            </div>
            <div className="space-y-2">
              <h1 className="text-[24px] font-semibold tracking-tight text-slate-950">
                Restaurant payouts
              </h1>
              <p className="max-w-3xl text-[13px] leading-6 text-slate-600">
                Review eligible orders, payout batches, and Stripe transfer results
                in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <InfoChip label="Restaurant" value={restaurant.name} />
              <InfoChip label="Settlement model" value="Weekly batch transfer" />
              <InfoChip
                label="Transfer target"
                value={
                  data?.stripeConnectedAccountId
                    ? 'Connected account ready'
                    : 'Stripe account missing'
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadPayouts()}
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void runPayoutNow()}
              disabled={isRunning}
              className="inline-flex items-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-22px_rgba(124,58,237,0.7)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? 'Running payout...' : 'Run payout now'}
            </button>
          </div>
        </div>
      </div>

      {notice ? (
        <Banner tone={notice.tone} message={notice.message} />
      ) : null}

      {error ? <Banner tone="error" message={error} /> : null}

      {isLoading && !data ? (
        <div className="flex items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-16 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="h-8 w-8">
              <svg
                className="h-8 w-8 animate-spin text-violet-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  className="stroke-current opacity-20"
                  strokeWidth="3"
                />
                <path
                  d="M22 12a10 10 0 00-10-10"
                  className="stroke-current"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Loading payout ledger...
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
                  Eligible orders
                </div>
                <h2 className="mt-2 text-[21px] font-semibold tracking-tight text-slate-950">
                  Pending payout orders
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  Orders in this table are still waiting to be included in a payout batch.
                </p>
              </div>
              <div className="text-xs font-medium text-slate-500">
                {filteredPendingOrders.length} of {data?.pendingOrders.length || 0} orders
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <FilterInput
                value={orderSearch}
                onChange={setOrderSearch}
                placeholder="Search order number or order id"
              />
              <FilterSelect
                value={paymentStatusFilter}
                onChange={setPaymentStatusFilter}
                options={[
                  { value: 'all', label: 'All payment states' },
                  ...paymentStatuses.map((status) => ({
                    value: status,
                    label: formatBatchStatus(status),
                  })),
                ]}
              />
            </div>

            {filteredPendingOrders.length ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Placed</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Payout state</th>
                        <th className="px-4 py-3">Eligible amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredPendingOrders.map((order) => (
                        <tr key={order.orderId} className="align-top">
                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div className="font-semibold text-slate-950">
                              {order.orderNumber}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {truncateMiddle(order.orderId, 18)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatDateTime(order.placedAt)}
                          </td>
                          <td className="px-4 py-4">
                            <InlinePill value={order.paymentStatus} tone="payment" />
                          </td>
                          <td className="px-4 py-4">
                            <InlinePill value={order.payoutStatus} tone="payout" />
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(order.payoutAmount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState message="No pending payout orders match the current filters." />
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Pending payout"
              value={formatCurrency(data?.pendingPayoutAmount || 0, currency)}
              helper={`${data?.pendingOrderCount || 0} orders waiting for settlement`}
            />
            <SummaryCard
              label="Latest batch"
              value={
                latestBatch
                  ? formatCurrency(
                      latestBatch.totalPayoutAmount,
                      latestBatch.currency.toUpperCase(),
                    )
                  : '—'
              }
              helper={
                latestBatch
                  ? `Created ${formatDateTime(latestBatch.createdAt)}`
                  : 'No payout batch created yet'
              }
            />
            <SummaryCard
              label="Last successful transfer"
              value={
                latestSuccessfulBatch
                  ? formatCurrency(
                      latestSuccessfulBatch.totalPayoutAmount,
                      latestSuccessfulBatch.currency.toUpperCase(),
                    )
                  : '—'
              }
              helper={
                latestSuccessfulBatch
                  ? truncateMiddle(latestSuccessfulBatch.stripeTransferId)
                  : 'No successful transfer yet'
              }
            />
            <SummaryCard
              label="Connected account"
              value={truncateMiddle(data?.stripeConnectedAccountId, 24)}
              valueClassName="font-mono text-[16px] leading-6 break-all"
              helper={
                latestFailedBatch
                  ? `Latest failure: ${formatBatchStatus(latestFailedBatch.status)}`
                  : 'Stripe destination account'
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
                    Batch history
                  </div>
                  <h2 className="mt-2 text-[21px] font-semibold tracking-tight text-slate-950">
                    Weekly payout batches
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-slate-600">
                    Review payout totals, transfer ids, and final batch status.
                  </p>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {filteredBatches.length} of {data?.recentBatches.length || 0} batches
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
                <FilterInput
                  value={batchSearch}
                  onChange={setBatchSearch}
                  placeholder="Search batch id or transfer id"
                />
                <FilterSelect
                  value={batchStatusFilter}
                  onChange={setBatchStatusFilter}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    ...batchStatuses.map((status) => ({
                      value: status,
                      label: formatBatchStatus(status),
                    })),
                  ]}
                />
              </div>

              {filteredBatches.length ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <th className="px-4 py-3">Batch</th>
                          <th className="px-4 py-3">Period</th>
                          <th className="px-4 py-3">Orders</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Stripe transfer</th>
                          <th className="px-4 py-3">Processed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredBatches.map((batch) => (
                          <tr key={batch.payoutBatchId} className="align-top">
                            <td className="px-4 py-4 text-sm text-slate-700">
                              <div className="font-semibold text-slate-950">
                                {truncateMiddle(batch.payoutBatchId, 18)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Created {formatDateTime(batch.createdAt)}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              <div>{formatDate(batch.periodStart)}</div>
                              <div className="text-xs text-slate-500">
                                to {formatDate(batch.periodEnd)}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-900">
                              {batch.orderCount}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {formatCurrency(
                                batch.totalPayoutAmount,
                                batch.currency.toUpperCase(),
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <StatusPill status={batch.status} />
                              {batch.failureReason ? (
                                <div className="mt-2 max-w-[220px] text-xs leading-5 text-red-600">
                                  {batch.failureReason}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {batch.stripeTransferId ? (
                                <span className="font-medium text-slate-900">
                                  {truncateMiddle(batch.stripeTransferId)}
                                </span>
                              ) : (
                                <span className="text-slate-400">Not created</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {formatDateTime(batch.processedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState message="No payout batches match the current filters." />
              )}
            </section>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
                Settlement snapshot
              </div>
              <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-950">
                Current configuration
              </h2>

              <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-3xl border border-slate-200">
                <InfoRow
                  label="Connected account"
                  value={truncateMiddle(data?.stripeConnectedAccountId, 24)}
                  valueClassName="font-mono text-[12px] leading-5 break-all"
                />
                <InfoRow label="Currency" value={currency} />
                <InfoRow label="Pending orders" value={String(data?.pendingOrderCount || 0)} />
                <InfoRow
                  label="Pending payout"
                  value={formatCurrency(data?.pendingPayoutAmount || 0, currency)}
                />
                <InfoRow
                  label="Latest batch status"
                  value={latestBatch ? formatBatchStatus(latestBatch.status) : 'No batch yet'}
                />
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-3 font-semibold tracking-tight text-slate-950 ${
          valueClassName || 'text-[24px]'
        }`}
      >
        {value}
      </div>
      <div className="mt-2 text-[13px] leading-6 text-slate-600">{helper}</div>
    </div>
  );
}

function Banner({
  tone,
  message,
}: {
  tone: 'success' | 'error' | 'info';
  message: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-sky-200 bg-sky-50 text-sky-700';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      {message}
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

function FilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 lg:max-w-sm"
    />
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const tone =
    normalized === 'transferred'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalized === 'failed' || normalized === 'reversed'
        ? 'border-red-200 bg-red-50 text-red-700'
        : normalized === 'processing'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}
    >
      {formatBatchStatus(status)}
    </span>
  );
}

function InlinePill({
  value,
  tone,
}: {
  value: string;
  tone: 'payment' | 'payout';
}) {
  const normalized = value.trim().toLowerCase();
  const toneClass =
    tone === 'payment'
      ? normalized === 'paid'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : normalized === 'partially_refunded'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      : normalized === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : normalized === 'failed' || normalized === 'reversed'
          ? 'border-red-200 bg-red-50 text-red-700'
          : normalized === 'transferred'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${toneClass}`}
    >
      {formatBatchStatus(value)}
    </span>
  );
}

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid gap-1 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className={`text-sm font-medium text-slate-900 ${valueClassName || ''}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500">
      {message}
    </div>
  );
}

function formatBatchStatus(status: string) {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncateMiddle(value: string | null | undefined, max = 22) {
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

async function safeParseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
