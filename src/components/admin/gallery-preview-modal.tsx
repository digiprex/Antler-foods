'use client';

import { useEffect, useMemo, useRef } from 'react';
import Gallery from '@/components/gallery';
import { GalleryLayoutPreview } from '@/components/gallery-layouts/gallery-layout-preview';
import {
  GALLERY_LAYOUT_OPTIONS,
  normalizeGalleryLayout,
} from '@/components/gallery-layouts/gallery-layout-options';
import type { GalleryConfig } from '@/types/gallery.types';

interface GalleryPreviewModalProps {
  open: boolean;
  config: GalleryConfig | null;
  onClose: () => void;
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
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

  const normalizedLayout = normalizeGalleryLayout(config?.layout);
  const layoutOption = useMemo(
    () =>
      GALLERY_LAYOUT_OPTIONS.find((option) => option.value === normalizedLayout) ??
      GALLERY_LAYOUT_OPTIONS[0],
    [normalizedLayout]
  );

  if (!open || !config) {
    return null;
  }

  const hasImages = config.images.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/78 backdrop-blur-xl"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[min(94vh,1020px)] w-full max-w-[min(96vw,1540px)] flex-col overflow-hidden rounded-[32px] border border-white/35 bg-white/88 shadow-[0_45px_140px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92)_52%,rgba(245,243,255,0.9))] px-5 py-5 sm:px-8 sm:py-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-72 bg-[radial-gradient(circle_at_left,rgba(168,85,247,0.16),transparent_72%)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-44 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_74%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                Live Canvas
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
                Gallery Preview
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600 sm:text-base">
                Review the gallery in a premium presentation frame before saving it
                to the live page.
              </p>
            </div>
            <div className="flex items-start gap-3 self-start lg:self-auto">
              <div className="hidden gap-2 sm:flex">
                <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                  {layoutOption.name}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                  {config.images.length} {config.images.length === 1 ? 'Image' : 'Images'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white/80 text-slate-400 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700"
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
        </div>

        <div
          ref={bodyRef}
          className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,#ffffff,#f8fafc_48%,#eef2ff_100%)] p-4 sm:p-8"
        >
          <div className="mx-auto max-w-[1420px]">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/74 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-5">
                <div className="pointer-events-none absolute inset-x-10 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_72%)]" />
                <div className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  {hasImages ? (
                    <Gallery {...config} />
                  ) : (
                    <div
                      className="rounded-[26px] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9)_46%,rgba(245,243,255,0.92))] px-5 py-8 text-center sm:px-8 sm:py-10"
                      style={{ color: config.textColor || '#000000' }}
                    >
                      <div className="mx-auto mb-10 max-w-3xl">
                        {config.title && (
                          <h2
                            style={{
                              fontSize: 'clamp(2rem, 4vw, 3.3rem)',
                              fontWeight: '700',
                              marginBottom: '0.75rem',
                              color:
                                config.titleColor ||
                                config.textColor ||
                                '#000000',
                              letterSpacing: '-0.04em',
                            }}
                          >
                            {config.title}
                          </h2>
                        )}
                        {config.subtitle && (
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
                        )}
                        {config.description && (
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
                        )}
                      </div>

                      <GalleryLayoutPreview
                        layout={config.layout}
                        columns={config.columns}
                        size="panel"
                      />
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Layout Direction
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {layoutOption.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {layoutOption.description}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <InfoChip label="Columns" value={`${config.columns || 3}`} />
                    <InfoChip
                      label="Status"
                      value={hasImages ? 'Ready to review' : 'Awaiting images'}
                    />
                    <InfoChip
                      label="Motion"
                      value={
                        normalizedLayout === 'carousel' ||
                        normalizedLayout === 'spotlight' ||
                        normalizedLayout === 'filmstrip'
                          ? 'Interactive'
                          : 'Layered'
                      }
                    />
                    <InfoChip
                      label="Mobile"
                      value="Responsive"
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(15,23,42,0.95),rgba(30,41,59,0.96))] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Composition
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">Visual Map</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                      Scheme
                    </span>
                  </div>
                  <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-3">
                    <GalleryLayoutPreview
                      layout={config.layout}
                      columns={config.columns}
                      size="card"
                    />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
