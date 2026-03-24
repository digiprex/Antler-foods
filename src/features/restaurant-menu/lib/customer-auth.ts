import {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
} from '@/lib/auth/routes';

const CUSTOMER_AUTH_ROUTES = new Set([
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
]);

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

export {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
};
