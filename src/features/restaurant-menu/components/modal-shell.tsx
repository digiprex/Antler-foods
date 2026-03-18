'use client';

import { useEffect, type ReactNode } from 'react';
import { XIcon } from '@/features/restaurant-menu/components/icons';
import { useScrollLock } from '@/features/restaurant-menu/hooks/use-scroll-lock';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}

export function ModalShell({
  open,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl',
}: ModalShellProps) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[92vh] w-full overflow-hidden rounded-[32px] bg-white shadow-2xl ${maxWidthClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-lg transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          aria-label="Close dialog"
        >
          <XIcon className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
