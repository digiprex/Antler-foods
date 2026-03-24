'use client';

export function InformationSkeleton() {
  return (
    <section className="grid gap-6">
      {/* Navigation Tabs Skeleton */}
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
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                index === 0
                  ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 text-gray-900 shadow-sm'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="h-5 w-5 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
            </div>
          ))}
        </nav>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200 mb-2"></div>
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200 mb-1"></div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Form Fields Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
            </div>
          ))}
        </div>

        {/* Large Content Section */}
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <div className="h-5 w-5 animate-pulse rounded bg-purple-300"></div>
            </div>
            <div className="flex-1">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200 mb-2"></div>
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4"></div>
          </div>

          {/* Content Grid */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {Array.from({ length: 3 }).map((_, categoryIndex) => (
              <div key={categoryIndex} className="border-b border-gray-100 last:border-b-0">
                <div className="flex w-full items-center gap-3 px-4 py-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                </div>
                <div className="grid gap-2 border-t border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="h-10 w-full animate-pulse rounded-lg border border-gray-200 bg-white"
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Links Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="h-12 w-48 animate-pulse rounded-lg bg-purple-200"></div>
      </div>
    </section>
  );
}

export function InformationAddressSkeleton() {
  return (
    <section className="grid gap-6">
      {/* Navigation Tabs Skeleton */}
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
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                index === 1
                  ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 text-gray-900 shadow-sm'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="h-5 w-5 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
            </div>
          ))}
        </nav>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200 mb-2"></div>
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 mb-1"></div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Address Form Skeleton */}
      <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-8">
        {/* Address Field */}
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
          <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
        </div>

        {/* Grid Fields */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="h-12 w-32 animate-pulse rounded-xl bg-purple-200"></div>
      </div>
    </section>
  );
}

export function InformationOpeningHoursSkeleton() {
  return (
    <section className="grid gap-6">
      {/* Navigation Tabs Skeleton */}
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
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                index === 2
                  ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 text-gray-900 shadow-sm'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="h-5 w-5 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
            </div>
          ))}
        </nav>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200 mb-2"></div>
          <div className="h-4 w-36 animate-pulse rounded bg-gray-200 mb-1"></div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        {/* Left Column - Settings */}
        <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
            <div className="h-16 w-full animate-pulse rounded-xl bg-gray-200"></div>
          </div>
        </section>

        {/* Right Column - Status */}
        <aside className="space-y-3 rounded-3xl border border-gray-200 bg-white p-6">
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Weekly Schedule */}
      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200"></div>
          <div className="h-3 w-48 animate-pulse rounded bg-gray-200"></div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <article key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="h-5 w-20 animate-pulse rounded bg-gray-200"></div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200"></div>
                  <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <div className="h-3 w-8 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-8 w-full animate-pulse rounded bg-gray-200"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 w-10 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-8 w-full animate-pulse rounded bg-gray-200"></div>
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export function InformationGoogleProfileSkeleton() {
  return (
    <section className="grid gap-6">
      {/* Navigation Tabs Skeleton */}
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
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                index === 3
                  ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 text-gray-900 shadow-sm'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="h-5 w-5 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
            </div>
          ))}
        </nav>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200 mb-2"></div>
          <div className="h-4 w-56 animate-pulse rounded bg-gray-200 mb-1"></div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Connected Profile Section */}
      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="h-6 w-36 animate-pulse rounded bg-gray-200 mb-2"></div>
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200"></div>
        </div>

        {/* Profile Card */}
        <article className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-purple-50/20 to-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="h-4 w-64 animate-pulse rounded bg-gray-200"></div>
              </div>
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200"></div>
          </div>

          {/* Rating Section */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="h-6 w-8 animate-pulse rounded bg-gray-200"></div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
              ))}
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
          </div>

          {/* Info Pills Grid */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
              </div>
            ))}
          </div>

          {/* Hours Snapshot */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200 mb-2"></div>
            <div className="space-y-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* Reference Fields */}
      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200"></div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200"></div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}