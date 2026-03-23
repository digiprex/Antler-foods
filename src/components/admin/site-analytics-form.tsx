'use client';

import { useEffect, useMemo, useState } from 'react';

interface SiteAnalyticsFormProps {
  restaurantId: string;
  restaurantName: string;
}

interface AnalyticsSummary {
  pageviews: number;
  visits: number;
  visitors: number;
  bounces: number;
  totaltime: number;
}

interface AnalyticsRow {
  x: string;
  y: number;
}

interface AnalyticsDetails {
  periodDays: number;
  summary: AnalyticsSummary | null;
  topPages: AnalyticsRow[];
  topReferrers: AnalyticsRow[];
  topEntryPages?: AnalyticsRow[];
  topExitPages?: AnalyticsRow[];
  topCountries?: AnalyticsRow[];
  topRegions?: AnalyticsRow[];
  topCities?: AnalyticsRow[];
  topBrowsers?: AnalyticsRow[];
  topOperatingSystems?: AnalyticsRow[];
  topDevices?: AnalyticsRow[];
  topLanguages?: AnalyticsRow[];
  topEvents?: AnalyticsRow[];
  topHostnames?: AnalyticsRow[];
  topChannels?: AnalyticsRow[];
}

interface BusinessMetrics {
  addToCartEvents: number;
  signupEvents: number;
  totalEvents: number;
}

interface AnalyticsPayload {
  success: boolean;
  configured?: boolean;
  reason?: string;
  domain?: string;
  website_id?: string;
  analytics?: AnalyticsDetails | null;
  error?: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  if (minutes <= 0) return `${remainder}s`;
  return `${minutes}m ${remainder}s`;
}

