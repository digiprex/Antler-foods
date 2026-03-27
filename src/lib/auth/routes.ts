import type { AppRole } from "./get-user-role";

export const ADMIN_LOGIN_ROUTE = "/login";
export const ADMIN_SIGNUP_ROUTE = "/signup";
export const ADMIN_FORGOT_PASSWORD_ROUTE = "/forgot-password";
export const ADMIN_RESET_PASSWORD_ROUTE = "/reset-password";

export const CUSTOMER_LOGIN_ROUTE = "/login";
export const CUSTOMER_SIGNUP_ROUTE = "/signup";
export const CUSTOMER_FORGOT_PASSWORD_ROUTE = "/forgot-password";
export const CUSTOMER_RESET_PASSWORD_ROUTE = "/customer-reset-password";
export const CUSTOMER_DEFAULT_AUTH_REDIRECT = "/menu";

export const LOGIN_ROUTE = ADMIN_LOGIN_ROUTE;
export const SIGNUP_ROUTE = ADMIN_SIGNUP_ROUTE;
export const FORGOT_PASSWORD_ROUTE = ADMIN_FORGOT_PASSWORD_ROUTE;
export const RESET_PASSWORD_ROUTE = ADMIN_RESET_PASSWORD_ROUTE;
export const DEFAULT_AUTH_REDIRECT = "/dashboard/admin/home";
export const UNAUTHORIZED_ROUTE = "/unauthorized";

export const PUBLIC_ROUTES = [
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_RESET_PASSWORD_ROUTE,
  ADMIN_LOGIN_ROUTE,
  ADMIN_SIGNUP_ROUTE,
  ADMIN_FORGOT_PASSWORD_ROUTE,
  ADMIN_RESET_PASSWORD_ROUTE,
] as const;
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
] as const;

export const ROLE_DASHBOARD_ROUTES: Record<AppRole, string> = {
  admin: "/dashboard/admin/home",
  manager: "/dashboard/manager",
  owner: "/dashboard/owner",
  client: "/dashboard/owner",
  user: UNAUTHORIZED_ROUTE,
};

export type RoleRouteSegment = "admin" | "owner" | "manager";

export function toRoleRouteSegment(role: AppRole | null | undefined): RoleRouteSegment | null {
  if (!role || role === "user") {
    return null;
  }

  if (role === "client" || role === "owner") {
    return "owner";
  }

  if (role === "admin" || role === "manager") {
    return role;
  }

  return null;
}

export function getRoleDashboardRoute(role: AppRole | null | undefined): string {
  if (!role) {
    return LOGIN_ROUTE;
  }

  return ROLE_DASHBOARD_ROUTES[role] ?? UNAUTHORIZED_ROUTE;
}

export function resolveRoleSegmentFromPath(pathname: string): RoleRouteSegment | null {
  const matchedRoleSegment = pathname.match(/^\/dashboard\/(admin|owner|manager)(\/|$)/)?.[1];

  if (matchedRoleSegment === "admin") {
    return "admin";
  }

  if (matchedRoleSegment === "owner") {
    return "owner";
  }

  if (matchedRoleSegment === "manager") {
    return "manager";
  }

  return null;
}
