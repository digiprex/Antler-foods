"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { StepAdditionalRestaurants } from "./step-additional-restaurants";
import { StepBusinessInfo } from "./step-business-info";
import { StepRestaurantInfo } from "./step-restaurant-info";
import {
  STEP_ONE_FIELDS,
  STEP_TWO_FIELDS,
  newRestaurantSchema,
  stepOneSchema,
  stepTwoSchema,
  type NewRestaurantFormValues,
} from "./schema";
import { Stepper } from "./stepper";
import { insertRestaurant, updateRestaurant } from "@/lib/graphql/queries";
import { nhost } from "@/lib/nhost";

type WizardStep = 1 | 2 | 3;
const IS_DEV = process.env.NODE_ENV !== "production";

function debugLog(label: string, data?: unknown) {
  if (!IS_DEV) {
    return;
  }

  if (typeof data === "undefined") {
    console.info(`[restaurant-wizard] ${label}`);
    return;
  }

  console.info(`[restaurant-wizard] ${label}`, data);
}

export function NewRestaurantWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRestaurantId, setCreatedRestaurantId] = useState<string | null>(null);
  const [isSavingStepOne, setIsSavingStepOne] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    clearErrors,
    setError,
    setFocus,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewRestaurantFormValues>({
    resolver: zodResolver(newRestaurantSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      ownerProfileMode: "create",
      existingBusinessProfile: "",
      googlePlaceId: "",
      googlePlaceName: "",
      googleLat: null,
      googleLng: null,
      selectedCuisineTypeIds: [],
      selectedCuisineTypeLabels: [],
      selectedServiceModelId: "",
      selectedServiceModelName: "",
      isPartOfFranchise: false,
      importMenu: false,
      businessType: "",
      restaurantName: "",
      legalName: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      state: "",
      contactPhone: "",
      contactEmail: "",
      contactPassword: "",
    },
  });

  const watchedValues = useWatch({ control });
  const isStepOneComplete = useMemo(
    () => stepOneSchema.safeParse(watchedValues).success,
    [watchedValues],
  );
  const isStepTwoComplete = useMemo(
    () => stepTwoSchema.safeParse(watchedValues).success,
    [watchedValues],
  );

  const setStepErrors = (
    fieldNames: readonly string[],
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    const availableFields = new Set(fieldNames);
    let firstInvalidField: FieldPath<NewRestaurantFormValues> | null = null;

    issues.forEach((issue) => {
      const firstPathSegment = issue.path[0];

      if (typeof firstPathSegment !== "string" || !availableFields.has(firstPathSegment)) {
        return;
      }

      const field = firstPathSegment as FieldPath<NewRestaurantFormValues>;

      if (!firstInvalidField) {
        firstInvalidField = field;
      }

      setError(field, { type: "manual", message: issue.message });
    });

    if (firstInvalidField) {
      setFocus(firstInvalidField);
    }
  };

  const validateStep = async (step: Exclude<WizardStep, 3>) => {
    const fields = step === 1 ? STEP_ONE_FIELDS : STEP_TWO_FIELDS;
    clearErrors([...fields]);

    const values = getValues();
    const result = (step === 1 ? stepOneSchema : stepTwoSchema).safeParse(values);

    if (result.success) {
      return {
        isValid: true as const,
        issues: [] as Array<{ path: string; message: string }>,
      };
    }

    setStepErrors(fields, result.error.issues);
    return {
      isValid: false as const,
      issues: result.error.issues
        .map((issue) => {
          const path = issue.path[0];
          return {
            path: typeof path === "string" ? path : "unknown",
            message: issue.message,
          };
        })
        .filter((issue) => issue.path !== "unknown"),
    };
  };

  const onContinue = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    debugLog("continue:clicked", { currentStep });

    if (currentStep === 1) {
      const validation = await validateStep(1);

      if (!validation.isValid) {
        const message = validation.issues[0]?.message ?? "Please complete required fields in step 1.";
        setErrorMessage(message);
        debugLog("continue:step1-blocked-by-validation", validation.issues);
        return;
      }

      const values = getValues();
      debugLog("continue:step1-values", values);
      if (values.ownerProfileMode === "existing") {
        setCurrentStep(2);
        return;
      }

      try {
        setIsSavingStepOne(true);

        const accessToken = await nhost.auth.getAccessToken();
        if (!accessToken) {
          setErrorMessage("Your session has expired. Please login again and retry.");
          debugLog("continue:step1-missing-access-token");
          return;
        }

        const payload = buildRestaurantPayload(values);
        if (!payload.user_id) {
          debugLog("continue:step1-user-id-missing-in-payload");
        }
        console.log("[restaurant-wizard] step1 continue payload", payload);
        debugLog("continue:step1-payload", payload);
        if (createdRestaurantId) {
          await updateRestaurant(createdRestaurantId, payload);
          console.log("[restaurant-wizard] step1 continue updated", { createdRestaurantId });
          debugLog("continue:step1-updated-existing-row", { createdRestaurantId });
        } else {
          const inserted = await insertRestaurant(payload);
          console.log("[restaurant-wizard] step1 continue insert result", inserted);
          debugLog("continue:step1-insert-result", inserted);
          if (inserted.primaryKey) {
            setCreatedRestaurantId(inserted.primaryKey);
          }
        }

        setSuccessMessage("Restaurant step 1 details saved.");
        setCurrentStep(2);
      } catch (caughtError) {
        console.error("[restaurant-wizard] step1 continue failed", caughtError);
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to save restaurant details from step 1.";
        setErrorMessage(message);
      } finally {
        setIsSavingStepOne(false);
      }

      return;
    }

    if (currentStep === 2) {
      const validation = await validateStep(2);

      if (validation.isValid) {
        setCurrentStep(3);
        return;
      }

      const message = validation.issues[0]?.message ?? "Please complete required fields in step 2.";
      setErrorMessage(message);
      debugLog("continue:step2-blocked-by-validation", validation.issues);
    }
  };

  const onStepSelect = async (nextStep: WizardStep) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    if (nextStep === currentStep) {
      return;
    }

    if (nextStep < currentStep) {
      setCurrentStep(nextStep);
      return;
    }

    for (let step = currentStep; step < nextStep; step += 1) {
      const stepToValidate = step as Exclude<WizardStep, 3>;
      const isValid = await validateStep(stepToValidate);

      if (!isValid) {
        if (currentStep !== stepToValidate) {
          setCurrentStep(stepToValidate);
        }

        return;
      }
    }

    setCurrentStep(nextStep);
  };

  const onBack = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setCurrentStep((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  };

  const onCreateRestaurant = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const accessToken = await nhost.auth.getAccessToken();
      if (!accessToken) {
        setErrorMessage("Your session has expired. Please login again and retry.");
        debugLog("submit:missing-access-token");
        return;
      }

      const payload = buildRestaurantPayload(values);
      if (!payload.user_id) {
        debugLog("submit:user-id-missing-in-payload");
      }
      console.log("[restaurant-wizard] submit payload", payload);
      debugLog("submit:payload", payload);
      if (createdRestaurantId) {
        await updateRestaurant(createdRestaurantId, payload);
        console.log("[restaurant-wizard] submit updated", { createdRestaurantId });
        debugLog("submit:updated-existing-row", { createdRestaurantId });
      } else {
        const inserted = await insertRestaurant(payload);
        console.log("[restaurant-wizard] submit insert result", inserted);
        debugLog("submit:insert-result", inserted);
        if (inserted.primaryKey) {
          setCreatedRestaurantId(inserted.primaryKey);
        }
      }

      setSuccessMessage("Restaurant saved successfully.");
    } catch (caughtError) {
      console.error("[restaurant-wizard] submit failed", caughtError);
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create restaurant.";
      setErrorMessage(message);
    }
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-[#d7e2e6] bg-white">
      <div className="border-b border-[#d8e3e7] px-8 py-5">
        <h2 className="text-[28px] font-semibold text-[#111827]">New restaurant</h2>
      </div>

      <div className="space-y-6 p-8">
        <Stepper
          currentStep={currentStep}
          isStepOneComplete={isStepOneComplete}
          isStepTwoComplete={isStepTwoComplete}
          onStepSelect={onStepSelect}
        />

        {successMessage ? (
          <div className="rounded-xl border border-[#bce4cb] bg-[#ebf9ef] px-4 py-3 text-sm text-[#2b7a45]">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-[#f2c7c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#b33838]">
            {errorMessage}
          </div>
        ) : null}

        {currentStep === 1 ? (
          <StepRestaurantInfo
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            onContinueFromPanel={onContinue}
            isContinuingFromPanel={isSavingStepOne}
            panelErrorMessage={errorMessage}
          />
        ) : null}

        {currentStep === 2 ? (
          <StepBusinessInfo register={register} errors={errors} />
        ) : null}

        {currentStep === 3 ? <StepAdditionalRestaurants control={control} /> : null}
      </div>

      <div className="flex justify-end border-t border-[#d8e3e7] bg-[#f3f7f9] px-8 py-5">
        <div className="flex items-center gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-[#d2dee4] bg-white px-5 py-2 text-[18px] font-medium text-[#111827] transition hover:bg-[#f7fafc]"
            >
              Back
            </button>
          ) : null}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={onContinue}
              disabled={currentStep === 1 && isSavingStepOne}
              className="rounded-xl bg-[#60c783] px-6 py-2 text-[18px] font-semibold text-white transition hover:bg-[#55bb77] disabled:cursor-not-allowed disabled:bg-[#c7d8ce]"
            >
              {currentStep === 1 && isSavingStepOne ? "Saving..." : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreateRestaurant}
              disabled={!isStepOneComplete || !isStepTwoComplete || isSubmitting}
              className="rounded-xl bg-[#60c783] px-6 py-2 text-[18px] font-semibold text-white transition hover:bg-[#55bb77] disabled:cursor-not-allowed disabled:bg-[#c7d8ce] disabled:text-[#f4f7f5]"
            >
              {isSubmitting ? "Submitting..." : "Submit restaurant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildRestaurantPayload(values: NewRestaurantFormValues) {
  const currentUser = nhost.auth.getUser();
  const selectedCuisineValues =
    values.selectedCuisineTypeLabels.length > 0
      ? values.selectedCuisineTypeLabels
      : values.selectedCuisineTypeIds;
  const trimmedRestaurantName = values.restaurantName.trim();
  const trimmedLegalName = values.legalName.trim();
  const trimmedContactPhone = values.contactPhone.trim();
  const trimmedContactEmail = values.contactEmail.trim();
  const payload: Record<string, unknown> = {
    name: trimmedRestaurantName,
    service_model:
      values.selectedServiceModelName?.trim() || values.selectedServiceModelId || "",
    cuisine_types: selectedCuisineValues,
    user_id: currentUser?.id ?? null,
    // Keep step-1 save compatible with schemas where these columns are NOT NULL.
    phone_number: trimmedContactPhone || "",
    email: trimmedContactEmail || "",
    sms_name: trimmedLegalName || trimmedRestaurantName || "",
    poc_phone_number: trimmedContactPhone || "",
    poc_email: trimmedContactEmail || "",
    poc_name: trimmedLegalName || trimmedRestaurantName || "",
  };

  const gmbLink = values.googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${values.googlePlaceId}`
    : "";
  if (gmbLink) {
    payload.gmb_link = gmbLink;
  }

  return payload;
}
