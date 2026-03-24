import {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
} from '@/lib/auth/routes';

export function resolveCustomerNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return CUSTOMER_DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

export function buildCustomerAuthHref(route: string, nextPath: string | null | undefined) {
  const resolvedNextPath = resolveCustomerNextPath(nextPath);

  if (resolvedNextPath === CUSTOMER_DEFAULT_AUTH_REDIRECT) {
    return route;
  }

  return `${route}?next=${encodeURIComponent(resolvedNextPath)}`;
}

export {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
};