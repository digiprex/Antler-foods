import type { AppRole } from "./get-user-role";

export const LOGIN_ROUTE = "/login";
export const SIGNUP_ROUTE = "/signup";
export const DEFAULT_AUTH_REDIRECT = "/dashboard/admin";
export const UNAUTHORIZED_ROUTE = "/unauthorized";

export const PUBLIC_ROUTES = [LOGIN_ROUTE, SIGNUP_ROUTE] as const;
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
] as const;

export const ROLE_DASHBOARD_ROUTES: Record<AppRole, string> = {
  admin: "/dashboard/admin",
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
