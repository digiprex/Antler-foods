'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getRestaurants,
  type RestaurantListItem,
  updateRestaurant,
} from '@/lib/graphql/queries';

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

  useEffect(() => {
    let isActive = true;

    const loadRestaurants = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const rows = await getRestaurants();

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
  }, []);

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
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">
          Restaurants
        </h1>
        <p className="text-sm font-medium text-[#5f6c78]">
          Total restaurants: {restaurants.length}
        </p>
      </div>

      <div className="rounded-3xl border border-[#d7e2e6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7e2e6] px-6 py-5">
          <h2 className="text-3xl font-semibold text-[#111827]">Restaurants</h2>
          <div className="w-full max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search restaurants..."
              className="h-11 w-full rounded-xl border border-[#d4e0e6] px-4 text-sm text-[#1f2937] placeholder:text-[#8b9baa] focus:border-[#667eea] focus:outline-none focus:ring-2 focus:ring-[#ede9fe]"
            />
          </div>
        </div>

        {successMessage ? (
          <p className="mx-6 mt-5 rounded-xl border border-[#d5cfff] bg-[#f3f1ff] px-4 py-3 text-sm text-[#4d3cae]">
            {successMessage}
          </p>
        ) : null}

        {isLoading ? (
          <p className="px-6 py-5 text-sm text-[#5f6c78]">
            Loading restaurants...
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mx-6 my-5 rounded-xl border border-[#d5cfff] bg-[#f3f1ff] px-4 py-3 text-sm text-[#4d3cae]">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage ? (
          filteredRestaurants.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e2eaee]">
                <thead className="bg-[#f7fafc]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[#6b7a88]">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3">Domain</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3f6]">
                  {paginatedRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="align-top">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#111827]">
                          {restaurant.name}
                        </p>
                        <p className="text-xs text-[#7a8996]">
                          ID: {restaurant.id}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        <p>{restaurant.phoneNumber || 'N/A'}</p>
                        <p>{restaurant.email || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        <p>{restaurant.ownerName || 'N/A'}</p>
                        <p>{restaurant.ownerEmail || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        <DomainCell restaurant={restaurant} />
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        {formatDate(restaurant.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onRequestDeleteRestaurant(restaurant)}
                          disabled={
                            deletingRestaurantId === restaurant.id || isLoading
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#cec4ff] text-[#5b3fd4] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${restaurant.name}`}
                          title="Delete restaurant"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-5 text-sm text-[#5f6c78]">
              {restaurants.length
                ? 'No restaurants match your search.'
                : 'No restaurants found in the restaurants table.'}
            </p>
          )
        ) : null}

        {!isLoading && !errorMessage && filteredRestaurants.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2eaee] bg-[#fbfdff] px-6 py-4">
            <p className="text-sm text-[#5f6c78]">
              Showing {pageStart}-{pageEnd} of {filteredRestaurants.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((previous) => Math.max(1, previous - 1))
                }
                disabled={currentPage === 1}
                className="rounded-lg border border-[#d4e0e6] bg-white px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-[#667eea] text-white'
                      : 'border border-[#d4e0e6] bg-white text-[#334155] hover:bg-[#f7fafc]'
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
                className="rounded-lg border border-[#d4e0e6] bg-white px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {restaurantPendingDelete ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1f1147]/38 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#cec4ff] bg-white p-6 shadow-[0_28px_70px_rgba(48,25,106,0.30)]">
            <h3 className="text-2xl font-semibold text-[#101827]">
              Delete restaurant?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#5f6c78]">
              Do you really want to delete this restaurant?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRestaurantPendingDelete(null)}
                disabled={Boolean(deletingRestaurantId)}
                className="rounded-lg border border-[#d2c8ff] bg-white px-4 py-2 text-sm font-medium text-[#413c68] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDeleteRestaurant()}
                disabled={Boolean(deletingRestaurantId)}
                className="inline-flex items-center rounded-lg bg-[#667eea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingRestaurantId ? 'Deleting...' : 'Delete'}
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
    return <p>N/A</p>;
  }

  const href = toExternalUrl(preferredDomain);
  const isProductionDomain = Boolean(restaurant.customDomain.trim());

  return (
    <div className="space-y-0.5">
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[#5b3fd4] underline decoration-[#c8bcff] underline-offset-2 transition hover:text-[#4728cc]"
      >
        {preferredDomain}
      </a>
      <p className="text-xs text-[#7a8996]">
        {isProductionDomain ? 'Production' : 'Staging'}
      </p>
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
