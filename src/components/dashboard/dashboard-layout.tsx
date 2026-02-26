'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  useAuthenticationStatus,
  useHasuraClaims,
  useSignOut,
  useUserData,
} from '@nhost/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import type { AppRole } from '@/lib/auth/get-user-role';
import { nhost } from '@/lib/nhost';
import {
  LOGIN_ROUTE,
  UNAUTHORIZED_ROUTE,
  resolveRoleSegmentFromPath,
  toRoleRouteSegment,
} from '@/lib/auth/routes';
import type { DashboardRailTab } from './icon-rail';
import type { RestaurantSearchSelection } from './search-box';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import {
  buildRestaurantInformationPath,
  buildRestaurantMediaPath,
  buildRestaurantSlug,
  parseRestaurantScopeFromPath,
} from '@/lib/restaurants/route-utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const AUTH_BOOTSTRAP_TIMEOUT_MS = 1800;

function resolveActiveRailTab(
  pathname: string,
  baseDashboardPath: string,
): DashboardRailTab {
  if (isWebsitePath(pathname)) {
    return 'website';
  }

  if (pathname.startsWith(`${baseDashboardPath}/reservations`)) {
    return 'reservations';
  }

  if (pathname.startsWith(`${baseDashboardPath}/team`)) {
    return 'team';
  }

  return 'home';
}

function resolveDashboardBasePath(pathname: string, userRole: AppRole | null) {
  const roleSegment = resolveRoleSegmentFromPath(pathname);
  if (roleSegment) {
    return `/dashboard/${roleSegment}`;
  }

  // Handle admin paths like /admin/navbar-settings
  if (pathname.startsWith('/admin/') && userRole) {
    const roleRouteSegment = toRoleRouteSegment(userRole);
    if (roleRouteSegment) {
      return `/dashboard/${roleRouteSegment}`;
    }
  }

  return '/dashboard';
}

function isWebsitePath(pathname: string) {
  // Treat the legacy "pages-settings" route as part of the Website workspace
  // so the sidebar stays in the Website tab when navigating there.
  return /^\/dashboard\/(admin|owner|manager)\/(website|pages-settings)(\/|$)/.test(pathname) ||
         /^\/admin\/(pages-settings|navbar-settings|popup-settings|youtube-settings|footer-settings|hero-settings|gallery-settings|faq-settings|review-settings)(\/|$)/.test(pathname);
}

function isMyInfoPath(pathname: string) {
  return (
    /^\/dashboard\/(admin|owner|manager)\/my-info(\/|$)/.test(pathname) ||
    /^\/dashboard\/(admin|owner|manager)\/restaurants\/[^/]+\/information\/(brand|address|google-profile)(\/|$)/.test(
      pathname,
    )
  );
}

function isRestaurantWorkspacePath(pathname: string) {
  return (
    /^\/dashboard\/(admin|owner|manager)\/(sales|menu|information|reviews|assets|opening-hours|locations|marketing|reservations|catering)(\/|$)/.test(
      pathname,
    ) ||
    /^\/dashboard\/(admin|owner|manager)\/restaurants\/[^/]+\/media(\/|$)/.test(
      pathname,
    )
  );
}