export default function SiteAnalyticsForm({
  restaurantId,
  restaurantName,
}: SiteAnalyticsFormProps) {
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [creatingSite, setCreatingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/site-analytics?restaurant_id=${encodeURIComponent(restaurantId)}&period_days=${periodDays}`,
        );
        const payload = (await response.json()) as AnalyticsPayload;

        if (!response.ok || payload.success === false) {
          throw new Error(payload.error || 'Failed to fetch analytics');
        }

        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [restaurantId, periodDays]);

  const handleCreateAndConnect = async () => {
    try {
      setCreatingSite(true);
      setError(null);

      const response = await fetch('/api/site-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          period_days: periodDays,
        }),
      });
      const payload = (await response.json()) as AnalyticsPayload;

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Failed to create analytics site');
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create analytics site');
    } finally {
      setCreatingSite(false);
    }
  };

  const analytics = data?.analytics || null;
  const summary = analytics?.summary || null;
  const isConfigured = data?.configured ?? false;

  const bounceRate = useMemo(() => {
    if (!summary || !summary.visits) return 0;
    return (summary.bounces / summary.visits) * 100;
  }, [summary]);

  const businessMetrics = useMemo(() => {
    const events = analytics?.topEvents || [];
    const addToCartEvents = events.find(event => event.x === 'add_to_cart')?.y || 0;
    const signupEvents = events.find(event => event.x === 'signup')?.y || 0;
    const totalEvents = events.reduce((sum, event) => sum + event.y, 0);
    
    return {
      addToCartEvents,
      signupEvents,
      totalEvents,
    };
  }, [analytics?.topEvents]);

  const detailSections = useMemo(
    () => {
      const sections = [
        { title: 'All Events Breakdown', rows: analytics?.topEvents || [], priority: true },
        { title: 'Top Pages', rows: analytics?.topPages || [] },
        { title: 'Top Referrers', rows: analytics?.topReferrers || [] },
        { title: 'Top Entry Pages', rows: analytics?.topEntryPages || [] },
        { title: 'Top Exit Pages', rows: analytics?.topExitPages || [] },
        { title: 'Top Countries', rows: analytics?.topCountries || [] },
        { title: 'Top Regions', rows: analytics?.topRegions || [] },
        { title: 'Top Cities', rows: analytics?.topCities || [] },
        { title: 'Top Browsers', rows: analytics?.topBrowsers || [] },
        { title: 'Top Operating Systems', rows: analytics?.topOperatingSystems || [] },
        { title: 'Top Devices', rows: analytics?.topDevices || [] },
        { title: 'Top Languages', rows: analytics?.topLanguages || [] },
        { title: 'Top Hostnames', rows: analytics?.topHostnames || [] },
        { title: 'Top Channels', rows: analytics?.topChannels || [] },
      ].filter((section) => section.rows.length > 0);

      // Sort to put priority sections first
      return sections.sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return 0;
      });
    },
    [analytics],
  );

  const chartReferrers = analytics?.topReferrers || [];
  const chartPages = analytics?.topPages || [];
  const chartChannels = analytics?.topChannels || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading storefornt analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Storefornt Analytics</h2>
            <p className="text-sm text-gray-600">Tracking for {restaurantName}</p>
            {data?.domain && (
              <p className="mt-1 text-xs text-gray-500">
                Domain: <span className="font-medium text-gray-700">{data.domain}</span>
              </p>
            )}
          </div>
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {!isConfigured || !summary ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-800">
            Analytics is not configured for this site yet.
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Reason: {data?.reason || 'unknown'}
          </p>
          {data?.reason === 'umami-site-missing' && (
            <button
              type="button"
              onClick={handleCreateAndConnect}
              disabled={creatingSite}
              className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creatingSite ? 'Creating...' : 'Create & Connect Analytics'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Pageviews" value={formatNumber(summary.pageviews)} />
            <MetricCard label="Visits" value={formatNumber(summary.visits)} />
            <MetricCard label="Visitors" value={formatNumber(summary.visitors)} />
            <MetricCard label="Bounce Rate" value={`${bounceRate.toFixed(1)}%`} />
            <MetricCard label="Avg. Time" value={formatDuration(summary.totaltime)} />
          </div>

          {/* Business Events Section */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Business Events</h3>
              <p className="text-sm text-gray-600">Key user interactions and conversions</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <BusinessMetricCard
                label="Add to Cart"
                value={formatNumber(businessMetrics.addToCartEvents)}
                icon="🛒"
                description="Items added to cart"
                color="bg-green-500"
              />
              <BusinessMetricCard
                label="Signups"
                value={formatNumber(businessMetrics.signupEvents)}
                icon="👤"
                description="New user registrations"
                color="bg-purple-500"
              />
              <BusinessMetricCard
                label="Total Events"
                value={formatNumber(businessMetrics.totalEvents)}
                icon="📊"
                description="All tracked events"
                color="bg-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <HorizontalBarChartCard title="Top Pages Graph" rows={chartPages} />
            <HorizontalBarChartCard title="Top Referrers Graph" rows={chartReferrers} />
            <DonutChartCard
              title="Channel Mix Graph"
              rows={chartChannels.length > 0 ? chartChannels : chartReferrers}
              emptyLabel="No channel/referrer split available yet."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {detailSections.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                <p className="text-sm text-gray-500">No detailed analytics data available yet.</p>
              </div>
            ) : (
              detailSections.map((section) => (
                <MetricListCard key={section.title} title={section.title} rows={section.rows} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function MetricListCard({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  const isEventsBreakdown = title === 'All Events Breakdown';
  
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${
      isEventsBreakdown
        ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'
        : 'border-gray-200 bg-white'
    }`}>
      <h3 className={`mb-3 text-sm font-semibold ${
        isEventsBreakdown ? 'text-blue-900' : 'text-gray-900'
      }`}>
        {title}
        {isEventsBreakdown && (
          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            Business Events
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {rows.map((row) => {
          const isBusinessEvent = row.x === 'add_to_cart' || row.x === 'signup';
          const eventIcon = row.x === 'add_to_cart' ? '🛒' : row.x === 'signup' ? '👤' : '📊';
          const eventLabel = row.x === 'add_to_cart' ? 'Add to Cart' : row.x === 'signup' ? 'Signups' : row.x;
          
          return (
            <div
              key={`${title}-${row.x}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                isBusinessEvent && isEventsBreakdown
                  ? 'bg-white/80 border border-blue-200 shadow-sm'
                  : 'bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 truncate pr-3 text-sm text-gray-700">
                {isEventsBreakdown && <span>{eventIcon}</span>}
                <span className={isBusinessEvent && isEventsBreakdown ? 'font-medium' : ''}>
                  {isEventsBreakdown ? eventLabel : row.x}
                </span>
              </span>
              <span className={`text-sm font-semibold ${
                isBusinessEvent && isEventsBreakdown ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {formatNumber(row.y)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorizontalBarChartCard({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  const sliced = rows.slice(0, 7);
  const maxValue = sliced.reduce((max, row) => Math.max(max, row.y), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {sliced.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {sliced.map((row) => {
            const widthPercent = maxValue > 0 ? (row.y / maxValue) * 100 : 0;
            return (
              <div key={`${title}-${row.x}`} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs text-gray-700">{row.x}</p>
                  <p className="text-xs font-semibold text-gray-900">{formatNumber(row.y)}</p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BusinessMetricCard({
  label,
  value,
  icon,
  description,
  color
}: {
  label: string;
  value: string;
  icon: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/60 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} text-white`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function DonutChartCard({
  title,
  rows,
  emptyLabel = 'No data yet.',
}: {
  title: string;
  rows: AnalyticsRow[];
  emptyLabel?: string;
}) {
  const sliced = rows.slice(0, 6);
  const total = sliced.reduce((sum, row) => sum + row.y, 0);
  const colors = ['#7c3aed', '#db2777', '#2563eb', '#0891b2', '#059669', '#d97706'];

  const gradient = useMemo(() => {
    if (!total) return '';
    let offset = 0;
    const segments = sliced.map((row, index) => {
      const portion = (row.y / total) * 100;
      const start = offset;
      const end = offset + portion;
      offset = end;
      const color = colors[index % colors.length];
      return `${color} ${start}% ${end}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [sliced, total]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {sliced.length === 0 || total <= 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="flex items-center gap-5">
          <div
            className="h-32 w-32 rounded-full border border-gray-100"
            style={{ background: gradient }}
          >
            <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-white text-center">
              <span className="text-xs font-semibold text-gray-700">{formatNumber(total)}</span>
            </div>
          </div>
          <div className="space-y-2">
            {sliced.map((row, index) => {
              const percent = (row.y / total) * 100;
              const color = colors[index % colors.length];
              return (
                <div key={`${title}-${row.x}`} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="max-w-[150px] truncate text-xs text-gray-700">{row.x}</span>
                  <span className="text-xs font-semibold text-gray-900">{percent.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
