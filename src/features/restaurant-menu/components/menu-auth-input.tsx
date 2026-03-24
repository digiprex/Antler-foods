'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

interface MenuAuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const MenuAuthInput = forwardRef<HTMLInputElement, MenuAuthInputProps>(
  function MenuAuthInput(
    { label, error, id, type, className, ...props }: MenuAuthInputProps,
    ref,
  ) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordField = type === 'password';
    const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;
    const resolvedId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    const inputClassName = [
      'h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-950 outline-none transition',
      'placeholder:text-slate-400 focus:border-black focus:ring-2 focus:ring-black/10',
      error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-stone-300 hover:border-stone-400',
      isPasswordField ? 'pr-12' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-2">
        <label htmlFor={resolvedId} className="block text-sm font-medium text-slate-900">
          {label}
        </label>
        <div className="relative">
          <input
            id={resolvedId}
            ref={ref}
            type={resolvedType}
            aria-invalid={Boolean(error)}
            className={inputClassName}
            {...props}
          />
          {isPasswordField ? (
            <button
              type="button"
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((previous) => !previous)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : null}
        </div>
        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
      </div>
    );
  },
);

MenuAuthInput.displayName = 'MenuAuthInput';

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.6 6.2A11.4 11.4 0 0 1 12 6c6.5 0 10 6 10 6a17.2 17.2 0 0 1-3 3.7" />
      <path d="M6.2 7.1C3.6 9.1 2 12 2 12s3.5 6 10 6a10.5 10.5 0 0 0 5-1.2" />
      <path d="m2 2 20 20" />
      <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
    </svg>
  );
}