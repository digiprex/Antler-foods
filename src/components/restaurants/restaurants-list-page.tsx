"use client";

import { useEffect, useMemo, useState } from "react";
import { getRestaurants, type RestaurantListItem } from "@/lib/graphql/queries";

export function RestaurantsListPage() {
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
          error instanceof Error ? error.message : "Unable to load restaurants.";
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

  const filteredRestaurants = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return restaurants;
    }

    return restaurants.filter((restaurant) => {
      const searchText = [
        restaurant.name,
        restaurant.serviceModel,
        restaurant.email,
        restaurant.phoneNumber,
        restaurant.cuisineTypes.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedSearchTerm);
    });
  }, [restaurants, searchTerm]);

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
              className="h-11 w-full rounded-xl border border-[#d4e0e6] px-4 text-sm text-[#1f2937] placeholder:text-[#8b9baa] focus:border-[#7fcf99] focus:outline-none focus:ring-2 focus:ring-[#d9f0e2]"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="px-6 py-5 text-sm text-[#5f6c78]">Loading restaurants...</p>
        ) : null}

        {errorMessage ? (
          <p className="mx-6 my-5 rounded-xl border border-[#f2c7c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#b33838]">
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
                    <th className="px-6 py-3">Service model</th>
                    <th className="px-6 py-3">Cuisine types</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3f6]">
                  {filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="align-top">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#111827]">{restaurant.name}</p>
                        <p className="text-xs text-[#7a8996]">ID: {restaurant.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        {restaurant.serviceModel || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        {restaurant.cuisineTypes.length
                          ? restaurant.cuisineTypes.join(", ")
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        <p>{restaurant.phoneNumber || "N/A"}</p>
                        <p>{restaurant.email || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#334155]">
                        {formatDate(restaurant.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-5 text-sm text-[#5f6c78]">
              {restaurants.length
                ? "No restaurants match your search."
                : "No restaurants found in the restaurants table."}
            </p>
          )
        ) : null}
      </div>
    </section>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}
