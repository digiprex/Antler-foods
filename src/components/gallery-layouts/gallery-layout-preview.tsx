import type { CSSProperties } from 'react';
import { normalizeGalleryLayout } from './gallery-layout-options';
import type { GalleryConfig } from '@/types/gallery.types';

interface GalleryLayoutPreviewProps {
  layout?: GalleryConfig['layout'];
  columns?: number;
  size?: 'card' | 'panel';
}

const blockStyle: CSSProperties = {
  borderRadius: '0.8rem',
  background: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)',
  opacity: 0.95,
};

function PreviewCard({
  style,
  className = '',
}: {
  style?: CSSProperties;
  className?: string;
}) {
  return <div className={className} style={{ ...blockStyle, ...style }} />;
}

export function GalleryLayoutPreview({
  layout,
  columns = 3,
  size = 'card',
}: GalleryLayoutPreviewProps) {
  const normalizedLayout = normalizeGalleryLayout(layout);
  const isPanel = size === 'panel';
  const wrapperClassName = isPanel
    ? 'mx-auto w-full max-w-5xl'
    : 'h-full w-full';
  const innerClassName = isPanel
    ? 'rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-6'
    : 'h-full rounded-2xl border border-slate-200/80 bg-white/90 p-2.5';
  const iconSize = isPanel ? 'text-3xl' : 'text-lg';
  const gridColumns = Math.max(2, Math.min(columns, 4));

  if (normalizedLayout === 'spotlight') {
    return (
      <div className={wrapperClassName}>
        <div className={innerClassName}>
          <div className="relative flex min-h-[5rem] items-center justify-center overflow-hidden rounded-2xl bg-slate-100 px-3 py-2 sm:min-h-[14rem] sm:px-6 sm:py-5">
            <div className="absolute left-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm sm:left-4 sm:h-10 sm:w-10">
              <span className={iconSize}>{'<'}</span>
            </div>
            <div className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm sm:right-4 sm:h-10 sm:w-10">
              <span className={iconSize}>{'>'}</span>
            </div>
            <div className="relative flex h-[3.75rem] w-full items-center justify-center sm:h-[11rem]">
              <PreviewCard className="absolute left-[10%] top-[18%] h-[54%] w-[20%] opacity-40 shadow-lg sm:left-[12%] sm:h-[68%] sm:w-[18%]" />
              <PreviewCard className="absolute left-[18%] top-[12%] h-[62%] w-[26%] opacity-60 shadow-xl sm:left-[20%] sm:h-[76%] sm:w-[23%]" />
              <PreviewCard className="absolute left-1/2 top-1/2 h-[84%] w-[46%] -translate-x-1/2 -translate-y-1/2 shadow-2xl" />
              <PreviewCard className="absolute right-[18%] top-[12%] h-[62%] w-[26%] opacity-60 shadow-xl sm:right-[20%] sm:h-[76%] sm:w-[23%]" />
              <PreviewCard className="absolute right-[10%] top-[18%] h-[54%] w-[20%] opacity-40 shadow-lg sm:right-[12%] sm:h-[68%] sm:w-[18%]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (normalizedLayout === 'mosaic') {
    return (
      <div className={wrapperClassName}>
        <div className={innerClassName}>
          <div className="grid min-h-[5rem] grid-cols-12 gap-2 rounded-2xl bg-slate-100 p-2 sm:min-h-[14rem] sm:gap-3 sm:p-4">
            <PreviewCard className="col-span-3 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-5 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-4 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-6 row-span-3 min-h-[1.65rem] sm:min-h-[6rem]" />
            <PreviewCard className="col-span-3 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-3 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-3 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-4 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
            <PreviewCard className="col-span-5 row-span-2 min-h-[1.65rem] sm:min-h-[4rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (normalizedLayout === 'editorial') {
    return (
      <div className={wrapperClassName}>
        <div className={innerClassName}>
          <div className="grid min-h-[5rem] grid-cols-12 gap-2 rounded-2xl bg-slate-100 p-2 sm:min-h-[14rem] sm:gap-3 sm:p-4">
            <PreviewCard className="col-span-12 min-h-[2.1rem] sm:min-h-[6.5rem]" />
            <PreviewCard className="col-span-3 min-h-[1.9rem] sm:min-h-[5.5rem]" />
            <PreviewCard className="col-span-3 min-h-[1.9rem] sm:min-h-[5.5rem]" />
            <PreviewCard className="col-span-3 min-h-[1.9rem] sm:min-h-[5.5rem]" />
            <PreviewCard className="col-span-3 min-h-[1.9rem] sm:min-h-[5.5rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (normalizedLayout === 'filmstrip') {
    return (
      <div className={wrapperClassName}>
        <div className={innerClassName}>
          <div className="rounded-2xl bg-slate-100 p-2 sm:p-4">
            <div className="flex min-h-[5rem] items-end justify-center gap-2 overflow-hidden sm:min-h-[14rem] sm:gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <PreviewCard
                  key={index}
                  className={
                    index === 2
                      ? 'h-[3.5rem] w-[22%] sm:h-[9rem] sm:w-[16%]'
                      : index === 3
                        ? 'h-[3.1rem] w-[21%] sm:h-[8rem] sm:w-[15%]'
                        : 'h-[2.7rem] w-[18%] sm:h-[6.5rem] sm:w-[13%]'
                  }
                  style={{
                    transform:
                      index === 2
                        ? 'translateY(-0.35rem)'
                        : index === 0 || index === 5
                          ? 'translateY(0.5rem)'
                          : 'translateY(0.2rem)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (normalizedLayout === 'masonry') {
    return (
      <div className={wrapperClassName}>
        <div className={innerClassName}>
          <div
            className="grid gap-2 rounded-2xl bg-slate-100 p-2 sm:gap-3 sm:p-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(gridColumns, 4)}, minmax(0, 1fr))`,
            }}
          >
            {['5rem', '3.75rem', '4.5rem', '4rem', '3.5rem', '4.75rem']
              .slice(0, gridColumns * 2)
              .map((height, index) => (
                <PreviewCard
                  key={index}
                  style={{ height: isPanel ? height : '100%' }}
                  className="min-h-[2rem]"
                />
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (normalizedLayout === 'carousel') {
    return (
      <div className={wrapperClassName}>
        <div className={innerClassName}>
          <div className="rounded-2xl bg-slate-100 p-2 sm:p-4">
            <div className="flex min-h-[5rem] gap-2 sm:min-h-[14rem] sm:gap-3">
              <PreviewCard className="h-full flex-[1.6] min-h-[4rem] sm:min-h-[11rem]" />
              <PreviewCard className="h-full flex-1 min-h-[4rem] sm:min-h-[11rem]" />
              <PreviewCard className="hidden h-full flex-1 min-h-[4rem] sm:block sm:min-h-[11rem]" />
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full ${
                    index === 0 ? 'w-8 bg-slate-500' : 'w-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div className={innerClassName}>
        <div
          className="grid rounded-2xl bg-slate-100 p-2 sm:p-4"
          style={{
            gap: isPanel ? '0.9rem' : '0.35rem',
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: gridColumns * 2 }).map((_, index) => (
            <PreviewCard
              key={index}
              className="min-h-[2rem] sm:min-h-[4.25rem]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
