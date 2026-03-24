'use client';

export function RestaurantsSkeleton() {
  return (
    <section className="space-y-6">
      {/* Header Section Skeleton */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Restaurants
          </h1>
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200 mt-1"></div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header with Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-bold text-gray-900">All Restaurants</h2>
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Add Owner</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {/* Skeleton Rows */}
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="align-top">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="h-5 w-32 animate-pulse rounded bg-gray-200"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div className="h-4 w-28 animate-pulse rounded bg-gray-200"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200"></div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex h-9 w-9 animate-pulse rounded-lg bg-gray-200"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200"></div>
            <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200"></div>
            <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200"></div>
            <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200"></div>
            <div className="h-9 w-16 animate-pulse rounded-lg bg-gray-200"></div>
          </div>
        </div>
      </div>
    </section>
  );
}