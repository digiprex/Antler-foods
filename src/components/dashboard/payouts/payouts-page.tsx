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
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);
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

  const downloadBatchStatement = useCallback(
    async (batch: PayoutBatchSummary) => {
      setDownloadingBatchId(batch.payoutBatchId);

      try {
        const response = await fetchWithAuth(
          `/api/payout-batches/${encodeURIComponent(batch.payoutBatchId)}/statement`,
          {
            method: 'GET',
          },
        );

        if (!response.ok) {
          const payload = await safeParseJsonResponse(response);
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : 'Failed to download payout statement.',
          );
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download =
          extractFilenameFromContentDisposition(
            response.headers.get('content-disposition'),
          ) || `${batch.payoutBatchId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch (downloadError) {
        setNotice({
          tone: 'error',
          message:
            downloadError instanceof Error
              ? downloadError.message
              : 'Failed to download payout statement.',
        });
      } finally {
        setDownloadingBatchId(null);
      }
    },
    [fetchWithAuth],
  );

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
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionEyebrow>Payouts</SectionEyebrow>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">
            Select a restaurant to get started
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
            Pick a restaurant from the dashboard search so the Payouts page
            can load payout batches, pending orders, and transfer history.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
              <PayoutsPageIcon />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Payouts</h1>
              <p className="text-sm text-gray-500">Weekly batch transfers</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadPayouts()}
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors',
                'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
              )}
            >
              <RefreshIcon />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void runPayoutNow()}
              disabled={isRunning}
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors',
                'hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
                isRunning ? 'cursor-not-allowed opacity-50' : '',
              )}
            >
              {isRunning ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <PlusIcon />
                  Run payout now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <NoticeBanner notice={notice} />
      {error ? <NoticeBanner notice={{ tone: 'error', message: error }} /> : null}

      {isLoading && !data ? (
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <PayoutsPageIcon />
          </div>
          <div className="space-y-0.5">
            <SectionEyebrow>Payouts</SectionEyebrow>
            <p className="text-sm font-medium text-gray-900">
              Loading payout ledger...
            </p>
          </div>
          <svg
            className="h-5 w-5 animate-spin text-purple-500"
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
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Pending payout"
              value={formatCurrency(data?.pendingPayoutAmount || 0, currency)}
              tone={data?.pendingPayoutAmount ? 'warning' : 'neutral'}
              icon={<MetricPendingIcon />}
              helper={`${data?.pendingOrderCount || 0} orders waiting`}
            />
            <MetricCard
              label="Latest batch"
              value={
                latestBatch
                  ? formatCurrency(
                      latestBatch.totalPayoutAmount,
                      latestBatch.currency.toUpperCase(),
                    )
                  : '\u2014'
              }
              tone={latestBatch ? 'neutral' : 'neutral'}
              icon={<MetricBatchIcon />}
              helper={
                latestBatch
                  ? `Created ${formatDateTime(latestBatch.createdAt)}`
                  : 'No batch created yet'
              }
            />
            <MetricCard
              label="Last transfer"
              value={
                latestSuccessfulBatch
                  ? formatCurrency(
                      latestSuccessfulBatch.totalPayoutAmount,
                      latestSuccessfulBatch.currency.toUpperCase(),
                    )
                  : '\u2014'
              }
              tone={latestSuccessfulBatch ? 'success' : 'neutral'}
              icon={<MetricTransferIcon />}
              helper={
                latestSuccessfulBatch
                  ? truncateMiddle(latestSuccessfulBatch.stripeTransferId)
                  : 'No successful transfer yet'
              }
            />
            <MetricCard
              label="Connected account"
              value={truncateMiddle(data?.stripeConnectedAccountId, 16)}
              tone="neutral"
              icon={<MetricAccountIcon />}
              helper={
                latestFailedBatch
                  ? `Latest failure: ${formatBatchStatus(latestFailedBatch.status)}`
                  : 'Stripe destination account'
              }
              valueClassName="font-mono text-base"
            />
          </div>

          {/* Pending Orders Table */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SectionEyebrow>Eligible orders</SectionEyebrow>
                <h2 className="mt-1.5 text-lg font-semibold text-gray-900">
                  Pending payout orders
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Orders waiting to be included in a payout batch.
                </p>
              </div>
              <span className="whitespace-nowrap text-sm font-medium text-gray-400">
                {filteredPendingOrders.length} of {data?.pendingOrders.length || 0} orders
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
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
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Placed</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Payout state</th>
                        <th className="px-4 py-3">Eligible amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredPendingOrders.map((order) => (
                        <tr key={order.orderId} className="align-top">
                          <td className="px-4 py-3.5 text-sm text-gray-700">
                            <div className="font-semibold text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-400">
                              {truncateMiddle(order.orderId, 18)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {formatDateTime(order.placedAt)}
                          </td>
                          <td className="px-4 py-3.5">
                            <InlinePill value={order.paymentStatus} tone="payment" />
                          </td>
                          <td className="px-4 py-3.5">
                            <InlinePill value={order.payoutStatus} tone="payout" />
                          </td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
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

          {/* Batch History Table */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SectionEyebrow>Batch history</SectionEyebrow>
                <h2 className="mt-1.5 text-lg font-semibold text-gray-900">
                  Weekly payout batches
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Review payout totals, transfer ids, and final batch status.
                </p>
              </div>
              <span className="whitespace-nowrap text-sm font-medium text-gray-400">
                {filteredBatches.length} of {data?.recentBatches.length || 0} batches
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
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
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] divide-y divide-gray-200 xl:min-w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3">Batch</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Stripe transfer</th>
                        <th className="px-4 py-3">Processed</th>
                        <th className="px-4 py-3">Statement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredBatches.map((batch) => (
                        <tr key={batch.payoutBatchId} className="align-top">
                          <td className="px-4 py-3.5 text-sm text-gray-700">
                            <div className="font-semibold text-gray-900">
                              {truncateMiddle(batch.payoutBatchId, 18)}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-400">
                              Created {formatDateTime(batch.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            <div>{formatDate(batch.periodStart)}</div>
                            <div className="text-xs text-gray-400">
                              to {formatDate(batch.periodEnd)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                            {batch.orderCount}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                            {formatCurrency(
                              batch.totalPayoutAmount,
                              batch.currency.toUpperCase(),
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusPill status={batch.status} />
                            {batch.failureReason ? (
                              <div className="mt-1.5 max-w-[220px] text-xs leading-5 text-red-600">
                                {batch.failureReason}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {batch.stripeTransferId ? (
                              <span className="font-medium text-gray-900">
                                {truncateMiddle(batch.stripeTransferId)}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not created</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {formatDateTime(batch.processedAt)}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => void downloadBatchStatement(batch)}
                              disabled={
                                downloadingBatchId === batch.payoutBatchId ||
                                batch.orderCount <= 0
                              }
                              className={cx(
                                'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors',
                                'hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
                              )}
                            >
                              <DownloadIcon />
                              {downloadingBatchId === batch.payoutBatchId
                                ? 'Preparing...'
                                : 'PDF'}
                            </button>
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

          {/* Configuration Snapshot */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SectionEyebrow>Settlement snapshot</SectionEyebrow>
            <h2 className="mt-1.5 text-lg font-semibold text-gray-900">
              Current configuration
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SnapshotCard
                label="Connected account"
                value={truncateMiddle(data?.stripeConnectedAccountId, 32)}
                valueClassName="font-mono text-xs leading-5 break-all"
              />
              <SnapshotCard label="Currency" value={currency} />
              <SnapshotCard
                label="Pending orders"
                value={String(data?.pendingOrderCount || 0)}
              />
              <SnapshotCard
                label="Pending payout"
                value={formatCurrency(data?.pendingPayoutAmount || 0, currency)}
              />
              <SnapshotCard
                label="Latest batch status"
                value={latestBatch ? formatBatchStatus(latestBatch.status) : 'No batch yet'}
              />
            </div>
          </section>
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

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

function MetricCard({
  label,
  value,
  tone,
  helper,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
  helper: string;
  icon: React.ReactNode;
  valueClassName?: string;
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
    <div className={cx('rounded-xl border p-4 shadow-sm', toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p
            className={cx(
              'mt-2 font-bold tabular-nums text-gray-900',
              valueClassName || 'text-2xl',
            )}
          >
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

function NoticeBanner({ notice }: { notice: SaveNotice | null }) {
  if (!notice) {
    return null;
  }

  const toneClass =
    notice.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : notice.tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-sky-200 bg-sky-50 text-sky-700';

  return (
    <p className={cx('rounded-lg border px-4 py-3 text-sm font-medium', toneClass)}>
      {notice.message}
    </p>
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
    <div className="relative flex-1 lg:max-w-sm">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-purple-500/10"
      />
    </div>
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
      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-purple-500/10 sm:w-auto sm:min-w-[180px]"
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
  const config =
    normalized === 'transferred'
      ? { label: formatBatchStatus(status), className: 'bg-green-100 text-green-800' }
      : normalized === 'failed' || normalized === 'reversed'
        ? { label: formatBatchStatus(status), className: 'bg-red-100 text-red-800' }
        : normalized === 'processing'
          ? { label: formatBatchStatus(status), className: 'bg-amber-100 text-amber-800' }
          : { label: formatBatchStatus(status), className: 'bg-gray-100 text-gray-700' };

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
        ? 'bg-green-100 text-green-800'
        : normalized === 'partially_refunded'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-700'
      : normalized === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : normalized === 'failed' || normalized === 'reversed'
          ? 'bg-red-100 text-red-800'
          : normalized === 'transferred'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-700';

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
        toneClass,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatBatchStatus(value)}
    </span>
  );
}

function SnapshotCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p
        className={cx(
          'mt-2 text-sm font-semibold text-gray-900',
          valueClassName || '',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
      <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────── */

function PayoutsPageIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="m17 8-5-5-5 5" />
      <path d="M20 21H4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function MetricPendingIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function MetricBatchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function MetricTransferIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="m17 8-5-5-5 5" />
      <path d="M20 21H4" />
    </svg>
  );
}

function MetricAccountIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

/* ── Utilities ─────────────────────────────────────────────────────── */

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
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
    return '\u2014';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '\u2014';
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

function extractFilenameFromContentDisposition(header: string | null) {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = header.match(/filename="([^"]+)"/i);
  return basicMatch?.[1] || null;
}
