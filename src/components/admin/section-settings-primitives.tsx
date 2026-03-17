'use client';

import type { ReactNode } from 'react';

export type EditorViewport = 'desktop' | 'mobile';

export function SettingsHeader({
  icon,
  title,
  description,
  meta,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-700 shadow-[0_20px_45px_rgba(109,40,217,0.28)]">
          {icon}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          {meta ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{meta}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SettingsCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,1))] px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-[0_16px_32px_rgba(109,40,217,0.22)]">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              {description ? (
                <p className="text-sm text-slate-600">{description}</p>
              ) : null}
            </div>
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

export function ResponsiveViewportTabs({
  value,
  onChange,
  scope,
}: {
  value: EditorViewport;
  onChange: (viewport: EditorViewport) => void;
  scope?: string;
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-inner shadow-slate-200/80">
      {(['desktop', 'mobile'] as EditorViewport[]).map((viewport) => {
        const active = value === viewport;
        return (
          <button
            key={`${scope || 'editor'}-${viewport}`}
            type="button"
            onClick={() => onChange(viewport)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              active
                ? 'bg-white text-slate-900 shadow-[0_10px_25px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {viewport === 'desktop' ? (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L8.25 21h7.5L14.25 17m-7.5 0h10.5A2.25 2.25 0 0019.5 14.75V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v8A2.25 2.25 0 006.75 17z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v10.5A2.25 2.25 0 0117.25 19.5H6.75A2.25 2.25 0 014.5 17.25V6.75A2.25 2.25 0 016.75 4.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 7.5h6m-6 9h6"
                />
              </svg>
            )}
            {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
          </button>
        );
      })}
    </div>
  );
}

export function LayoutCard({
  title,
  description,
  preview,
  selected,
  onClick,
  badge,
}: {
  title: string;
  description: string;
  preview: ReactNode;
  selected: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative w-full overflow-hidden rounded-[24px] border p-3 text-left transition-all duration-200 ${
        selected
          ? 'border-violet-400 bg-[linear-gradient(180deg,rgba(245,243,255,1),rgba(255,255,255,1))] shadow-[0_24px_65px_rgba(109,40,217,0.18)]'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
      }`}
    >
      <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-2 shadow-inner shadow-white">
        {preview}
      </div>
      <div className="px-1 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              className={`text-sm font-semibold ${selected ? 'text-violet-900' : 'text-slate-900'}`}
            >
              {title}
            </h3>
            <p
              className={`mt-1 text-xs leading-relaxed ${selected ? 'text-violet-700' : 'text-slate-500'}`}
            >
              {description}
            </p>
          </div>
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
              selected
                ? 'border-violet-300 bg-violet-600 text-white'
                : 'border-slate-200 bg-white text-slate-400 group-hover:border-violet-200 group-hover:text-violet-500'
            }`}
          >
            {selected ? (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.6}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
          </div>
        </div>
        {badge ? (
          <span className="mt-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            {badge}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
      </label>
    </div>
  );
}

export function FloatingPreviewButton({
  viewport,
  onClick,
  disabled,
  compact = false,
}: {
  viewport: EditorViewport;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const label =
    viewport === 'mobile' ? 'Open mobile preview' : 'Open desktop preview';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`fixed right-6 z-40 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all ${
        compact
          ? `bottom-6 inline-flex h-14 w-14 items-center justify-center rounded-full border ${
              disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-violet-200 bg-white/95 text-violet-700 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white'
            }`
          : `bottom-24 inline-flex items-center gap-3 rounded-full border px-5 py-3 text-sm font-semibold ${
              disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-violet-200 bg-white/95 text-violet-700 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white'
            }`
      }`}
      aria-label="Open live preview"
      title={label}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full ${
          compact
            ? 'h-11 w-11'
            : 'h-10 w-10'
        } ${disabled ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-br from-violet-600 to-purple-700 text-white'}`}
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
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </span>
      {compact ? null : (
        <span className="flex flex-col items-start leading-tight">
          <span>Live Preview</span>
          <span className="text-xs font-medium text-violet-500">
            {label}
          </span>
        </span>
      )}
    </button>
  );
}

export function PreviewModal({
  title,
  description,
  viewport,
  onViewportChange,
  onClose,
  children,
  note,
}: {
  title: string;
  description: string;
  viewport: EditorViewport;
  onViewportChange: (viewport: EditorViewport) => void;
  onClose: () => void;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <ResponsiveViewportTabs
              value={viewport}
              onChange={onViewportChange}
              scope="preview"
            />
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
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
          <div
            className={`mx-auto overflow-hidden border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)] ${
              viewport === 'mobile'
                ? 'max-w-[430px] rounded-[32px]'
                : 'max-w-[1240px] rounded-[32px]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              <span>
                {viewport === 'mobile' ? 'Phone Preview' : 'Desktop Preview'}
              </span>
              <span>{viewport === 'mobile' ? '390 x 780' : '1280 x 720'}</span>
            </div>
            <div className="bg-white">{children}</div>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-violet-500"
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
              <span>{note}</span>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {viewport === 'mobile'
                ? 'Mobile responsiveness check'
                : 'Desktop composition check'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
