import type { ReactNode } from 'react';

export function FormError({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#f2c7c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#b33838]">
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#d5cfff] bg-[#f3f1ff] px-4 py-3 text-sm text-[#4d3cae]">
      {children}
    </div>
  );
}
