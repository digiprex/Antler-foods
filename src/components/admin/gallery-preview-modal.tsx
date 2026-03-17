'use client';

import { useEffect, useRef } from 'react';
import Gallery from '@/components/gallery';
import { GalleryLayoutPreview } from '@/components/gallery-layouts/gallery-layout-preview';
import type { GalleryConfig } from '@/types/gallery.types';

interface GalleryPreviewModalProps {
  open: boolean;
  config: GalleryConfig | null;
  onClose: () => void;
}

export function GalleryPreviewModal({
  open,
  config,
  onClose,
}: GalleryPreviewModalProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [open, config?.layout, config?.images.length]);

  if (!open || !config) {
    return null;
  }

  const hasImages = config.images.length > 0;
  const revealEnabled =
    config.enableScrollReveal ?? config.enableScrollAnimation ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Live Preview</h2>
            <p className="mt-1 text-sm text-slate-600">
              Preview the gallery layout with your current content and styling.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close preview"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6"
        >
          <div className="mx-auto max-w-[1240px] overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              <span>Desktop Preview</span>
              <span>1280 x 720</span>
            </div>

            <div className="bg-white">
              {hasImages ? (
                <Gallery
                  {...config}
                  enableLightbox={false}
                  previewMode="desktop"
                />
              ) : (
                <div
                  className="px-5 py-8 text-center sm:px-8 sm:py-10"
                  style={{
                    color: config.textColor || '#000000',
                    backgroundColor: config.bgColor || '#ffffff',
                  }}
                >
                  <div className="mx-auto mb-10 max-w-3xl">
                    {config.title ? (
                      <h2
                        style={{
                          fontSize: 'clamp(2rem, 4vw, 3.3rem)',
                          fontWeight: '700',
                          marginBottom: '0.75rem',
                          color:
                            config.titleColor || config.textColor || '#000000',
                          letterSpacing: '-0.04em',
                        }}
                      >
                        {config.title}
                      </h2>
                    ) : null}
                    {config.subtitle ? (
                      <p
                        style={{
                          fontSize: '1rem',
                          marginBottom: '0.85rem',
                          color: config.textColor || '#000000',
                          opacity: 0.82,
                          textTransform: 'uppercase',
                          letterSpacing: '0.16em',
                          fontWeight: 600,
                        }}
                      >
                        {config.subtitle}
                      </p>
                    ) : null}
                    {config.description ? (
                      <p
                        style={{
                          fontSize: '1rem',
                          color: config.textColor || '#000000',
                          opacity: 0.7,
                          maxWidth: '42rem',
                          margin: '0 auto',
                          lineHeight: 1.7,
                        }}
                      >
                        {config.description}
                      </p>
                    ) : null}
                  </div>

                  <GalleryLayoutPreview
                    layout={config.layout}
                    columns={config.columns}
                    size="panel"
                    bgColor={config.bgColor || '#ffffff'}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>
                {!hasImages
                  ? 'Add images to see the full gallery layout in action.'
                  : revealEnabled
                    ? 'Live preview reflects your current gallery content, styling, and motion settings.'
                    : 'Live preview reflects your current gallery content and styling.'}
              </span>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Desktop preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
