import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRestaurantsForUser } from '@/lib/graphql/queries';
import { useUserData } from '@nhost/react';
import { getUserRole } from '@/lib/auth/get-user-role';
import { DASHBOARD_RESTAURANTS_REFRESH_EVENT } from './route-loading-events';

export interface RestaurantSearchSelection {
  id: string;
  name: string;
  customDomain?: string;
  stagingDomain?: string;
}

interface SearchBoxProps {
  selectedRestaurant: RestaurantSearchSelection | null;
  onRestaurantSelect: (restaurant: RestaurantSearchSelection | null) => void;
}

export function SearchBox({
  selectedRestaurant,
  onRestaurantSelect,
}: SearchBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState(selectedRestaurant?.name ?? '');
  const [restaurants, setRestaurants] = useState<RestaurantSearchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const user = useUserData();
  const role = user ? getUserRole(user) : null;
  const isOwner = role === 'owner';

  const loadRestaurants = useCallback(async (updateSelected = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const rows = await getRestaurantsForUser(user?.id, isOwner);

      const normalized = rows
        .map((row) => ({
          id: row.id,
          name: row.name.trim(),
          customDomain: row.customDomain.trim(),
          stagingDomain: row.stagingDomain.trim(),
        }))
        .filter((row) => Boolean(row.id) && Boolean(row.name));

      setRestaurants(normalized);

      // Only update selected restaurant if explicitly requested
      if (updateSelected && selectedRestaurant) {
        const freshData = normalized.find((r) => r.id === selectedRestaurant.id);
        if (freshData) {
          onRestaurantSelect(freshData);
        }
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load restaurants.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRestaurant, onRestaurantSelect, user?.id, isOwner]);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    const onRestaurantsRefresh = () => {
      void loadRestaurants(true); // Update selected restaurant on refresh
    };

    window.addEventListener(
      DASHBOARD_RESTAURANTS_REFRESH_EVENT,
      onRestaurantsRefresh,
    );
    return () => {
      window.removeEventListener(
        DASHBOARD_RESTAURANTS_REFRESH_EVENT,
        onRestaurantsRefresh,
      );
    };
  }, [loadRestaurants]);

  useEffect(() => {
    setSearchValue(selectedRestaurant?.name ?? '');
  }, [selectedRestaurant]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return restaurants;
    }

    return restaurants
      .filter((restaurant) =>
        restaurant.name.toLowerCase().includes(normalizedSearch),
      );
  }, [restaurants, searchValue]);

  const onInputChange = (nextValue: string) => {
    setSearchValue(nextValue);
    setIsOpen(true);

    // Clear selection if user is typing something different than the selected restaurant
    if (selectedRestaurant && nextValue.trim() !== selectedRestaurant.name.trim()) {
      onRestaurantSelect(null);
    }
  };

  const onSelectRestaurant = (restaurant: RestaurantSearchSelection) => {
    setSearchValue(restaurant.name);
    setIsOpen(false);
    onRestaurantSelect(restaurant);
  };

  return (
    <div className="border-b border-gray-200 p-4">
      <div ref={containerRef} className="relative">
        <div className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100">
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onInputChange(event.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search restaurant..."
            className="w-full bg-transparent text-base text-gray-700 outline-none placeholder:text-gray-400"
          />
          {selectedRestaurant ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchValue('');
                onRestaurantSelect(null);
                setIsOpen(false);
              }}
              className="ml-2 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Clear selected restaurant"
            >
              <ClearIcon />
            </button>
          ) : (
            <>
              <div className="ml-4 h-7 w-px bg-gray-300" />
              <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                className="ml-2 text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Toggle restaurant suggestions"
              >
                <ChevronDownIcon />
              </button>
            </>
          )}
        </div>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[400px] overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {isLoading ? (
              <p className="px-4 py-3 text-sm text-gray-500">
                Loading restaurants...
              </p>
            ) : null}

            {!isLoading && loadError ? (
              <p className="px-4 py-3 text-sm text-red-600">
                Unable to load restaurant suggestions.
              </p>
            ) : null}

            {!isLoading && !loadError && filteredRestaurants.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">
                No restaurants found.
              </p>
            ) : null}

            {!isLoading && !loadError
              ? filteredRestaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelectRestaurant(restaurant);
                    }}
                    className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors last:border-b-0 hover:bg-purple-50 hover:text-purple-700"
                  >
                    {restaurant.name}
                  </button>
                ))
              : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ClearIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
