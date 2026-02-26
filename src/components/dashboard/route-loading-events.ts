export const DASHBOARD_ROUTE_LOADING_START_EVENT =
  'dashboard:route-loading-start';

export function emitDashboardRouteLoadingStart() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(DASHBOARD_ROUTE_LOADING_START_EVENT));
}
