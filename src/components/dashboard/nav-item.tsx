import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { emitDashboardRouteLoadingStart } from './route-loading-events';

interface NavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  collapsed?: boolean;
}
export function NavItem({ href, label, icon, active = false, collapsed = false }: NavItemProps) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const onNavigate = () => {
    if (active) {
      return;
    }

    emitDashboardRouteLoadingStart();
  };

  const updateTooltipPosition = useCallback(() => {
    const rect = linkRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setTooltipPosition({
      left: rect.right + 12,
      top: rect.top + rect.height / 2,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipPosition(null);
  }, []);

  useEffect(() => {
    if (!collapsed || !tooltipPosition) {
      return;
    }

    const handleViewportChange = () => {
      updateTooltipPosition();
    };

    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [collapsed, tooltipPosition, updateTooltipPosition]);

  if (collapsed) {
    return (
      <>
        <Link
          ref={linkRef}
          href={href}
          onClick={onNavigate}
          onMouseEnter={updateTooltipPosition}
          onMouseLeave={hideTooltip}
          onFocus={updateTooltipPosition}
          onBlur={hideTooltip}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          data-sidebar-item="true"
          data-sidebar-active={active ? 'true' : undefined}
          className={`relative inline-flex items-center justify-center rounded-lg px-2 py-2.5 text-sm transition-all ${
            active
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className={active ? 'text-white' : 'text-gray-600'}>{icon}</span>
        </Link>

        {tooltipPosition ? (
          <span
            className="pointer-events-none fixed z-[90] -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
          >
            {label}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <Link
      ref={linkRef}
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-sidebar-item="true"
      data-sidebar-active={active ? 'true' : undefined}
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
