import {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_RESET_PASSWORD_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
} from '@/lib/auth/routes';

const CUSTOMER_AUTH_ROUTES = new Set([
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_RESET_PASSWORD_ROUTE,
]);
const CUSTOMER_RESTAURANT_ID_STORAGE_KEY = 'menu_customer_restaurant_id';
const CUSTOMER_AUTH_REDIRECT_ORIGIN = 'http://menu.local';

export type CustomerAuthView = 'login' | 'signup' | 'forgot-password';

export function resolveCustomerNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return CUSTOMER_DEFAULT_AUTH_REDIRECT;
  }

  const pathname = value.split('?')[0]?.split('#')[0] || value;

  if (CUSTOMER_AUTH_ROUTES.has(pathname)) {
    return CUSTOMER_DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

export function resolveCustomerAuthView(value: string | null | undefined): CustomerAuthView | null {
  if (value === 'login' || value === 'signup' || value === 'forgot-password') {
    return value;
  }

  return null;
}

export function buildCustomerAuthRedirectPath(
  view: CustomerAuthView,
  nextPath: string | null | undefined,
  restaurantId?: string | null,
) {
  const resolvedNextPath = resolveCustomerNextPath(nextPath);
  const url = new URL(resolvedNextPath, CUSTOMER_AUTH_REDIRECT_ORIGIN);

  url.searchParams.set('auth', view);

  if (restaurantId && restaurantId.trim()) {
    url.searchParams.set('restaurantId', restaurantId.trim());
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildCustomerAuthHref(
  route: string,
  nextPath: string | null | undefined,
  restaurantId?: string | null,
) {
  const resolvedNextPath = resolveCustomerNextPath(nextPath);
  const params = new URLSearchParams();

  if (resolvedNextPath !== CUSTOMER_DEFAULT_AUTH_REDIRECT) {
    params.set('next', resolvedNextPath);
  }

  if (restaurantId && restaurantId.trim()) {
    params.set('restaurantId', restaurantId.trim());
  }

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

type SearchParamsLike = {
  get: (key: string) => string | null;
};

function persistCustomerRestaurantId(restaurantId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CUSTOMER_RESTAURANT_ID_STORAGE_KEY, restaurantId);
  } catch {
    // Ignore storage failures in private browsing / restrictive environments.
  }
}

function readPersistedCustomerRestaurantId() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(CUSTOMER_RESTAURANT_ID_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function resolveCustomerRestaurantId(
  searchParams?: SearchParamsLike | null,
  restaurantId?: string | null,
) {
  const directId = restaurantId?.trim();
  if (directId) {
    persistCustomerRestaurantId(directId);
    return directId;
  }

  const fromCamel = searchParams?.get('restaurantId')?.trim();
  if (fromCamel) {
    persistCustomerRestaurantId(fromCamel);
    return fromCamel;
  }

  const fromSnake = searchParams?.get('restaurant_id')?.trim();
  if (fromSnake) {
    persistCustomerRestaurantId(fromSnake);
    return fromSnake;
  }

  return readPersistedCustomerRestaurantId();
}

export {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_RESET_PASSWORD_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
};
