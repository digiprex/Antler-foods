'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getRestaurants,
  getRestaurantsForUser,
  type RestaurantListItem,
  updateRestaurant,
} from '@/lib/graphql/queries';
import {
  useUserData,
  useHasuraClaims,
} from '@nhost/react';
import { getUserRole, getRoleFromHasuraClaims } from '@/lib/auth/get-user-role';

const PAGE_SIZE = 10;
const PAGE_WINDOW_SIZE = 5;

export function RestaurantsListPage() {
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingRestaurantId, setDeletingRestaurantId] = useState<
    string | null
  >(null);
  const [restaurantPendingDelete, setRestaurantPendingDelete] =
    useState<RestaurantListItem | null>(null);

  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const roleFromUser = user ? getUserRole(user) : null;
  const role = roleFromClaims && roleFromClaims !== 'user' ? roleFromClaims : roleFromUser;
  const isAdmin = role === 'admin';
  const isOwner = role === 'owner';

  useEffect(() => {
    let isActive = true;

    const loadRestaurants = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const rows = await getRestaurantsForUser(user?.id, isOwner);

        if (!isActive) {
          return;
        }

        setRestaurants(rows);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load restaurants.';
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadRestaurants();

    return () => {
      isActive = false;
    };
  }, [isOwner, user?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredRestaurants = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return restaurants;
    }

    return restaurants.filter((restaurant) => {
      const preferredDomain = getPreferredDomain(restaurant);
      const searchText = [
        restaurant.name,
        restaurant.ownerName,
        restaurant.ownerEmail,
        restaurant.serviceModel,
        restaurant.email,
        restaurant.phoneNumber,
        restaurant.customDomain,
        restaurant.stagingDomain,
        preferredDomain,
        restaurant.cuisineTypes.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedSearchTerm);
    });
  }, [restaurants, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRestaurants.length / PAGE_SIZE),
  );

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const paginatedRestaurants = useMemo(() => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    return filteredRestaurants.slice(offset, offset + PAGE_SIZE);
  }, [currentPage, filteredRestaurants]);

  const visiblePages = useMemo(
    () => getPaginationWindow(currentPage, totalPages, PAGE_WINDOW_SIZE),
    [currentPage, totalPages],
  );

  const pageStart =
    filteredRestaurants.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredRestaurants.length);

  const onRequestDeleteRestaurant = (restaurant: RestaurantListItem) => {
    setRestaurantPendingDelete(restaurant);
  };

  const onConfirmDeleteRestaurant = async () => {
    if (!restaurantPendingDelete) {
      return;
    }

    if (deletingRestaurantId) {
      return;
    }

    try {
      setDeletingRestaurantId(restaurantPendingDelete.id);
      setErrorMessage(null);
      setSuccessMessage(null);

      await updateRestaurant(restaurantPendingDelete.id, {
        is_deleted: true,
      });

      setRestaurants((previous) =>
        previous.filter((item) => item.id !== restaurantPendingDelete.id),
      );

      setSuccessMessage(
        `"${restaurantPendingDelete.name}" deleted successfully.`,
      );
      setRestaurantPendingDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete restaurant.';
      setErrorMessage(message);
    } finally {
      setDeletingRestaurantId(null);
    }
  };

  return (
    <section className="space-y-6">
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
          <p className="text-sm text-gray-600">
            Manage all restaurant locations ({restaurants.length} total)
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-bold text-gray-900">All Restaurants</h2>
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, domain, owner..."
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

        {successMessage ? (
          <div className="mx-6 mt-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-900">{successMessage}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center px-6 py-12">
            <div className="flex items-center gap-3 text-gray-600">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">Loading restaurants...</span>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mx-6 my-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-red-900">{errorMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage ? (
          filteredRestaurants.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    <th className="px-6 py-4">Restaurant</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4">Created</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="align-top transition hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {restaurant.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {restaurant.phoneNumber || 'N/A'}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {restaurant.email || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="space-y-1">
                          <p className="font-medium">{restaurant.ownerName || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{restaurant.ownerEmail || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <DomainCell restaurant={restaurant} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(restaurant.createdAt)}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => onRequestDeleteRestaurant(restaurant)}
                            disabled={
                              deletingRestaurantId === restaurant.id || isLoading
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${restaurant.name}`}
                            title="Delete restaurant"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-900">
                {restaurants.length ? 'No restaurants match your search' : 'No restaurants found'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {restaurants.length ? 'Try adjusting your search terms' : 'Get started by adding your first restaurant'}
              </p>
            </div>
          )
        ) : null}

        {!isLoading && !errorMessage && filteredRestaurants.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <p className="text-sm font-medium text-gray-600">
              Showing <span className="font-semibold text-gray-900">{pageStart}-{pageEnd}</span> of <span className="font-semibold text-gray-900">{filteredRestaurants.length}</span> restaurants
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((previous) => Math.max(1, previous - 1))
                }
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 min-w-[36px] rounded-lg px-3 text-sm font-semibold transition ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((previous) =>
                    Math.min(totalPages, previous + 1),
                  )
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {restaurantPendingDelete ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Restaurant
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">"{restaurantPendingDelete.name}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRestaurantPendingDelete(null)}
                disabled={Boolean(deletingRestaurantId)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDeleteRestaurant()}
                disabled={Boolean(deletingRestaurantId)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingRestaurantId ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Restaurant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DomainCell({ restaurant }: { restaurant: RestaurantListItem }) {
  const preferredDomain = getPreferredDomain(restaurant);
  if (!preferredDomain) {
    const selectThemeUrl = `/admin/select-theme?restaurant_id=${encodeURIComponent(restaurant.id)}&restaurant_name=${encodeURIComponent(restaurant.name)}`;
    return (
      <Link
        href={selectThemeUrl}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Create Website
      </Link>
    );
  }

  const href = toExternalUrl(preferredDomain);
  const isProductionDomain = Boolean(restaurant.customDomain.trim());

  return (
    <div className="space-y-1">
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-1.5 font-medium text-purple-600 transition hover:text-purple-700 hover:underline"
      >
        {preferredDomain}
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isProductionDomain
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-800'
      }`}>
        {isProductionDomain ? 'Production' : 'Staging'}
      </span>
    </div>
  );
}

function getPreferredDomain(restaurant: RestaurantListItem) {
  if (restaurant.customDomain.trim()) {
    return restaurant.customDomain.trim();
  }

  if (restaurant.stagingDomain.trim()) {
    return restaurant.stagingDomain.trim();
  }

  return '';
}

function toExternalUrl(domain: string) {
  if (/^https?:\/\//i.test(domain)) {
    return domain;
  }

  return `https://${domain}`;
}

function getPaginationWindow(
  currentPage: number,
  totalPages: number,
  windowSize: number,
) {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(windowSize / 2);
  const start = Math.max(1, currentPage - halfWindow);
  const end = Math.min(totalPages, start + windowSize - 1);
  const normalizedStart = Math.max(1, end - windowSize + 1);

  return Array.from(
    { length: end - normalizedStart + 1 },
    (_, index) => normalizedStart + index,
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6.5 6 7.4 20a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 6" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
    </svg>
  );
}
