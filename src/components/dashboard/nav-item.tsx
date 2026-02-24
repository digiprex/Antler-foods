import Link from 'next/link';
import type { ReactNode } from 'react';

interface NavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}

export function NavItem({ href, label, icon, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-5 py-3 text-[20px] transition ${
        active
          ? 'bg-[#ede9fe] text-[#667eea]'
          : 'text-[#111827] hover:bg-[#f3f6f4]'
      }`}
    >
      <span className={active ? 'text-[#667eea]' : 'text-[#1f2937]'}>
        {icon}
      </span>
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
