'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput(
    { label, error, id, type, className, ...props }: AuthInputProps,
    ref,
  ) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordField = type === 'password';
    const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;
    const resolvedId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const inputClassName = ['auth-input', isPasswordField ? 'pr-11' : '', className ?? '']
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1.5">
        <label htmlFor={resolvedId} className="sr-only">
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
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9ca3af] transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs font-medium text-red-600">{error}</p>
        ) : null}
      </div>
    );
  },
);

AuthInput.displayName = 'AuthInput';

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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
      strokeWidth="1.9"
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
