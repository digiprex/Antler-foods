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
        className={`relative group inline-flex items-center justify-center rounded-xl px-2 py-2.5 text-sm transition ${
          active ? 'bg-[#ede9fe] text-[#667eea]' : 'text-[#111827] hover:bg-[#f3f6f4]'
        }`}
      >
        <span className={active ? 'text-[#667eea]' : 'text-[#1f2937]'}>{icon}</span>
        <span className="pointer-events-none absolute left-full top-1/2 z-50 -translate-y-1/2 ml-3 rounded-md bg-[#111827] px-3 py-1 text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
        active
          ? 'bg-[#ede9fe] text-[#667eea]'
          : 'text-[#111827] hover:bg-[#f3f6f4]'
      }`}
    >
      <span className={active ? 'text-[#667eea]' : 'text-[#1f2937]'}>{icon}</span>
      <span className="leading-tight font-medium">{label}</span>
    </Link>
  );
}
