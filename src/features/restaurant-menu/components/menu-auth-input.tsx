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
    const [isFocused, setIsFocused] = useState(false);
    const isPasswordField = type === 'password';
    const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;
    const resolvedId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    const inputClassName = [
      'menu-auth-input',
      isPasswordField ? 'pr-11' : '',
      error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-2">
        <label
          htmlFor={resolvedId}
          className={`block text-sm font-semibold tracking-[-0.01em] transition-colors duration-200 ${
            error ? 'text-red-700' : isFocused ? 'text-slate-950' : 'text-slate-700'
          }`}
        >
          {label}
        </label>
        <div className="relative group">
          <input
            id={resolvedId}
            ref={ref}
            type={resolvedType}
            aria-invalid={Boolean(error)}
            className={inputClassName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {isPasswordField ? (
            <button
              type="button"
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((previous) => !previous)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : null}

          <div
            className={`pointer-events-none absolute inset-0 rounded-[16px] border-2 border-transparent transition-all duration-200 ${
              isFocused && !error
                ? 'border-slate-900/10 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                : ''
            }`}
          />
        </div>
        {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
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
