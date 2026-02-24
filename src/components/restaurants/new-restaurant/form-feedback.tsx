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
    <div className="rounded-xl border border-[#bce4cb] bg-[#ebf9ef] px-4 py-3 text-sm text-[#2b7a45]">
      {children}
    </div>
  );
}
