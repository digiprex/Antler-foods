import { z } from "zod";

const phoneRegex = /^\+?[0-9()\-\s]{7,20}$/;
const requiredText = (label: string) => z.string().min(1, `${label} is required.`);

export const stepOneSchema = z
  .object({
    ownerProfileMode: z.enum(["create", "existing"]),
    franchiseName: z.string(),
    selectedFranchiseId: z.string(),
    restaurantName: z.string(),
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
    state: z.string(),
    isPartOfFranchise: z.boolean(),
    selectedCuisineTypeIds: z.array(z.string()),
    selectedCuisineTypeLabels: z.array(z.string()),
    selectedServiceModelId: z.string(),
    selectedServiceModelName: z.string(),
    importMenu: z.boolean(),
    googlePlaceId: z.string(),
    googlePlaceName: z.string(),
    googleLat: z.number().nullable().optional(),
    googleLng: z.number().nullable().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.ownerProfileMode === "existing" && !values.selectedFranchiseId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedFranchiseId"],
        message: "Please select an existing franchise.",
      });
    }

    if (values.ownerProfileMode !== "create") {
      return;
    }

    const createModeRequiredFields: Array<{ key: keyof typeof values; label: string }> = [
      { key: "restaurantName", label: "Restaurant name" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "postalCode", label: "Postal code" },
      { key: "country", label: "Country" },
      { key: "state", label: "State" },
      { key: "selectedServiceModelId", label: "Restaurant type and service model" },
    ];

    createModeRequiredFields.forEach(({ key, label }) => {
      const value = values[key];
      if (typeof value !== "string" || !value.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${label} is required.`,
        });
      }
    });
  });

export const stepTwoSchema = z
  .object({
    businessType: requiredText("Business type"),
    restaurantName: requiredText("Restaurant name"),
    contactName: z.string(),
    contactPhone: z
      .string()
      .min(1, "Phone number of contact person is required.")
      .refine(
        (value) => phoneRegex.test(value.trim()),
        "Enter a valid phone number.",
      ),
    contactEmail: z
      .string()
      .trim()
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        "Enter a valid email.",
      ),
    deploymentEnvironment: z.enum(["staging", "production"]),
    ownerEmail: z.string(),
    ownerPassword: z.string(),
    ownerDisplayName: z.string(),
    ownerIsLocationPoc: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.deploymentEnvironment !== "production") {
      return;
    }

    if (!values.ownerEmail.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerEmail"],
        message: "Owner email is required for production.",
      });
    } else if (!z.string().email().safeParse(values.ownerEmail.trim()).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerEmail"],
        message: "Enter a valid owner email.",
      });
    }

    if (!values.ownerPassword.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerPassword"],
        message: "Owner password is required for production.",
      });
    } else if (values.ownerPassword.trim().length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerPassword"],
        message: "Owner password must be at least 8 characters.",
      });
    }
  });

export const newRestaurantSchema = stepOneSchema.and(stepTwoSchema);

export type NewRestaurantFormValues = z.infer<typeof stepOneSchema> &
  z.infer<typeof stepTwoSchema>;

export const STEP_ONE_FIELDS = [
  "ownerProfileMode",
  "franchiseName",
  "selectedFranchiseId",
  "restaurantName",
  "address",
  "city",
  "postalCode",
  "country",
  "state",
  "isPartOfFranchise",
  "selectedCuisineTypeIds",
  "selectedCuisineTypeLabels",
  "selectedServiceModelId",
  "selectedServiceModelName",
  "importMenu",
  "googlePlaceId",
  "googlePlaceName",
  "googleLat",
  "googleLng",
] as const;

export const STEP_TWO_FIELDS = [
  "businessType",
  "restaurantName",
  "contactName",
  "contactPhone",
  "contactEmail",
  "deploymentEnvironment",
  "ownerEmail",
  "ownerPassword",
  "ownerDisplayName",
  "ownerIsLocationPoc",
] as const;
