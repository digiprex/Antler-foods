import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRestaurants } from '@/lib/graphql/queries';

export interface RestaurantSearchSelection {
  id: string;
  name: string;
}

interface SearchBoxProps {
  selectedRestaurant: RestaurantSearchSelection | null;
  onRestaurantSelect: (restaurant: RestaurantSearchSelection | null) => void;
}

export function SearchBox({
  selectedRestaurant,
  onRestaurantSelect,
}: SearchBoxProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState(selectedRestaurant?.name ?? '');
  const [restaurants, setRestaurants] = useState<RestaurantSearchSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadRestaurants = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const rows = await getRestaurants();
        if (!isActive) {
          return;
        }

        const normalized = rows
          .map((row) => ({
            id: row.id,
            name: row.name.trim(),
          }))
          .filter((row) => Boolean(row.id) && Boolean(row.name));

        setRestaurants(normalized);
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to load restaurants.';
        setLoadError(message);
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
    setSearchValue(selectedRestaurant?.name ?? '');
  }, [selectedRestaurant?.id, selectedRestaurant?.name]);

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
      return restaurants.slice(0, 8);
    }

    return restaurants
      .filter((restaurant) =>
        restaurant.name.toLowerCase().includes(normalizedSearch),
      )
      .slice(0, 8);
  }, [restaurants, searchValue]);

  const onInputChange = (nextValue: string) => {
    setSearchValue(nextValue);
    setIsOpen(true);

    if (!nextValue.trim()) {
      onRestaurantSelect(null);
    }
  };

  const onSelectRestaurant = (restaurant: RestaurantSearchSelection) => {
    setSearchValue(restaurant.name);
    setIsOpen(false);
    onRestaurantSelect(restaurant);
  };

  return (
    <div className="border-b border-[#d8e3e7] p-3">
      <div ref={containerRef} className="relative">
        <div className="flex items-center rounded-xl border border-[#cfd9de] bg-white px-4 py-3">
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onInputChange(event.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search restaurant..."
            className="w-full bg-transparent text-base text-[#5f6c78] outline-none placeholder:text-[#7a8792]"
          />
          {selectedRestaurant ? (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                onRestaurantSelect(null);
                setIsOpen(false);
                router.push('/');
              }}
              className="ml-2 text-[#b1bac2]"
              aria-label="Clear selected restaurant"
            >
              <ClearIcon />
            </button>
          ) : (
            <>
              <div className="ml-4 h-7 w-px bg-[#d0d8dd]" />
              <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                className="ml-2 text-[#b1bac2]"
                aria-label="Toggle restaurant suggestions"
              >
                <ChevronDownIcon />
              </button>
            </>
          )}
        </div>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#d7e2e6] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            {isLoading ? (
              <p className="px-4 py-3 text-sm text-[#647384]">
                Loading restaurants...
              </p>
            ) : null}

            {!isLoading && loadError ? (
              <p className="px-4 py-3 text-sm text-[#c2410c]">
                Unable to load restaurant suggestions.
              </p>
            ) : null}

            {!isLoading && !loadError && filteredRestaurants.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#647384]">
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
                    className="block w-full border-b border-[#edf2f4] px-4 py-2.5 text-left text-sm text-[#1f2937] transition last:border-b-0 hover:bg-[#f5f8fa]"
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
