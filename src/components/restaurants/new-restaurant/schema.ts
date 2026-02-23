import { z } from "zod";

const phoneRegex = /^\+?[0-9()\-\s]{7,20}$/;
const requiredText = (label: string) => z.string().min(1, `${label} is required.`);

export const stepOneSchema = z
  .object({
    ownerProfileMode: z.enum(["create", "existing"]),
    existingBusinessProfile: z.string().optional(),
    restaurantName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    isPartOfFranchise: z.boolean(),
    selectedCuisineTypeIds: z.array(z.string()),
    selectedCuisineTypeLabels: z.array(z.string()),
    selectedServiceModelId: z.string().optional(),
    selectedServiceModelName: z.string().optional(),
    importMenu: z.boolean(),
    googlePlaceId: z.string().optional(),
    googlePlaceName: z.string().optional(),
    googleLat: z.number().nullable().optional(),
    googleLng: z.number().nullable().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.ownerProfileMode === "existing" && !values.existingBusinessProfile?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["existingBusinessProfile"],
        message: "Please select an existing business profile.",
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

export const stepTwoSchema = z.object({
  businessType: requiredText("Business type"),
  restaurantName: requiredText("Restaurant name"),
  legalName: requiredText("Legal name"),
  address: requiredText("Address"),
  city: requiredText("City"),
  postalCode: requiredText("Postal code"),
  country: requiredText("Country"),
  state: requiredText("State"),
  contactPhone: z
    .string()
    .min(1, "Phone number is required.")
    .regex(phoneRegex, "Enter a valid phone number."),
  contactEmail: z.string().min(1, "Email is required.").email("Enter a valid email."),
  contactPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export const newRestaurantSchema = stepOneSchema.and(stepTwoSchema);

export type NewRestaurantFormValues = z.infer<typeof stepOneSchema> &
  z.infer<typeof stepTwoSchema>;

export const STEP_ONE_FIELDS = [
  "ownerProfileMode",
  "existingBusinessProfile",
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
  "legalName",
  "address",
  "city",
  "postalCode",
  "country",
  "state",
  "contactPhone",
  "contactEmail",
  "contactPassword",
] as const;
