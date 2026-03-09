export const DASHBOARD_ROUTE_LOADING_START_EVENT =
  'dashboard:route-loading-start';
export const DASHBOARD_RESTAURANTS_REFRESH_EVENT =
  'dashboard:restaurants-refresh';
export const DASHBOARD_RESTAURANT_UPDATED_EVENT =
  'dashboard:restaurant-updated';

export interface RestaurantUpdateData {
  restaurantId: string;
  stagingDomain?: string;
  customDomain?: string;
}

export function emitDashboardRouteLoadingStart() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(DASHBOARD_ROUTE_LOADING_START_EVENT));
}

export function emitDashboardRestaurantsRefresh() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(DASHBOARD_RESTAURANTS_REFRESH_EVENT));
}

export function emitDashboardRestaurantUpdated(data: RestaurantUpdateData) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DASHBOARD_RESTAURANT_UPDATED_EVENT, { detail: data })
  );
}
