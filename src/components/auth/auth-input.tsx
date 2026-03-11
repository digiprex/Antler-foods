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
    const [isFocused, setIsFocused] = useState(false);
    const isPasswordField = type === 'password';
    const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;
    const resolvedId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    
    const inputClassName = [
      'auth-input-modern',
      isPasswordField ? 'pr-12' : '',
      error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : '',
      className ?? ''
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1.5">
        <label 
          htmlFor={resolvedId} 
          className={`block text-sm font-medium transition-colors duration-200 ${
            error ? 'text-red-700' : isFocused ? 'text-violet-700' : 'text-slate-700'
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
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-all hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : null}
          
          {/* Focus indicator */}
          <div className={`absolute inset-0 rounded-xl border-2 border-transparent transition-all duration-200 pointer-events-none ${
            isFocused && !error ? 'border-violet-500/30 shadow-lg shadow-violet-500/10' : ''
          }`} />
        </div>
        {error ? (
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
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
      className="h-5 w-5"
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
      className="h-5 w-5"
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
