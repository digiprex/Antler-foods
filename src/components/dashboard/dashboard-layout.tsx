'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  useAuthenticationStatus,
  useHasuraClaims,
  useSignOut,
  useUserData,
} from '@nhost/react';
import { usePathname, useRouter } from 'next/navigation';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import {
  LOGIN_ROUTE,
  UNAUTHORIZED_ROUTE,
  resolveRoleSegmentFromPath,
  toRoleRouteSegment,
} from '@/lib/auth/routes';
import { IconRail, type DashboardRailTab } from './icon-rail';
import type { RestaurantSearchSelection } from './search-box';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

function resolveActiveRailTab(
  pathname: string,
  baseDashboardPath: string,
): DashboardRailTab {
  if (pathname.startsWith(`${baseDashboardPath}/reservations`)) {
    return 'reservations';
  }

  if (pathname.startsWith(`${baseDashboardPath}/team`)) {
    return 'team';
  }

  return 'home';
}

function resolveDashboardBasePath(pathname: string) {
  const roleSegment = resolveRoleSegmentFromPath(pathname);
  if (roleSegment) {
    return `/${roleSegment}/dashboard`;
  }

  return '/dashboard';
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantSearchSelection | null>(null);
  const [manualRailTab, setManualRailTab] = useState<DashboardRailTab | null>(
    null,
  );
  const roleRouteSegment = toRoleRouteSegment(role);
  const expectedRoleRouteSegment = resolveRoleSegmentFromPath(pathname);
  const dashboardBasePath = useMemo(
    () => resolveDashboardBasePath(pathname),
    [pathname],
  );

  const pathBasedTab = useMemo(
    () => resolveActiveRailTab(pathname, dashboardBasePath),
    [dashboardBasePath, pathname],
  );

  const activeTab = manualRailTab ?? pathBasedTab;

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
    if (isStatusLoading) {
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
      const wrongPrefix = `/${expectedRoleRouteSegment}/dashboard`;
      const nextSuffix = pathname.startsWith(wrongPrefix)
        ? pathname.slice(wrongPrefix.length)
        : '';
      router.replace(`/${roleRouteSegment}/dashboard${nextSuffix}`);
      return;
    }

    if (pathname.startsWith('/dashboard')) {
      const nextSuffix = pathname.slice('/dashboard'.length);
      router.replace(`/${roleRouteSegment}/dashboard${nextSuffix}`);
    }
  }, [
    expectedRoleRouteSegment,
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

  const onSelectWebsiteTab = () => {
    if (!selectedRestaurant) {
      return;
    }
    setManualRailTab('website');
  };

  const onSelectStandardTab = () => {
    setManualRailTab(null);
  };

  const onRestaurantSelect = (restaurant: RestaurantSearchSelection | null) => {
    setSelectedRestaurant(restaurant);
    if (!restaurant) {
      setManualRailTab(null);
    }
  };

  if (isStatusLoading || (isAuthenticated && !isRoleResolved)) {
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
      <div className="flex min-h-screen">
        <IconRail
          activeTab={activeTab}
          dashboardBasePath={dashboardBasePath}
          selectedRestaurant={selectedRestaurant}
          onSelectWebsiteTab={onSelectWebsiteTab}
          onSelectStandardTab={onSelectStandardTab}
        />
        <Sidebar
          activeTab={activeTab}
          pathname={pathname}
          dashboardBasePath={dashboardBasePath}
          isOpen={isSidebarOpen}
          selectedRestaurant={selectedRestaurant}
          onRestaurantSelect={onRestaurantSelect}
        />
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
