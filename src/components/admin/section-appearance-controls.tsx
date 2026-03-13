'use client';

import type { SectionStyleConfig, SectionSurfaceShadow } from '@/types/section-style.types';
import type { EditorViewport } from '@/components/admin/section-settings-primitives';

const SHADOW_OPTIONS: Array<{
  value: SectionSurfaceShadow;
  label: string;
  description: string;
}> = [
  { value: 'none', label: 'None', description: 'Keep the surface completely flat.' },
  { value: 'soft', label: 'Soft', description: 'Light elevation for a clean modern card.' },
  { value: 'medium', label: 'Medium', description: 'Balanced depth for stronger separation.' },
  { value: 'large', label: 'Large', description: 'High-contrast premium floating surface.' },
];

const REVEAL_OPTIONS: Array<{
  value: NonNullable<SectionStyleConfig['scrollRevealAnimation']>;
  label: string;
  description: string;
}> = [
  { value: 'fade', label: 'Fade', description: 'Opacity only, minimal motion.' },
  { value: 'fade-up', label: 'Fade Up', description: 'Soft lift with subtle fade.' },
  { value: 'slide-up', label: 'Slide Up', description: 'Slightly stronger upward movement.' },
  { value: 'soft-reveal', label: 'Soft Reveal', description: 'Blur-to-sharp premium entrance.' },
];

function responsiveValue<T>(
  desktopValue: T | undefined,
  mobileValue: T | undefined,
  viewport: EditorViewport,
  fallback: T,
) {
  if (viewport === 'mobile') {
    return (mobileValue ?? desktopValue ?? fallback) as T;
  }

  return (desktopValue ?? fallback) as T;
}

function resetButton(onClick: () => void, title: string) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      title={title}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </button>
  );
}

