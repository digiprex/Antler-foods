"use client";

import type { HTMLInputTypeAttribute, ReactNode } from "react";
import type {
  FieldErrors,
  FieldPath,
  UseFormRegister,
} from "react-hook-form";
import type { NewRestaurantFormValues } from "./schema";

interface FormTextInputProps {
  label: string;
  name: FieldPath<NewRestaurantFormValues>;
  register: UseFormRegister<NewRestaurantFormValues>;
  errors: FieldErrors<NewRestaurantFormValues>;
  placeholder?: string;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  inputRef?: (element: HTMLInputElement | null) => void;
}

interface FormSelectInputProps {
  label?: string;
  name: FieldPath<NewRestaurantFormValues>;
  register: UseFormRegister<NewRestaurantFormValues>;
  errors: FieldErrors<NewRestaurantFormValues>;
  placeholder: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

interface FormRadioOptionProps {
  name: FieldPath<NewRestaurantFormValues>;
  value: string;
  label: string;
  register: UseFormRegister<NewRestaurantFormValues>;
  checked: boolean;
  suffix?: ReactNode;
}

export function FormTextInput({
  label,
  name,
  register,
  errors,
  placeholder,
  required = false,
  type = "text",
  autoComplete,
  leftAddon,
  rightAddon,
  inputRef,
}: FormTextInputProps) {
  const error = getErrorMessage(errors, name);
  const hasError = Boolean(error);
  const inputRegistration = register(name);

  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} />
      <div
        className={cx(
          "flex min-h-12 items-center rounded-xl border bg-white",
          hasError
            ? "border-[#e57373] shadow-[0_0_0_2px_rgba(229,115,115,0.08)]"
            : "border-[#d4e0e6]",
        )}
      >
        {leftAddon ? (
          <div className="ml-3 flex items-center gap-2 border-r border-[#d6e0e5] pr-3">
            {leftAddon}
          </div>
        ) : null}

        <input
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-12 w-full bg-transparent px-3 text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none"
          {...inputRegistration}
          ref={(element) => {
            inputRegistration.ref(element);
            inputRef?.(element);
          }}
        />

        {rightAddon ? <div className="mr-3">{rightAddon}</div> : null}
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function FormSelectInput({
  label,
  name,
  register,
  errors,
  placeholder,
  required = false,
  options,
}: FormSelectInputProps) {
  const error = getErrorMessage(errors, name);
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      {label ? <FieldLabel label={label} required={required} /> : null}
      <div
        className={cx(
          "relative min-h-12 rounded-xl border bg-white",
          hasError
            ? "border-[#e57373] shadow-[0_0_0_2px_rgba(229,115,115,0.08)]"
            : "border-[#d4e0e6]",
        )}
      >
        <select
          className="h-12 w-full appearance-none bg-transparent px-3 pr-10 text-base text-[#101827] focus:outline-none"
          defaultValue=""
          {...register(name)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#b6c2cc]">
          <ChevronDownIcon />
        </div>
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function FormRadioOption({
  name,
  value,
  label,
  register,
  checked,
  suffix,
}: FormRadioOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[17px] font-medium text-[#1c2a39]">
      <input type="radio" value={value} className="sr-only" {...register(name)} />
      <span
        className={cx(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border",
          checked ? "border-[#60c783] text-[#60c783]" : "border-[#d3dee5] text-transparent",
        )}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      <span>{label}</span>
      {suffix}
    </label>
  );
}

export function HelperCallout({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-4 border-[#ebc54a] pl-4 text-[16px] leading-relaxed text-[#1b2a39]">
      {children}
    </p>
  );
}

export function AddRestaurantCard() {
  return (
    <button
      type="button"
      className={cx(
        "flex min-h-[130px] w-full max-w-[370px] items-center justify-center rounded-2xl border border-[#d4e0e6] bg-white",
        "text-[20px] font-semibold text-[#111827] transition hover:border-[#b7c8d2] hover:bg-[#f9fcfd]",
      )}
    >
      + Add restaurant
    </button>
  );
}

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <label className="block text-base font-medium text-[#111827]">
      {required ? <span className="mr-1 text-[#ef5350]">*</span> : null}
      {label}
    </label>
  );
}

function FieldError({ error }: { error: string | undefined }) {
  if (!error) {
    return null;
  }

  return <p className="text-xs text-[#d83f3f]">{error}</p>;
}

function getErrorMessage(
  errors: FieldErrors<NewRestaurantFormValues>,
  name: FieldPath<NewRestaurantFormValues>,
) {
  const field = (errors as Record<string, { message?: unknown } | undefined>)[name];
  return typeof field?.message === "string" ? field.message : undefined;
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
