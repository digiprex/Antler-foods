'use client';

import type { SectionStyleConfig } from '@/types/section-style.types';
import type { EditorViewport } from '@/components/admin/section-settings-primitives';


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


export function SectionAppearanceControls({
  value,
  onChange,
  viewport,
}: {
  value: SectionStyleConfig;
  onChange: (updates: Partial<SectionStyleConfig>) => void;
  viewport: EditorViewport;
}) {
  const isMobile = viewport === 'mobile';

  return (
    <div className="space-y-5">

      {/* All appearance controls have been removed as requested */}

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
