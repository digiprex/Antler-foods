import Link from 'next/link';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';

interface MenuCheckoutSuccessPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTotal(value: string | string[] | undefined) {
  const rawValue = readSingleParam(value);
  const parsed = rawValue ? Number(rawValue) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFulfillmentLabel(value: string | string[] | undefined) {
  const mode = readSingleParam(value);
  if (mode === 'delivery') {
    return 'Delivery';
  }
  if (mode === 'pickup') {
    return 'Pickup';
  }
  return null;
}

export default function MenuCheckoutSuccessPage({
  searchParams,
}: MenuCheckoutSuccessPageProps) {
  const orderNumber = readSingleParam(searchParams?.orderNumber)?.trim() || '';
  const restaurantName = readSingleParam(searchParams?.restaurant)?.trim() || '';
  const schedule = readSingleParam(searchParams?.schedule)?.trim() || '';
  const fulfillmentLabel = formatFulfillmentLabel(searchParams?.mode);
  const total = parseTotal(searchParams?.total);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="border-b border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 shadow-sm">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Order confirmed
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">
              Thanks, your order is in.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-[15px]">
              {restaurantName
                ? `We have sent your order to ${restaurantName}. The restaurant will take it from here.`
                : 'We have received your order and the restaurant will take it from here.'}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {orderNumber ? (
                <div className="rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Order number
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    {orderNumber}
                  </p>
                </div>
              ) : null}

              {typeof total === 'number' ? (
                <div className="rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Total paid
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    {formatPrice(total)}
                  </p>
                </div>
              ) : null}

              {fulfillmentLabel ? (
                <div className="rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Fulfillment
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {fulfillmentLabel}
                  </p>
                </div>
              ) : null}

              {schedule ? (
                <div className="rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Scheduled for
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {schedule}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-black px-6 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Back to menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}