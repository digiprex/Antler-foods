'use client';

import { useState } from 'react';
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { FormSelectInput, FormTextInput } from './form-fields';
import type { NewRestaurantFormValues } from './schema';

interface StepBusinessInfoProps {
  control: Control<NewRestaurantFormValues>;
  register: UseFormRegister<NewRestaurantFormValues>;
  setValue: UseFormSetValue<NewRestaurantFormValues>;
  errors: FieldErrors<NewRestaurantFormValues>;
  franchiseId: string | null;
  onBackToStepOne: () => void;
}

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'cloud-kitchen', label: 'Cloud Kitchen' },
  { value: 'food-truck', label: 'Food Truck' },
];

export function StepBusinessInfo({
  control,
  register,
  setValue,
  errors,
  franchiseId,
  onBackToStepOne,
}: StepBusinessInfoProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldCreateOwner =
    useWatch({
      control,
      name: 'shouldCreateOwner',
    }) ?? false;
  const ownerToggleError =
    typeof errors.shouldCreateOwner?.message === 'string'
      ? errors.shouldCreateOwner.message
      : undefined;

  if (!franchiseId) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-red-900">Missing Franchise Context</p>
            <p className="text-sm text-red-700">
              Please complete Step 1 first to set up the franchise information.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToStepOne}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Step 1
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-gray-900">
            Business Information
          </h3>
          <p className="text-sm text-gray-600">Enter business and owner details</p>
        </div>
      </div>

      <FormSelectInput
        label="Business type"
        name="businessType"
        register={register}
        errors={errors}
        required
        placeholder="Select business type"
        options={BUSINESS_TYPES}
      />

      <FormTextInput
        label="Restaurant name"
        name="restaurantName"
        register={register}
        errors={errors}
        required
        placeholder="Friendly name"
      />

      <FormTextInput
        label="Owner name"
        name="contactName"
        register={register}
        errors={errors}
        placeholder="Point of contact name"
      />

      <FormTextInput
        label="Phone number"
        name="contactPhone"
        register={register}
        errors={errors}
        placeholder="Phone number"
        type="tel"
        required
      />

      <FormTextInput
        label="Email"
        name="contactEmail"
        register={register}
        errors={errors}
        placeholder="owner@restaurant.com"
        type="email"
        autoComplete="email"
      />

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            const nextValue = !shouldCreateOwner;
            setValue('shouldCreateOwner', nextValue, {
              shouldDirty: true,
              shouldValidate: true,
            });

            if (!nextValue) {
              setValue('ownerEmail', '', {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue('ownerPassword', '', {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue('ownerDisplayName', '', {
                shouldDirty: true,
                shouldValidate: false,
              });
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-purple-300 bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {shouldCreateOwner ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            )}
          </svg>
          {shouldCreateOwner ? 'Remove owner details' : 'Add owner'}
        </button>
        {ownerToggleError ? (
          <p className="text-xs text-red-600 font-medium">{ownerToggleError}</p>
        ) : null}
      </div>

      {shouldCreateOwner ? (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900">
                Owner Assignment
              </h4>
              <p className="text-sm text-gray-600">
                Create production owner account and link it to this franchise.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <FormTextInput
              label="Owner email"
              name="ownerEmail"
              register={register}
              errors={errors}
              required
              placeholder="owner@brand.com"
              type="email"
              autoComplete="email"
            />

            <FormTextInput
              label="Owner name"
              name="ownerDisplayName"
              register={register}
              errors={errors}
              placeholder="Owner full name"
            />

            <FormTextInput
              label="Owner password"
              name="ownerPassword"
              register={register}
              errors={errors}
              required
              placeholder="Enter password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              rightAddon={
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((previous) => !previous)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8d9aa6] transition hover:bg-[#f1efff] hover:text-[#4a5d6f]"
                  aria-label={
                    isPasswordVisible ? 'Hide password' : 'Show password'
                  }
                >
                  {isPasswordVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>
              }
            />
          </div>
        </div>
      ) : null}

      {/* <div className="rounded-xl border border-[#e1eaef] bg-[#f9fcfd] px-4 py-3 text-xs text-[#5b6b79]">
        Franchise ID:{' '}
        <span className="font-medium text-[#374151]">{franchiseId}</span>
      </div> */}
    </div>
  );
}

function EyeOpenIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3 21 21" />
      <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
      <path d="M9.4 5.3A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a14 14 0 0 1-3.1 3.9" />
      <path d="M6.2 6.2A14 14 0 0 0 2.5 12s3.5 7 9.5 7a10 10 0 0 0 4.3-.9" />
    </svg>
  );
}