function isRestaurantScopedPath(pathname: string) {
  return (
    isWebsitePath(pathname) ||
    isMyInfoPath(pathname) ||
    isRestaurantWorkspacePath(pathname)
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const roleFromUser = user ? getUserRole(user) : null;
  const role =
    roleFromClaims && roleFromClaims !== 'user' ? roleFromClaims : roleFromUser;
  const { isAuthenticated, isLoading: isStatusLoading } =
    useAuthenticationStatus();
  const { signOut } = useSignOut();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [claimsWaitElapsed, setClaimsWaitElapsed] = useState(false);
  const [isAuthBootstrapReady, setIsAuthBootstrapReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantSearchSelection | null>(null);
  const roleRouteSegment = toRoleRouteSegment(role);
  const expectedRoleRouteSegment = resolveRoleSegmentFromPath(pathname);
  const dashboardBasePath = useMemo(
    () => resolveDashboardBasePath(pathname, role),
    [pathname, role],
  );
  const websiteBasePath = useMemo(
    () =>
      roleRouteSegment
        ? `/dashboard/${roleRouteSegment}/website`
        : '/website',
    [roleRouteSegment],
  );

  const pathBasedTab = useMemo(
    () => resolveActiveRailTab(pathname, dashboardBasePath),
    [dashboardBasePath, pathname],
  );

  const activeTab = pathBasedTab;

  useEffect(() => {
    let isCancelled = false;

    const settleInitialAuthState = async () => {
      try {
        await Promise.race([
          nhost.auth.isAuthenticatedAsync(),
          new Promise<void>((resolve) =>
            setTimeout(resolve, AUTH_BOOTSTRAP_TIMEOUT_MS),
          ),
        ]);
      } catch {
        // Ignore bootstrap errors and let auth guards handle redirects.
      } finally {
        if (!isCancelled) {
          setIsAuthBootstrapReady(true);
        }
      }
    };

    void settleInitialAuthState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const restaurantScope = parseRestaurantScopeFromPath(pathname);
    if (!restaurantScope) {
      return;
    }

    const queryRestaurantName =
      searchParams.get('restaurant_name')?.trim() ?? '';
    const resolvedName = queryRestaurantName || restaurantScope.restaurantNameFromSlug;

    setSelectedRestaurant((previous) => {
      if (
        previous?.id === restaurantScope.restaurantId &&
        previous?.name === resolvedName
      ) {
        return previous;
      }

      return {
        id: restaurantScope.restaurantId,
        name: resolvedName,
      };
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const restaurantScope = parseRestaurantScopeFromPath(pathname);
    if (restaurantScope) {
      return;
    }

    const queryRestaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
    const queryRestaurantName =
      searchParams.get('restaurant_name')?.trim() ?? '';

    if (!queryRestaurantId || !queryRestaurantName) {
      return;
    }

    setSelectedRestaurant((previous) => {
      if (
        previous?.id === queryRestaurantId &&
        previous?.name === queryRestaurantName
      ) {
        return previous;
      }

      return {
        id: queryRestaurantId,
        name: queryRestaurantName,
      };
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const roleSegment = resolveRoleSegmentFromPath(pathname);
    const restaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
    const restaurantName = searchParams.get('restaurant_name')?.trim() ?? '';
    if (!roleSegment || !restaurantId) {
      return;
    }

    let nextPath: string | null = null;
    if (
      /\/my-info\/(profile|business-information|brand)$/.test(pathname)
    ) {
      nextPath = buildRestaurantInformationPath(
        roleSegment,
        {
          id: restaurantId,
          name: restaurantName || 'restaurant',
        },
        'brand',
      );
    } else if (/\/my-info\/address$/.test(pathname)) {
      nextPath = buildRestaurantInformationPath(
        roleSegment,
        {
          id: restaurantId,
          name: restaurantName || 'restaurant',
        },
        'address',
      );
    } else if (/\/my-info\/google-profile$/.test(pathname)) {
      nextPath = buildRestaurantInformationPath(
        roleSegment,
        {
          id: restaurantId,
          name: restaurantName || 'restaurant',
        },
        'google-profile',
      );
    } else if (/\/my-info\/gallery$/.test(pathname)) {
      nextPath = buildRestaurantMediaPath(roleSegment, {
        id: restaurantId,
        name: restaurantName || 'restaurant',
      });
    }

    if (!nextPath) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('restaurant_id');
    nextParams.delete('restaurant_name');
    const query = nextParams.toString();
    const nextUrl = query ? `${nextPath}?${query}` : nextPath;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!isAuthenticated || roleFromClaims) {
      setClaimsWaitElapsed(false);
      return;
    }

    const timer = setTimeout(() => setClaimsWaitElapsed(true), 1200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, roleFromClaims]);

  const isRoleResolved = Boolean(
    (roleFromClaims && roleFromClaims !== 'user') ||
    (roleFromUser && roleFromUser !== 'user') ||
    (claimsWaitElapsed && roleFromUser !== null),
  );

  useEffect(() => {
    if (!isAuthBootstrapReady || isStatusLoading) {
      return;
    }

    if (!isAuthenticated) {
      const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`${LOGIN_ROUTE}${nextParam}`);
      return;
    }

    if (!isRoleResolved) {
      return;
    }

    if (!roleRouteSegment) {
      router.replace(UNAUTHORIZED_ROUTE);
      return;
    }

    if (
      expectedRoleRouteSegment &&
      expectedRoleRouteSegment !== roleRouteSegment
    ) {
      const nextPathname = pathname.replace(
        new RegExp(`^/dashboard/${expectedRoleRouteSegment}(?=/|$)`),
        `/dashboard/${roleRouteSegment}`,
      );
      router.replace(nextPathname || `/dashboard/${roleRouteSegment}`);
      return;
    }

    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/')) {
      const nextSuffix = pathname.slice('/dashboard'.length);
      router.replace(`/dashboard/${roleRouteSegment}${nextSuffix}`);
      return;
    }

    if (pathname.startsWith('/website')) {
      const nextSuffix = pathname.slice('/website'.length);
      router.replace(`/dashboard/${roleRouteSegment}/website${nextSuffix}`);
    }
  }, [
    expectedRoleRouteSegment,
    isAuthBootstrapReady,
    isAuthenticated,
    isRoleResolved,
    isStatusLoading,
    pathname,
    roleRouteSegment,
    router,
  ]);

  const onLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    setIsLoggingOut(false);
    router.replace(LOGIN_ROUTE);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const onRestaurantSelect = (restaurant: RestaurantSearchSelection | null) => {
    setSelectedRestaurant(restaurant);
    const restaurantScope = parseRestaurantScopeFromPath(pathname);

    if (!restaurant) {
      if (restaurantScope?.roleSegment) {
        router.replace(`/dashboard/${restaurantScope.roleSegment}/restaurants`, {
          scroll: false,
        });
        return;
      }

      if (!isRestaurantScopedPath(pathname)) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('restaurant_id');
      nextParams.delete('restaurant_name');
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
      return;
    }

    if (!isRestaurantScopedPath(pathname)) {
      return;
    }

    if (restaurantScope) {
      const nextSlug = buildRestaurantSlug({
        id: restaurant.id,
        name: restaurant.name,
      });
      const nextPath = pathname.replace(
        /(\/dashboard\/[^/]+\/restaurants\/)[^/]+/,
        `$1${nextSlug}`,
      );
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('restaurant_id');
      nextParams.delete('restaurant_name');
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${nextPath}?${nextQuery}` : nextPath;
      router.replace(nextUrl, { scroll: false });
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('restaurant_id', restaurant.id);
    nextParams.set('restaurant_name', restaurant.name);
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  if (
    !isAuthBootstrapReady ||
    isStatusLoading ||
    (isAuthenticated && !isRoleResolved)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5f6]">
        <div className="rounded-xl border border-[#d7e2e6] bg-white px-5 py-3 text-sm text-[#5a6670]">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !roleRouteSegment) {
    return null;
  }

  const userLabel = user?.displayName?.trim() || user?.email || 'Admin';

  return (
    <div className="min-h-screen bg-[#f3f5f6]">
      <Sidebar
        activeTab={activeTab}
        pathname={pathname}
        dashboardBasePath={dashboardBasePath}
        websiteBasePath={websiteBasePath}
        isOpen={isSidebarOpen}
        selectedRestaurant={selectedRestaurant}
        onRestaurantSelect={onRestaurantSelect}
      />
      <div className={`min-h-screen transition-all duration-200 ease-in-out ${isSidebarOpen ? 'ml-[330px]' : 'ml-16'}`}>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userLabel={userLabel}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
