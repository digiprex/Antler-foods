import Link from 'next/link';
import type { ReactNode } from 'react';
import { emitDashboardRouteLoadingStart } from './route-loading-events';

interface NavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  collapsed?: boolean;
}
export function NavItem({ href, label, icon, active = false, collapsed = false }: NavItemProps) {
  const onNavigate = () => {
    if (active) {
      return;
    }

    emitDashboardRouteLoadingStart();
  };

  if (collapsed) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        title={label}
        className={`relative group inline-flex items-center justify-center rounded-lg px-2 py-2.5 text-sm transition-all ${
          active
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className={active ? 'text-white' : 'text-gray-600'}>{icon}</span>
        <span className="pointer-events-none absolute left-full top-1/2 z-50 -translate-y-1/2 ml-3 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-white' : 'text-gray-600'}`}>{icon}</span>
      <span className="leading-tight whitespace-nowrap overflow-hidden">{label}</span>
    </Link>
  );
}
