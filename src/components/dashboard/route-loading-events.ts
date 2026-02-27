export const DASHBOARD_ROUTE_LOADING_START_EVENT =
  'dashboard:route-loading-start';
export const DASHBOARD_RESTAURANTS_REFRESH_EVENT =
  'dashboard:restaurants-refresh';

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