export function SectionAppearanceControls({
  value,
  onChange,
  viewport,
  widthLabel = 'Content Max Width',
  sectionLabel = 'section',
}: {
  value: SectionStyleConfig;
  onChange: (updates: Partial<SectionStyleConfig>) => void;
  viewport: EditorViewport;
  widthLabel?: string;
  sectionLabel?: string;
}) {
  const isMobile = viewport === 'mobile';
  const textAlign = responsiveValue(
    value.sectionTextAlign,
    value.mobileSectionTextAlign,
    viewport,
    'left',
  );
  const maxWidth = responsiveValue(
    value.sectionMaxWidth,
    value.mobileSectionMaxWidth,
    viewport,
    '1200px',
  );
  const paddingY = responsiveValue(
    value.sectionPaddingY,
    value.mobileSectionPaddingY,
    viewport,
    '4rem',
  );
  const paddingX = responsiveValue(
    value.sectionPaddingX,
    value.mobileSectionPaddingX,
    viewport,
    '1.5rem',
  );
  const borderRadius = responsiveValue(
    value.surfaceBorderRadius,
    value.mobileSurfaceBorderRadius,
    viewport,
    '1.5rem',
  );
  const surfaceShadow = responsiveValue(
    value.surfaceShadow,
    value.mobileSurfaceShadow,
    viewport,
    'soft',
  );

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          isMobile
            ? 'border-violet-200 bg-violet-50 text-violet-800'
            : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        {isMobile
          ? 'You are editing mobile overrides. Reset a field to fall back to the desktop value.'
          : 'You are editing the desktop base styles used across larger screens.'}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
            <span>Text Alignment</span>
            <span className="text-xs font-normal text-slate-500">
              {isMobile ? 'Mobile content alignment' : 'Desktop content alignment'}
            </span>
          </label>
          <div className="flex gap-2">
            <select
              value={textAlign}
              onChange={(event) =>
                onChange(
                  isMobile
                    ? { mobileSectionTextAlign: event.target.value as SectionStyleConfig['mobileSectionTextAlign'] }
                    : { sectionTextAlign: event.target.value as SectionStyleConfig['sectionTextAlign'] },
                )
              }
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            {isMobile
              ? resetButton(() => onChange({ mobileSectionTextAlign: undefined }), 'Use desktop text alignment')
              : null}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
            <span>{widthLabel}</span>
            <span className="text-xs font-normal text-slate-500">
              {isMobile ? 'Mobile max width override' : 'Desktop content width'}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={maxWidth}
              onChange={(event) =>
                onChange(
                  isMobile
                    ? { mobileSectionMaxWidth: event.target.value || undefined }
                    : { sectionMaxWidth: event.target.value || '1200px' },
                )
              }
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder={isMobile ? value.sectionMaxWidth || '100%' : '1200px'}
            />
            {isMobile
              ? resetButton(() => onChange({ mobileSectionMaxWidth: undefined }), 'Use desktop max width')
              : null}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
            <span>Vertical Padding</span>
            <span className="text-xs font-normal text-slate-500">
              {isMobile ? 'Mobile section breathing room' : 'Desktop section breathing room'}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={paddingY}
              onChange={(event) =>
                onChange(
                  isMobile
                    ? { mobileSectionPaddingY: event.target.value || undefined }
                    : { sectionPaddingY: event.target.value || '4rem' },
                )
              }
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder={isMobile ? value.sectionPaddingY || '3rem' : '4rem'}
            />
            {isMobile
              ? resetButton(() => onChange({ mobileSectionPaddingY: undefined }), 'Use desktop vertical padding')
              : null}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
            <span>Horizontal Padding</span>
            <span className="text-xs font-normal text-slate-500">
              {isMobile ? 'Mobile side gutters' : 'Desktop side gutters'}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={paddingX}
              onChange={(event) =>
                onChange(
                  isMobile
                    ? { mobileSectionPaddingX: event.target.value || undefined }
                    : { sectionPaddingX: event.target.value || '1.5rem' },
                )
              }
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder={isMobile ? value.sectionPaddingX || '1rem' : '1.5rem'}
            />
            {isMobile
              ? resetButton(() => onChange({ mobileSectionPaddingX: undefined }), 'Use desktop horizontal padding')
              : null}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
            <span>Surface Border Radius</span>
            <span className="text-xs font-normal text-slate-500">
              Corners for the {sectionLabel} surface
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={borderRadius}
              onChange={(event) =>
                onChange(
                  isMobile
                    ? { mobileSurfaceBorderRadius: event.target.value || undefined }
                    : { surfaceBorderRadius: event.target.value || '1.5rem' },
                )
              }
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder={isMobile ? value.surfaceBorderRadius || '1.25rem' : '1.5rem'}
            />
            {isMobile
              ? resetButton(() => onChange({ mobileSurfaceBorderRadius: undefined }), 'Use desktop border radius')
              : null}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
            <span>Surface Shadow</span>
            <span className="text-xs font-normal text-slate-500">
              Control elevation depth
            </span>
          </label>
          <div className="flex gap-2">
            <select
              value={surfaceShadow}
              onChange={(event) =>
                onChange(
                  isMobile
                    ? { mobileSurfaceShadow: event.target.value as SectionStyleConfig['mobileSurfaceShadow'] }
                    : { surfaceShadow: event.target.value as SectionStyleConfig['surfaceShadow'] },
                )
              }
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              {SHADOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isMobile
              ? resetButton(() => onChange({ mobileSurfaceShadow: undefined }), 'Use desktop surface shadow')
              : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {SHADOW_OPTIONS.find((option) => option.value === surfaceShadow)?.description}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Page Scroll Animation</h3>
            <p className="text-xs text-slate-500">
              Reveal the whole section when it enters the viewport.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={value.enableScrollReveal === true}
              onChange={(event) => onChange({ enableScrollReveal: event.target.checked })}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
          </label>
        </div>
        {value.enableScrollReveal ? (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Reveal Animation Style
            </label>
            <select
              value={value.scrollRevealAnimation || 'fade-up'}
              onChange={(event) =>
                onChange({
                  scrollRevealAnimation: event.target.value as SectionStyleConfig['scrollRevealAnimation'],
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              {REVEAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {REVEAL_OPTIONS.find(
                (option) => option.value === (value.scrollRevealAnimation || 'fade-up'),
              )?.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
