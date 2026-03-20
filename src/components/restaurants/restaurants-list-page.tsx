'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  getRestaurantsForUser,
  type RestaurantListItem,
  updateFranchiseOwner,
  updateRestaurant,
} from '@/lib/graphql/queries';
import {
  useUserData,
  useHasuraClaims,
} from '@nhost/react';
import { getUserRole, getRoleFromHasuraClaims } from '@/lib/auth/get-user-role';
import { nhost } from '@/lib/nhost';

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
  const [assigningOwnerRestaurantId, setAssigningOwnerRestaurantId] = useState<
    string | null
  >(null);
  const [restaurantPendingDelete, setRestaurantPendingDelete] =
    useState<RestaurantListItem | null>(null);
  const [restaurantPendingOwner, setRestaurantPendingOwner] =
    useState<RestaurantListItem | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerDisplayName, setOwnerDisplayName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFormError, setOwnerFormError] = useState<string | null>(null);
  const [isOwnerPasswordVisible, setIsOwnerPasswordVisible] = useState(false);

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

  const onRequestAssignOwner = (restaurant: RestaurantListItem) => {
    if (hasExistingOwner(restaurant)) {
      return;
    }

    setRestaurantPendingOwner(restaurant);
    setOwnerEmail(restaurant.ownerEmail || restaurant.email || '');
    setOwnerDisplayName(
      restaurant.ownerName && restaurant.ownerName !== 'N/A'
        ? restaurant.ownerName
        : restaurant.name || '',
    );
    setOwnerPassword('');
    setOwnerFormError(null);
    setIsOwnerPasswordVisible(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const onCloseAssignOwner = (force = false) => {
    if (assigningOwnerRestaurantId && !force) {
      return;
    }

    setRestaurantPendingOwner(null);
    setOwnerEmail('');
    setOwnerDisplayName('');
    setOwnerPassword('');
    setOwnerFormError(null);
    setIsOwnerPasswordVisible(false);
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

  const onConfirmAssignOwner = async () => {
    if (!restaurantPendingOwner || assigningOwnerRestaurantId) {
      return;
    }

    const normalizedEmail = ownerEmail.trim();
    const normalizedPassword = ownerPassword.trim();
    const normalizedDisplayName = ownerDisplayName.trim();

    if (!normalizedEmail) {
      setOwnerFormError('Owner email is required.');
      return;
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(normalizedEmail)) {
      setOwnerFormError('Enter a valid owner email.');
      return;
    }

    if (!normalizedPassword) {
      setOwnerFormError('Owner password is required.');
      return;
    }

    if (normalizedPassword.length < 8) {
      setOwnerFormError('Password must be at least 8 characters.');
      return;
    }

    try {
      setAssigningOwnerRestaurantId(restaurantPendingOwner.id);
      setOwnerFormError(null);
      setErrorMessage(null);
      setSuccessMessage(null);

      const ownerUserId = await createOwnerUser({
        email: normalizedEmail,
        password: normalizedPassword,
        displayName:
          normalizedDisplayName ||
          restaurantPendingOwner.ownerName ||
          restaurantPendingOwner.name,
      });

      if (restaurantPendingOwner.franchiseId) {
        await updateFranchiseOwner(
          restaurantPendingOwner.franchiseId,
          ownerUserId,
        );
      }

      const resolvedOwnerName =
        normalizedDisplayName ||
        restaurantPendingOwner.ownerName ||
        restaurantPendingOwner.name;

      await updateRestaurant(restaurantPendingOwner.id, {
        poc_user_id: ownerUserId,
        poc_name: resolvedOwnerName,
        poc_email: normalizedEmail,
      });

      setRestaurants((previous) =>
        previous.map((restaurant) =>
          restaurant.id === restaurantPendingOwner.id
            ? {
                ...restaurant,
                ownerName: resolvedOwnerName,
                ownerEmail: normalizedEmail,
                pocUserId: ownerUserId,
              }
            : restaurant,
        ),
      );

      setSuccessMessage(
        `Owner assigned to "${restaurantPendingOwner.name}" successfully.`,
      );
      onCloseAssignOwner(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to assign owner.';
      setOwnerFormError(message);
    } finally {
      setAssigningOwnerRestaurantId(null);
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
                    {isAdmin && <th className="px-6 py-4">Add Owner</th>}
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
                      {isAdmin ? (
                        <td className="px-6 py-4">
                          {hasExistingOwner(restaurant) ? (
                            <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700">
                              Owner Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRequestAssignOwner(restaurant)}
                              disabled={
                                assigningOwnerRestaurantId === restaurant.id ||
                                isLoading
                              }
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {assigningOwnerRestaurantId === restaurant.id
                                ? 'Saving...'
                                : 'Add Owner'}
                            </button>
                          )}
                        </td>
                      ) : null}
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

      {restaurantPendingOwner ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Add Owner
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Create an owner account and link it to{' '}
                    <span className="font-semibold text-gray-900">
                      {restaurantPendingOwner.name}
                    </span>
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCloseAssignOwner()}
                disabled={Boolean(assigningOwnerRestaurantId)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close add owner dialog"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg
                    className="h-4 w-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Owner Assignment
                  </h4>
                  <p className="text-sm text-gray-600">
                    Same owner fields as the restaurant creation flow.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <OwnerField
                  label="Owner email"
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="owner@brand.com"
                  value={ownerEmail}
                  onChange={setOwnerEmail}
                />

                <OwnerField
                  label="Owner name"
                  placeholder="Owner full name"
                  value={ownerDisplayName}
                  onChange={setOwnerDisplayName}
                />

                <OwnerField
                  label="Owner password"
                  required
                  type={isOwnerPasswordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter password"
                  value={ownerPassword}
                  onChange={setOwnerPassword}
                  rightAddon={
                    <button
                      type="button"
                      onClick={() =>
                        setIsOwnerPasswordVisible((previous) => !previous)
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8d9aa6] transition hover:bg-[#f1efff] hover:text-[#4a5d6f]"
                      aria-label={
                        isOwnerPasswordVisible
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {isOwnerPasswordVisible ? (
                        <EyeOpenIcon />
                      ) : (
                        <EyeClosedIcon />
                      )}
                    </button>
                  }
                />
              </div>
            </div>

            {ownerFormError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {ownerFormError}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onCloseAssignOwner()}
                disabled={Boolean(assigningOwnerRestaurantId)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmAssignOwner()}
                disabled={Boolean(assigningOwnerRestaurantId)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-purple-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assigningOwnerRestaurantId ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <OwnerIcon />
                    Save Owner
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

function OwnerField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  autoComplete,
  rightAddon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  rightAddon?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-base font-medium text-[#111827]">
        {required ? <span className="mr-1 text-[#ef5350]">*</span> : null}
        {label}
      </label>
      <div className="flex min-h-12 items-center rounded-xl border border-[#d4e0e6] bg-white">
        <input
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full bg-transparent px-3 text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none"
        />
        {rightAddon ? <div className="mr-3">{rightAddon}</div> : null}
      </div>
    </div>
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

function hasExistingOwner(restaurant: RestaurantListItem) {
  const ownerName = restaurant.ownerName.trim();
  const ownerEmail = restaurant.ownerEmail.trim();
  const hasNamedOwner =
    ownerName.length > 0 && ownerName.toLowerCase() !== 'n/a';
  const hasOwnerEmail =
    ownerEmail.length > 0 && ownerEmail.toLowerCase() !== 'n/a';

  return Boolean(restaurant.pocUserId || (hasNamedOwner && hasOwnerEmail));
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

function OwnerIcon() {
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
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0Z" />
      <path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3 21 21" />
      <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
      <path d="M9.4 5.3A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a14 14 0 0 1-3.1 3.9" />
      <path d="M6.2 6.2A14 14 0 0 0 2.5 12s3.5 7 9.5 7a10 10 0 0 0 4.3-.9" />
    </svg>
  );
}

async function createOwnerUser({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const accessToken = await nhost.auth.getAccessToken();
  if (!accessToken) {
    throw new Error('Your session has expired. Please login again and retry.');
  }

  const response = await fetch('/api/admin/create-owner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      email: email.trim(),
      password: password.trim(),
      displayName: displayName?.trim() || '',
    }),
  });

  const payload = (await safeParseJson(response)) as
    | {
        userId?: unknown;
        error?: unknown;
        message?: unknown;
      }
    | null;

  if (!response.ok) {
    const message =
      (payload &&
        (typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string'
            ? payload.message
            : null)) ||
      'Failed to create owner user.';
    throw new Error(message);
  }

  const userId =
    payload && typeof payload.userId === 'string' ? payload.userId : '';
  if (!userId.trim()) {
    throw new Error('Owner creation succeeded but no user id was returned.');
  }

  return userId;
}

async function safeParseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
