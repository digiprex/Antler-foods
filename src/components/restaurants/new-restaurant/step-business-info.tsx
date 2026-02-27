'use client';

import { useState } from 'react';
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { FormSelectInput, FormTextInput } from './form-fields';
import type { NewRestaurantFormValues } from './schema';

interface StepBusinessInfoProps {
  control: Control<NewRestaurantFormValues>;
  register: UseFormRegister<NewRestaurantFormValues>;
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
  errors,
  franchiseId,
  onBackToStepOne,
}: StepBusinessInfoProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const deploymentEnvironment =
    useWatch({
      control,
      name: 'deploymentEnvironment',
    }) ?? 'staging';
  const isProduction = deploymentEnvironment === 'production';
  const deploymentEnvironmentError =
    typeof errors.deploymentEnvironment?.message === 'string'
      ? errors.deploymentEnvironment.message
      : undefined;

  if (!franchiseId) {
    return (
      <div className="space-y-4 rounded-xl border border-[#f2c7c7] bg-[#fff5f5] px-4 py-4">
        <p className="text-sm text-[#b33838]">
          Franchise context is missing. Please complete Step 1 first.
        </p>
        <button
          type="button"
          onClick={onBackToStepOne}
          className="rounded-lg border border-[#e3b4b4] bg-white px-3 py-1.5 text-sm font-medium text-[#8f2f2f] transition hover:bg-[#fff0f0]"
        >
          Back to Step 1
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="space-y-1.5">
        <label className="block text-base font-medium text-[#111827]">
          <span className="mr-1 text-[#ef5350]">*</span>
          Environment
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label
            className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
              deploymentEnvironment === 'staging'
                ? 'border-[#667eea] bg-[#ede9fe]'
                : 'border-[#d8e4ea] bg-white hover:bg-[#f9fcfd]'
            }`}
          >
            <input
              type="radio"
              value="staging"
              className="sr-only"
              {...register('deploymentEnvironment')}
            />
            <p className="text-sm font-semibold text-[#111827]">Staging</p>
            <p className="text-xs text-[#5b6b79]">
              Save all business info on this restaurant only.
            </p>
          </label>

          <label
            className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
              deploymentEnvironment === 'production'
                ? 'border-[#667eea] bg-[#ede9fe]'
                : 'border-[#d8e4ea] bg-white hover:bg-[#f9fcfd]'
            }`}
          >
            <input
              type="radio"
              value="production"
              className="sr-only"
              {...register('deploymentEnvironment')}
            />
            <p className="text-sm font-semibold text-[#111827]">Production</p>
            <p className="text-xs text-[#5b6b79]">
              Create owner auth user and assign owner role.
            </p>
          </label>
        </div>
        {deploymentEnvironmentError ? (
          <p className="text-xs text-[#d83f3f]">{deploymentEnvironmentError}</p>
        ) : null}
      </div>

      {isProduction ? (
        <div className="rounded-2xl border border-[#d8e4ea] bg-[#f8fbfd] p-4">
          <h4 className="text-lg font-semibold text-[#111827]">
            Owner assignment
          </h4>
          <p className="mt-1 text-sm text-[#5b6b79]">
            Create production owner account and link it to this franchise.
          </p>

          <div className="mt-4 grid gap-5">
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

            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1c2a39]">
              <input
                type="checkbox"
                {...register('ownerIsLocationPoc')}
                className="h-4 w-4 rounded border-[#cbd8e0] text-[#667eea] focus:ring-[#667eea]"
              />
              Owner is also location POC
            </label>
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
