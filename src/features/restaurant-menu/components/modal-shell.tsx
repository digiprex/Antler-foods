'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { XIcon } from '@/features/restaurant-menu/components/icons';
import { useScrollLock } from '@/features/restaurant-menu/hooks/use-scroll-lock';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  showTopGlow?: boolean;
}

const EXIT_ANIMATION_MS = 220;

export function ModalShell({
  open,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl',
  panelClassName = 'border border-stone-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)]',
  showTopGlow = true,
}: ModalShellProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useScrollLock(isMounted);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => setIsMounted(false), EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMounted, onClose]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm transition duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full overflow-hidden rounded-[28px] transition duration-200 ${panelClassName} ${maxWidthClassName} ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
        }`}
      >
        {showTopGlow ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(248,250,252,0.9),transparent_72%)]" />
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-[0_12px_28px_rgba(15,23,42,0.1)] transition hover:border-stone-300 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
          aria-label="Close dialog"
        >
          <XIcon className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
