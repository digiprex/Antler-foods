"use client";

import { useState } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormSelectInput, FormTextInput } from "./form-fields";
import type { NewRestaurantFormValues } from "./schema";

interface StepBusinessInfoProps {
  register: UseFormRegister<NewRestaurantFormValues>;
  errors: FieldErrors<NewRestaurantFormValues>;
}

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "franchise", label: "Franchise" },
  { value: "cloud-kitchen", label: "Cloud Kitchen" },
  { value: "food-truck", label: "Food Truck" },
];

const COUNTRIES = [
  { value: "us", label: "United States" },
  { value: "de", label: "Germany" },
  { value: "uk", label: "United Kingdom" },
];

const STATES = [
  { value: "ca", label: "California" },
  { value: "ny", label: "New York" },
  { value: "tx", label: "Texas" },
  { value: "fl", label: "Florida" },
];

export function StepBusinessInfo({ register, errors }: StepBusinessInfoProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
        label="Legal name"
        name="legalName"
        register={register}
        errors={errors}
        required
        placeholder="Legal name"
      />

      <FormTextInput
        label="Address"
        name="address"
        register={register}
        errors={errors}
        required
        placeholder="Street + number"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <FormTextInput
          label="City"
          name="city"
          register={register}
          errors={errors}
          required
          placeholder="City"
        />
        <FormTextInput
          label="Postal code"
          name="postalCode"
          register={register}
          errors={errors}
          required
          placeholder="Postal code"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FormSelectInput
          label="Country"
          name="country"
          register={register}
          errors={errors}
          required
          placeholder="Select country"
          options={COUNTRIES}
        />
        <FormSelectInput
          label="State"
          name="state"
          register={register}
          errors={errors}
          required
          placeholder="Select state"
          options={STATES}
        />
      </div>

      <FormTextInput
        label="Phone number of contact person"
        name="contactPhone"
        register={register}
        errors={errors}
        required
        placeholder="Phone number"
        type="tel"
        leftAddon={
          <>
            <UsFlagIcon />
            <span className="text-base text-[#111827]">+1</span>
          </>
        }
      />

      <FormTextInput
        label="Email of contact person"
        name="contactEmail"
        register={register}
        errors={errors}
        required
        placeholder="Enter Email"
        type="email"
        autoComplete="email"
      />

      <FormTextInput
        label="Password"
        name="contactPassword"
        register={register}
        errors={errors}
        required
        placeholder="Enter Password"
        type={isPasswordVisible ? "text" : "password"}
        autoComplete="new-password"
        rightAddon={
          <button
            type="button"
            onClick={() => setIsPasswordVisible((previous) => !previous)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8d9aa6] transition hover:bg-[#f2f7f4] hover:text-[#4a5d6f]"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
          </button>
        }
      />
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

function UsFlagIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-6 rounded-sm border border-[#d4dde4]"
      viewBox="0 0 24 16"
    >
      <rect width="24" height="16" fill="#fff" />
      <rect y="0" width="24" height="2" fill="#d22d3a" />
      <rect y="4" width="24" height="2" fill="#d22d3a" />
      <rect y="8" width="24" height="2" fill="#d22d3a" />
      <rect y="12" width="24" height="2" fill="#d22d3a" />
      <rect width="10" height="8" fill="#1f4ea5" />
    </svg>
  );
}
