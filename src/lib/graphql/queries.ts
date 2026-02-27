import { fetchGraphQL } from "./client";

export interface CuisineType {
  id: string;
  label: string;
}

export interface CuisineTypeCategory {
  id: string;
  label: string;
  cuisineTypes: CuisineType[];
}

export interface ServiceModel {
  id: string;
  name: string;
  description: string;
}

export interface RestaurantListItem {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  customDomain: string;
  stagingDomain: string;
  serviceModel: string;
  cuisineTypes: string[];
  phoneNumber: string;
  email: string;
  createdAt: string | null;
  isDeleted: boolean | null;
}

export interface RestaurantDraftItem {
  id: string;
  franchiseId: string | null;
  name: string;
  serviceModel: string;
  cuisineTypes: string[];
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  businessType: string;
  contactName: string;
  phoneNumber: string;
  email: string;
  smsName: string;
  pocPhoneNumber: string;
  pocEmail: string;
  googlePlaceId: string;
  gmbLink: string;
  facebookLink: string;
  instagramLink: string;
  xLink: string;
  tiktokLink: string;
  youtubeLink: string;
  yelpLink: string;
  ubereatsLink: string;
  grubhubLink: string;
  doordashLink: string;
  logo: string;
  logoFileId: string;
  isDeleted: boolean | null;
}

export interface FranchiseListItem {
  id: string;
  name: string;
}

type CuisineCategoryVariant = {
  idField: string;
  labelField: string;
};

type CuisineTypeVariant = {
  idField: string;
  labelField: string;
  categoryField: string;
};

const CUISINE_CATEGORY_VARIANTS: CuisineCategoryVariant[] = [
  { idField: "category_id", labelField: "name" },
  { idField: "category_id", labelField: "label" },
  { idField: "cuisine_types_category_id", labelField: "name" },
  { idField: "cuisine_types_category_id", labelField: "label" },
  { idField: "id", labelField: "label" },
  { idField: "id", labelField: "name" },
];

const CUISINE_TYPE_VARIANTS: CuisineTypeVariant[] = [
  { idField: "name", labelField: "name", categoryField: "category_id" },
  { idField: "name", labelField: "label", categoryField: "category_id" },
  {
    idField: "name",
    labelField: "name",
    categoryField: "cuisine_types_category_id",
  },
  {
    idField: "name",
    labelField: "label",
    categoryField: "cuisine_types_category_id",
  },
  { idField: "id", labelField: "name", categoryField: "category_id" },
  { idField: "id", labelField: "label", categoryField: "category_id" },
  { idField: "id", labelField: "name", categoryField: "cuisine_types_category_id" },
  { idField: "id", labelField: "label", categoryField: "cuisine_types_category_id" },
  { idField: "cuisine_type_id", labelField: "name", categoryField: "category_id" },
  { idField: "cuisine_type_id", labelField: "label", categoryField: "category_id" },
  {
    idField: "cuisine_type_id",
    labelField: "name",
    categoryField: "cuisine_types_category_id",
  },
  {
    idField: "cuisine_type_id",
    labelField: "label",
    categoryField: "cuisine_types_category_id",
  },
  {
    idField: "cuisine_types_id",
    labelField: "name",
    categoryField: "cuisine_types_category_id",
  },
  {
    idField: "cuisine_types_id",
    labelField: "label",
    categoryField: "cuisine_types_category_id",
  },
  {
    idField: "cuisine_types_id",
    labelField: "name",
    categoryField: "cuisine_type_category_id",
  },
  {
    idField: "cuisine_types_id",
    labelField: "label",
    categoryField: "cuisine_type_category_id",
  },
];

export const GetServiceModels = `
  query GetServiceModels {
    service_model(where: { is_deleted: { _eq: false } }, order_by: { name: asc }) {
      id
      name
      description
    }
  }
`;

export const ListFranchises = `
  query ListFranchises {
    franchises(where: { is_deleted: { _eq: false } }, order_by: { name: asc }) {
      id
      name
    }
  }
`;

export const InsertFranchise = `
  mutation InsertFranchise($object: franchises_insert_input!) {
    insert_franchises_one(object: $object) {
      id
      name
    }
  }
`;

export const UpdateFranchiseBusinessInfo = `
  mutation UpdateFranchiseBusinessInfo($id: uuid!, $set: franchises_set_input!) {
    update_franchises_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const UpdateFranchiseOwner = `
  mutation UpdateFranchiseOwner($id: uuid!, $ownerUserId: uuid!) {
    update_franchises_by_pk(
      pk_columns: { id: $id }
      _set: { owner_user_id: $ownerUserId }
    ) {
      id
      owner_user_id
    }
  }
`;

const DELETE_RESTAURANT_GOOGLE_REVIEWS = `
  mutation DeleteRestaurantGoogleReviews($restaurantId: uuid!) {
    delete_reviews(
      where: {
        restaurant_id: { _eq: $restaurantId }
        source: { _eq: "google" }
      }
    ) {
      affected_rows
    }
  }
`;

const INSERT_reviews = `
  mutation InsertRestaurantReviews($objects: [reviews_insert_input!]!) {
    insert_reviews(objects: $objects) {
      affected_rows
    }
  }
`;

const INSERT_RESTAURANT_VARIANTS = [
  {
    outputField: "restaurant_id",
    query: `
      mutation InsertRestaurantWithRestaurantId($object: restaurants_insert_input!) {
        insert_restaurants_one(object: $object) {
          restaurant_id
        }
      }
    `,
  },
  {
    outputField: "__typename",
    query: `
      mutation InsertRestaurantFallback($object: restaurants_insert_input!) {
        insert_restaurants_one(object: $object) {
          __typename
        }
      }
    `,
  },
] as const;

const UPDATE_RESTAURANT_VARIANTS = [
  {
    pkField: "restaurant_id",
    query: `
      mutation UpdateRestaurantByRestaurantId($restaurantId: uuid!, $changes: restaurants_set_input!) {
        update_restaurants_by_pk(pk_columns: { restaurant_id: $restaurantId }, _set: $changes) {
          __typename
        }
      }
    `,
  },
] as const;

type RestaurantsListVariant = {
  query: string;
  idField: string;
};

const RESTAURANTS_LIST_VARIANTS: RestaurantsListVariant[] = [
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantsWithRestaurantId {
        restaurants(order_by: { created_at: desc }) {
          restaurant_id
          name
          poc_name
          poc_email
          custom_domain
          staging_domain
          service_model
          cuisine_types
          phone_number
          email
          created_at
          is_deleted
        }
      }
    `,
  },
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantsWithoutCreatedAt {
        restaurants {
          restaurant_id
          name
          poc_name
          poc_email
          custom_domain
          staging_domain
          service_model
          cuisine_types
          phone_number
          email
          is_deleted
        }
      }
    `,
  },
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantsWithCustomerDomainAlias {
        restaurants {
          restaurant_id
          name
          poc_name
          poc_email
          custom_domain: customer_domain
          staging_domain
          service_model
          cuisine_types
          phone_number
          email
          created_at
          is_deleted
        }
      }
    `,
  },
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantsWithCustomerDomianAlias {
        restaurants {
          restaurant_id
          name
          poc_name
          poc_email
          custom_domain: customer_domian
          staging_domain
          service_model
          cuisine_types
          phone_number
          email
          created_at
          is_deleted
        }
      }
    `,
  },
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantsMinimalWithRestaurantId {
        restaurants {
          restaurant_id
          name
        }
      }
    `,
  },
];

type RestaurantDraftVariant = {
  idField: string;
  query: string;
};

const RESTAURANT_DRAFT_VARIANTS: RestaurantDraftVariant[] = [
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantDraftByRestaurantId($restaurantId: uuid!) {
        restaurants(where: { restaurant_id: { _eq: $restaurantId } }, limit: 1) {
          restaurant_id
          franchise_id
          name
          address
          city
          state
          country
          postal_code
          business_type
          service_model
          cuisine_types
          phone_number
          email
          sms_name
          poc_name
          poc_phone_number
          poc_email
          google_place_id
          gmb_link
          fb_link
          insta_link
          yt_link
          tiktok_link
          yelp_link
          ubereats_link
          grubhub_link
          doordash_link
          logo
          logo_file_id
          is_deleted
        }
      }
    `,
  },
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantDraftByRestaurantIdWithoutLogoFileId($restaurantId: uuid!) {
        restaurants(where: { restaurant_id: { _eq: $restaurantId } }, limit: 1) {
          restaurant_id
          franchise_id
          name
          address
          city
          state
          country
          postal_code
          business_type
          service_model
          cuisine_types
          phone_number
          email
          sms_name
          poc_name
          poc_phone_number
          poc_email
          google_place_id
          gmb_link
          fb_link
          insta_link
          yt_link
          tiktok_link
          yelp_link
          ubereats_link
          grubhub_link
          doordash_link
          logo
          is_deleted
        }
      }
    `,
  },
  {
    idField: "restaurant_id",
    query: `
      query GetRestaurantDraftMinimalByRestaurantId($restaurantId: uuid!) {
        restaurants(where: { restaurant_id: { _eq: $restaurantId } }, limit: 1) {
          restaurant_id
          franchise_id
          name
        }
      }
    `,
  },
];

interface CuisineCategoriesQueryResponse {
  cuisine_types_categories: Array<Record<string, unknown>>;
}

interface CuisineTypesQueryResponse {
  cuisine_types: Array<Record<string, unknown>>;
}

interface ServiceModelsQueryResponse {
  service_model: Array<{
    id: string;
    name?: string | null;
    description?: string | null;
  }>;
}

interface FranchisesListQueryResponse {
  franchises: Array<{
    id?: string | null;
    name?: string | null;
  }>;
}

interface RestaurantsListQueryResponse {
  restaurants: Array<Record<string, unknown>>;
}

interface InsertRestaurantResponse {
  insert_restaurants_one: Record<string, unknown> | null;
}

interface InsertFranchiseResponse {
  insert_franchises_one: {
    id?: string | null;
    name?: string | null;
  } | null;
}

interface UpdateRestaurantResponse {
  update_restaurants_by_pk: Record<string, unknown> | null;
}

interface UpdateFranchiseResponse {
  update_franchises_by_pk: {
    id?: string | null;
    owner_user_id?: string | null;
  } | null;
}

interface DeleteRestaurantReviewsResponse {
  delete_reviews: {
    affected_rows?: number | null;
  } | null;
}

interface InsertRestaurantReviewsResponse {
  insert_reviews: {
    affected_rows?: number | null;
  } | null;
}

export interface InsertRestaurantResult {
  primaryKey: string | null;
  row: Record<string, unknown>;
}

export interface RestaurantReviewUpsertInput {
  source: string;
  external_review_id?: string | null;
  rating: number;
  author_name?: string | null;
  review_text?: string | null;
  author_url?: string | null;
  review_url?: string | null;
  avatar_url?: string | null;
  avatar_file_id?: string | null;
  published_at?: string | null;
  is_hidden?: boolean;
  created_by_user_id?: string | null;
}

const IS_DEV = process.env.NODE_ENV !== "production";

function debugMutationLog(label: string, data?: unknown) {
  if (!IS_DEV) {
    return;
  }

  if (typeof data === "undefined") {
    console.info(`[restaurant-mutation] ${label}`);
    return;
  }

  console.info(`[restaurant-mutation] ${label}`, data);
}

export async function getCuisineCategories() {
  const categoriesData = await fetchCuisineCategories();
  const categories = categoriesData.cuisine_types_categories;
  const cuisineTypes = await fetchCuisineTypes();
  const cuisineTypesByCategory = new Map<string, CuisineType[]>();

  cuisineTypes.forEach((type) => {
    if (!type.categoryId) {
      return;
    }

    const entry = cuisineTypesByCategory.get(type.categoryId) ?? [];
    entry.push({ id: type.id, label: type.label });
    cuisineTypesByCategory.set(type.categoryId, entry);
  });

  return categories.map((category) => {
    const categoryTypes = [...(cuisineTypesByCategory.get(category.id) ?? [])].sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    return {
      id: category.id,
      label: category.label,
      cuisineTypes: categoryTypes,
    };
  });
}

export async function getServiceModels() {
  const data = await fetchGraphQL<ServiceModelsQueryResponse>(GetServiceModels);

  return data.service_model.map((item) => ({
    id: item.id,
    name: item.name?.trim() || "Unnamed Service Model",
    description: item.description?.trim() || "",
  }));
}

export async function getFranchises() {
  const data = await fetchGraphQL<FranchisesListQueryResponse>(ListFranchises);

  return data.franchises
    .map((item) => {
      if (typeof item.id !== "string" || !item.id.trim()) {
        return null;
      }

      return {
        id: item.id,
        name: normalizeText(item.name, "Unnamed franchise"),
      } satisfies FranchiseListItem;
    })
    .filter((item): item is FranchiseListItem => Boolean(item));
}

export async function getRestaurants() {
  const errorMessages = new Set<string>();

  for (const variant of RESTAURANTS_LIST_VARIANTS) {
    try {
      const data = await fetchGraphQL<RestaurantsListQueryResponse>(variant.query);
      const parsed = parseRestaurants(data.restaurants, variant.idField);
      if (parsed.length) {
        return parsed
          .filter((item) => item.isDeleted !== true)
          .sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return b.createdAt.localeCompare(a.createdAt);
            }

            if (a.createdAt) {
              return -1;
            }

            if (b.createdAt) {
              return 1;
            }

            return a.name.localeCompare(b.name);
          });
      }

      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown query error";
      errorMessages.add(message);
    }
  }

  throw new Error(`Unable to load restaurants. ${Array.from(errorMessages).join(" | ")}`);
}

export async function getRestaurantDraftById(restaurantId: string) {
  if (!restaurantId?.trim()) {
    throw new Error("Restaurant draft id is required.");
  }

  const errorMessages = new Set<string>();

  for (const variant of RESTAURANT_DRAFT_VARIANTS) {
    try {
      const data = await fetchGraphQL<RestaurantsListQueryResponse>(variant.query, {
        restaurantId,
      });
      const parsed = parseRestaurantDraft(data.restaurants, variant.idField);

      if (!parsed) {
        return null;
      }

      if (parsed.isDeleted) {
        return null;
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown query error";
      errorMessages.add(message);
    }
  }

  throw new Error(
    `Unable to load restaurant draft. ${Array.from(errorMessages).join(" | ")}`,
  );
}

async function fetchCuisineCategories() {
  const errorMessages = new Set<string>();

  for (const variant of CUISINE_CATEGORY_VARIANTS) {
    try {
      const data = await fetchGraphQL<CuisineCategoriesQueryResponse>(
        buildCuisineCategoriesQuery(variant),
      );
      const parsed = parseCuisineCategories(data.cuisine_types_categories, variant);
      if (parsed.length) {
        return {
          cuisine_types_categories: parsed.sort((a, b) => a.label.localeCompare(b.label)),
        };
      }

      errorMessages.add(
        `No categories from fields (${variant.idField}, ${variant.labelField}).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown query error";
      errorMessages.add(message);
    }
  }

  throw new Error(
    `Unable to load cuisine category metadata. ${Array.from(errorMessages).join(" | ")}`,
  );
}

async function fetchCuisineTypes() {
  const errorMessages = new Set<string>();

  for (const variant of CUISINE_TYPE_VARIANTS) {
    try {
      const data = await fetchGraphQL<CuisineTypesQueryResponse>(buildCuisineTypesQuery(variant));
      const parsed = parseCuisineTypes(data.cuisine_types, variant);
      if (parsed.length) {
        return parsed.sort((a, b) => a.label.localeCompare(b.label));
      }

      errorMessages.add(
        `No cuisine types from fields (${variant.idField}, ${variant.labelField}, ${variant.categoryField}).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown query error";
      errorMessages.add(message);
    }
  }

  throw new Error(`Unable to load cuisine types. ${Array.from(errorMessages).join(" | ")}`);
}

function buildCuisineCategoriesQuery(variant: CuisineCategoryVariant) {
  return `
    query GetCuisineTypeCategoriesVariant {
      cuisine_types_categories {
        ${variant.idField}
        ${variant.labelField}
      }
    }
  `;
}

function buildCuisineTypesQuery(variant: CuisineTypeVariant) {
  return `
    query GetCuisineTypesVariant {
      cuisine_types {
        ${variant.idField}
        ${variant.labelField}
        ${variant.categoryField}
      }
    }
  `;
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function normalizeTextFromFieldCandidates(
  row: Record<string, unknown>,
  candidates: string[],
  fallback = "",
) {
  for (const candidate of candidates) {
    const value = row[candidate];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function normalizeNullableText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function normalizeRating(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 5;
  }

  const rounded = Math.round(value);
  if (rounded < 1) {
    return 1;
  }
  if (rounded > 5) {
    return 5;
  }
  return rounded;
}

function parseCuisineCategories(
  rows: Array<Record<string, unknown>>,
  variant: CuisineCategoryVariant,
) {
  const byId = new Map<string, { id: string; label: string }>();

  rows.forEach((row) => {
    const idValue = row[variant.idField];
    if (typeof idValue !== "string" || !idValue) {
      return;
    }

    byId.set(idValue, {
      id: idValue,
      label: normalizeText(row[variant.labelField], "Untitled category"),
    });
  });

  return Array.from(byId.values());
}

function parseCuisineTypes(rows: Array<Record<string, unknown>>, variant: CuisineTypeVariant) {
  const byId = new Map<string, { id: string; label: string; categoryId: string }>();

  rows.forEach((row) => {
    const idValue = row[variant.idField];
    const categoryValue = row[variant.categoryField];
    if (typeof idValue !== "string" || !idValue) {
      return;
    }

    if (typeof categoryValue !== "string" || !categoryValue) {
      return;
    }

    const uniqueKey = `${idValue}::${categoryValue}`;
    byId.set(uniqueKey, {
      id: idValue,
      label: normalizeText(row[variant.labelField], "Untitled cuisine"),
      categoryId: categoryValue,
    });
  });

  return Array.from(byId.values());
}

function parseRestaurants(rows: Array<Record<string, unknown>>, idField: string) {
  return rows
    .map((row) => {
      const rawId = row[idField];
      if (typeof rawId !== "string" || !rawId.trim()) {
        return null;
      }

      return {
        id: rawId,
        name: normalizeText(row.name, "Unnamed restaurant"),
        ownerName: normalizeTextFromFieldCandidates(row, ["poc_name", "owner_name"]),
        ownerEmail: normalizeTextFromFieldCandidates(row, [
          "poc_email",
          "owner_email",
          "email",
        ]),
        customDomain: normalizeTextFromFieldCandidates(row, [
          "custom_domain",
          "customer_domain",
          "customer_domian",
        ]),
        stagingDomain: normalizeTextFromFieldCandidates(row, ["staging_domain"]),
        serviceModel: normalizeText(row.service_model, ""),
        cuisineTypes: normalizeCuisineTypes(row.cuisine_types),
        phoneNumber: normalizeText(row.phone_number, ""),
        email: normalizeText(row.email, ""),
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        isDeleted: typeof row.is_deleted === "boolean" ? row.is_deleted : null,
      } satisfies RestaurantListItem;
    })
    .filter((item): item is RestaurantListItem => Boolean(item));
}

function parseRestaurantDraft(rows: Array<Record<string, unknown>>, idField: string) {
  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  const rawId = firstRow[idField];
  if (typeof rawId !== "string" || !rawId.trim()) {
    return null;
  }

  return {
    id: rawId,
    franchiseId:
      typeof firstRow.franchise_id === "string" && firstRow.franchise_id.trim()
        ? firstRow.franchise_id
        : null,
    name: normalizeText(firstRow.name, ""),
    address: normalizeText(firstRow.address, ""),
    city: normalizeText(firstRow.city, ""),
    state: normalizeText(firstRow.state, ""),
    country: normalizeText(firstRow.country, ""),
    postalCode: normalizeText(firstRow.postal_code, ""),
    businessType: normalizeText(firstRow.business_type, ""),
    contactName: normalizeText(firstRow.poc_name, ""),
    serviceModel: normalizeText(firstRow.service_model, ""),
    cuisineTypes: normalizeCuisineTypes(firstRow.cuisine_types),
    phoneNumber: normalizeText(firstRow.phone_number, ""),
    email: normalizeText(firstRow.email, ""),
    smsName: normalizeText(firstRow.sms_name, ""),
    pocPhoneNumber: normalizeText(firstRow.poc_phone_number, ""),
    pocEmail: normalizeText(firstRow.poc_email, ""),
    googlePlaceId: normalizeText(firstRow.google_place_id, ""),
    gmbLink: normalizeText(firstRow.gmb_link, ""),
    facebookLink: normalizeTextFromFieldCandidates(firstRow, [
      "fb_link",
      "facebook_link",
      "facebook_url",
    ]),
    instagramLink: normalizeTextFromFieldCandidates(firstRow, [
      "insta_link",
      "instagram_link",
      "instagram_url",
    ]),
    xLink: normalizeTextFromFieldCandidates(firstRow, [
      "x_link",
      "x_url",
      "twitter_link",
      "twitter_url",
    ]),
    tiktokLink: normalizeTextFromFieldCandidates(firstRow, [
      "tiktok_link",
      "tiktok_url",
    ]),
    youtubeLink: normalizeTextFromFieldCandidates(firstRow, [
      "yt_link",
      "youtube_link",
      "youtube_url",
    ]),
    yelpLink: normalizeText(firstRow.yelp_link, ""),
    ubereatsLink: normalizeText(firstRow.ubereats_link, ""),
    grubhubLink: normalizeText(firstRow.grubhub_link, ""),
    doordashLink: normalizeText(firstRow.doordash_link, ""),
    logo: normalizeText(firstRow.logo, ""),
    logoFileId: normalizeTextFromFieldCandidates(firstRow, ["logo_file_id"]),
    isDeleted: typeof firstRow.is_deleted === "boolean" ? firstRow.is_deleted : null,
  } satisfies RestaurantDraftItem;
}

function normalizeCuisineTypes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

export async function insertFranchise(payload: Record<string, unknown>) {
  const data = await fetchGraphQL<InsertFranchiseResponse>(InsertFranchise, {
    object: payload,
  });
  const row = data.insert_franchises_one;

  if (!row || typeof row.id !== "string" || !row.id.trim()) {
    throw new Error("Failed to create franchise. Missing franchise id in response.");
  }

  return {
    id: row.id,
    name: normalizeText(row.name, "Unnamed franchise"),
  } satisfies FranchiseListItem;
}

export async function updateFranchiseBusinessInfo(
  id: string,
  set: Record<string, unknown>,
) {
  if (!id?.trim()) {
    throw new Error("Franchise id is required.");
  }

  const data = await fetchGraphQL<UpdateFranchiseResponse>(
    UpdateFranchiseBusinessInfo,
    {
      id,
      set,
    },
  );

  if (!data.update_franchises_by_pk) {
    throw new Error("Failed to update franchise business info.");
  }

  return data.update_franchises_by_pk;
}

export async function updateFranchiseOwner(id: string, ownerUserId: string) {
  if (!id?.trim()) {
    throw new Error("Franchise id is required.");
  }

  if (!ownerUserId?.trim()) {
    throw new Error("Owner user id is required.");
  }

  const data = await fetchGraphQL<UpdateFranchiseResponse>(UpdateFranchiseOwner, {
    id,
    ownerUserId,
  });

  if (!data.update_franchises_by_pk) {
    throw new Error("Failed to assign owner to franchise.");
  }

  return data.update_franchises_by_pk;
}

export async function insertRestaurant(payload: Record<string, unknown>): Promise<InsertRestaurantResult> {
  let lastGraphQlError: string | null = null;

  for (const variant of INSERT_RESTAURANT_VARIANTS) {
    const object = { ...payload };
    const maxAttempts = Math.max(24, Object.keys(object).length * 6);
    let attempts = 0;
    debugMutationLog("insert:variant:start", {
      outputField: variant.outputField,
      maxAttempts,
      payloadKeys: Object.keys(object),
    });

    while (attempts < maxAttempts) {
      attempts += 1;

      try {
        const data = await fetchGraphQL<InsertRestaurantResponse>(variant.query, {
          object,
        });

        const row = data.insert_restaurants_one;
        if (!row) {
          throw new Error("Hasura returned no row for restaurants insert.");
        }

        const primaryKeyValue = row[variant.outputField];
        const primaryKey = typeof primaryKeyValue === "string" ? primaryKeyValue : null;

        return {
          primaryKey,
          row,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown GraphQL error";
        lastGraphQlError = message;
        const missingInsertFields = extractMissingRestaurantInsertFields(message);
        const removedInsertFields = removeFieldsFromObject(object, missingInsertFields);
        if (removedInsertFields.length) {
          debugMutationLog("insert:removed-missing-fields", {
            outputField: variant.outputField,
            attempt: attempts,
            removedInsertFields,
            remainingKeys: Object.keys(object),
          });
          continue;
        }

        if (
          variant.outputField !== "__typename" &&
          isMissingFieldInType(message, variant.outputField, "restaurants")
        ) {
          debugMutationLog("insert:switch-output-variant", {
            outputField: variant.outputField,
            attempt: attempts,
            reason: message,
          });
          break;
        }

        throw new Error(`Failed to create restaurant. ${message}`);
      }
    }

    debugMutationLog("insert:variant:exhausted-attempts", {
      outputField: variant.outputField,
      attempts,
      remainingKeys: Object.keys(object),
    });
  }

  throw new Error(
    `Failed to create restaurant after schema fallback attempts.${lastGraphQlError ? ` Last GraphQL error: ${lastGraphQlError}` : ""
    }`,
  );
}

export async function updateRestaurant(
  restaurantId: string,
  payload: Record<string, unknown>,
) {
  if (!restaurantId) {
    throw new Error("Restaurant id is required to update restaurant.");
  }

  let lastGraphQlError: string | null = null;

  for (const variant of UPDATE_RESTAURANT_VARIANTS) {
    const changes = { ...payload };
    const maxAttempts = Math.max(24, Object.keys(changes).length * 6);
    let attempts = 0;
    debugMutationLog("update:variant:start", {
      pkField: variant.pkField,
      maxAttempts,
      changeKeys: Object.keys(changes),
    });

    while (attempts < maxAttempts) {
      attempts += 1;

      try {
        const data = await fetchGraphQL<UpdateRestaurantResponse>(variant.query, {
          restaurantId,
          changes,
        });

        if (!data.update_restaurants_by_pk) {
          throw new Error("Hasura returned no row for restaurants update.");
        }

        return data.update_restaurants_by_pk;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown GraphQL error";
        lastGraphQlError = message;
        const missingSetFields = extractMissingRestaurantSetFields(message);
        const removedSetFields = removeFieldsFromObject(changes, missingSetFields);
        if (removedSetFields.length) {
          debugMutationLog("update:removed-missing-fields", {
            pkField: variant.pkField,
            attempt: attempts,
            removedSetFields,
            remainingKeys: Object.keys(changes),
          });
          continue;
        }

        if (isMissingFieldInType(message, variant.pkField, "restaurants_pk_columns_input")) {
          debugMutationLog("update:switch-pk-variant", {
            pkField: variant.pkField,
            attempt: attempts,
            reason: message,
          });
          break;
        }

        throw new Error(`Failed to update restaurant. ${message}`);
      }
    }

    debugMutationLog("update:variant:exhausted-attempts", {
      pkField: variant.pkField,
      attempts,
      remainingKeys: Object.keys(changes),
    });
  }

  throw new Error(
    `Failed to update restaurant after schema fallback attempts.${lastGraphQlError ? ` Last GraphQL error: ${lastGraphQlError}` : ""
    }`,
  );
}

export async function replaceRestaurantGoogleReviews(
  restaurantId: string,
  reviews: RestaurantReviewUpsertInput[],
) {
  if (!restaurantId?.trim()) {
    throw new Error("Restaurant id is required to save reviews.");
  }

  await fetchGraphQL<DeleteRestaurantReviewsResponse>(
    DELETE_RESTAURANT_GOOGLE_REVIEWS,
    {
      restaurantId,
    },
  );

  if (!reviews.length) {
    return {
      affectedRows: 0,
    };
  }

  const objects = reviews.map((review) => ({
    restaurant_id: restaurantId,
    source: review.source || "google",
    external_review_id: normalizeNullableText(review.external_review_id),
    rating: normalizeRating(review.rating),
    author_name: normalizeNullableText(review.author_name),
    review_text: normalizeNullableText(review.review_text),
    author_url: normalizeNullableText(review.author_url),
    review_url: normalizeNullableText(review.review_url),
    avatar_url: normalizeNullableText(review.avatar_url),
    avatar_file_id: normalizeNullableText(review.avatar_file_id),
    published_at: normalizeNullableText(review.published_at),
    is_hidden: Boolean(review.is_hidden),
    created_by_user_id: normalizeNullableText(review.created_by_user_id),
  }));

  const data = await fetchGraphQL<InsertRestaurantReviewsResponse>(
    INSERT_reviews,
    {
      objects,
    },
  );

  return {
    affectedRows: Number(data.insert_reviews?.affected_rows ?? 0),
  };
}

function removeFieldsFromObject(object: Record<string, unknown>, fields: string[]) {
  const removableFields = fields.filter((field) =>
    Object.prototype.hasOwnProperty.call(object, field),
  );

  removableFields.forEach((field) => {
    delete object[field];
  });

  return removableFields;
}

function extractMissingRestaurantInsertFields(message: string) {
  return extractMissingFieldsByType(message, "restaurants_insert_input");
}

function extractMissingRestaurantSetFields(message: string) {
  return extractMissingFieldsByType(message, "restaurants_set_input");
}

function extractMissingFieldsByType(message: string, typeName: string) {
  const typePattern = escapeRegExp(typeName);
  const regex = new RegExp(`field '([^']+)' not found in type: '${typePattern}'`, "g");
  const matches = Array.from(message.matchAll(regex));

  const fields = matches
    .map((match) => match[1]?.trim())
    .filter((field): field is string => Boolean(field));

  return Array.from(new Set(fields));
}

function isMissingFieldInType(message: string, field: string, typeName: string) {
  const fieldPattern = escapeRegExp(field);
  const typePattern = escapeRegExp(typeName);
  const regex = new RegExp(`field '${fieldPattern}' not found in type: '${typePattern}'`);
  return regex.test(message);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Domain to Restaurant ID lookup
// Checks if domain matches EITHER staging_domain OR custom_domain (not both)
export const GetRestaurantByDomain = /* GraphQL */ `
  query GetRestaurantByDomain($domain: String!) {
    restaurants(
      where: {
        _or: [
          { custom_domain: { _eq: $domain } },
          { staging_domain: { _eq: $domain } }
        ],
        is_deleted: { _eq: false }
      },
      limit: 1
    ) {
      restaurant_id
      custom_domain
      staging_domain
      is_deleted
    }
  }
`;

interface RestaurantByDomainResponse {
  restaurants: Array<{
    restaurant_id: string;
    custom_domain: string | null;
    staging_domain: string | null;
    is_deleted: boolean;
  }>;
}

export async function getRestaurantIdByDomain(domain: string): Promise<string | null> {
  if (!domain?.trim()) {
    console.log('[getRestaurantIdByDomain] Empty domain provided');
    return null;
  }

  try {
    console.log('[getRestaurantIdByDomain] Looking up domain:', domain);
    
    // Don't remove port - match exactly what's in database
    // If database has localhost:3000, we should match localhost:3000
    const data = await fetchGraphQL<RestaurantByDomainResponse>(GetRestaurantByDomain, {
      domain: domain,
    });

    console.log('[getRestaurantIdByDomain] GraphQL response:', data);

    const restaurants = data.restaurants;
    if (!restaurants.length) {
      console.log('[getRestaurantIdByDomain] No restaurants found for domain:', domain);
      return null;
    }

    const restaurant = restaurants[0];
    if (restaurant.is_deleted) {
      console.log('[getRestaurantIdByDomain] Restaurant found but is deleted:', restaurant.restaurant_id);
      return null;
    }

    console.log('[getRestaurantIdByDomain] Found restaurant:', restaurant.restaurant_id);
    return restaurant.restaurant_id;
  } catch (error) {
    console.error('Error fetching restaurant ID by domain:', error);
    return null;
  }
}

// Pages GraphQL queries
export const GetPages = /* GraphQL */ `
  query GetPages($restaurant_id: uuid) {
    web_pages(
      where: {
        is_deleted: { _eq: false }
        restaurant_id: { _eq: $restaurant_id }
      }
      order_by: { created_at: desc }
    ) {
      page_id
      url_slug
      name
      created_at
      updated_at
      is_deleted
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
    }
  }
`;

export const GetPageById = /* GraphQL */ `
  query GetPageById($page_id: uuid!) {
    web_pages_by_pk(page_id: $page_id) {
      page_id
      url_slug
      name
      created_at
      updated_at
      is_deleted
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
    }
  }
`;

export const GetPageBySlug = /* GraphQL */ `
  query GetPageBySlug($url_slug: String!, $restaurant_id: uuid) {
    web_pages(
      where: {
        url_slug: { _eq: $url_slug }
        is_deleted: { _eq: false }
        restaurant_id: { _eq: $restaurant_id }
      }
      limit: 1
    ) {
      page_id
      url_slug
      name
      created_at
      updated_at
      is_deleted
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
    }
  }
`;

export const InsertPage = /* GraphQL */ `
  mutation InsertPage($object: web_pages_insert_input!) {
    insert_web_pages_one(object: $object) {
      page_id
      url_slug
      name
      created_at
      updated_at
      is_deleted
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
    }
  }
`;

export const UpdatePage = /* GraphQL */ `
  mutation UpdatePage($page_id: uuid!, $set: web_pages_set_input!) {
    update_web_pages_by_pk(pk_columns: { page_id: $page_id }, _set: $set) {
      page_id
      url_slug
      name
      updated_at
    }
  }
`;

export const DeletePage = /* GraphQL */ `
  mutation DeletePage($page_id: uuid!) {
    update_web_pages_by_pk(
      pk_columns: { page_id: $page_id }
      _set: { is_deleted: true, updated_at: "now()" }
    ) {
      page_id
    }
  }
`;

// Pages query response interfaces
interface PagesQueryResponse {
  web_pages: Array<{
    page_id: string;
    url_slug: string;
    name: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
    restaurant_id?: string | null;
    is_system_page: boolean;
    show_on_navbar: boolean;
    show_on_footer: boolean;
    keywords?: Record<string, unknown> | null;
    og_image?: string | null;
    published: boolean;
  }>;
}

interface PageByIdQueryResponse {
  web_pages_by_pk: {
    page_id: string;
    url_slug: string;
    name: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
    restaurant_id?: string | null;
    is_system_page: boolean;
    show_on_navbar: boolean;
    show_on_footer: boolean;
    keywords?: Record<string, unknown> | null;
    og_image?: string | null;
    published: boolean;
  } | null;
}

interface PageBySlugQueryResponse {
  web_pages: Array<{
    page_id: string;
    url_slug: string;
    name: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
    restaurant_id?: string | null;
    is_system_page: boolean;
    show_on_navbar: boolean;
    show_on_footer: boolean;
    keywords?: Record<string, unknown> | null;
    og_image?: string | null;
    published: boolean;
  }>;
}

interface InsertPageResponse {
  insert_web_pages_one: {
    page_id: string;
    url_slug: string;
    name: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
    restaurant_id?: string | null;
    is_system_page: boolean;
    show_on_navbar: boolean;
    show_on_footer: boolean;
    keywords?: Record<string, unknown> | null;
    og_image?: string | null;
    published: boolean;
  } | null;
}

interface UpdatePageResponse {
  update_web_pages_by_pk: {
    page_id: string;
    url_slug: string;
    name: string;
    updated_at: string;
  } | null;
}

interface DeletePageResponse {
  update_web_pages_by_pk: {
    page_id: string;
  } | null;
}

// Pages API functions
export async function getPages(restaurantId?: string) {
  const data = await fetchGraphQL<PagesQueryResponse>(GetPages, {
    restaurant_id: restaurantId || null,
  });

  return data.web_pages.map((page) => ({
    page_id: page.page_id,
    url_slug: page.url_slug,
    name: page.name,
    created_at: page.created_at,
    updated_at: page.updated_at,
    is_deleted: page.is_deleted,
    meta_title: page.meta_title || undefined,
    meta_description: page.meta_description || undefined,
    restaurant_id: page.restaurant_id || undefined,
    is_system_page: page.is_system_page,
    show_on_navbar: page.show_on_navbar,
    show_on_footer: page.show_on_footer,
    keywords: page.keywords || null,
    og_image: page.og_image || undefined,
    published: page.published,
  }));
}

export async function getPageById(pageId: string) {
  if (!pageId?.trim()) {
    throw new Error("Page ID is required.");
  }

  const data = await fetchGraphQL<PageByIdQueryResponse>(GetPageById, {
    page_id: pageId,
  });

  const page = data.web_pages_by_pk;
  if (!page) {
    return null;
  }

  return {
    page_id: page.page_id,
    url_slug: page.url_slug,
    name: page.name,
    created_at: page.created_at,
    updated_at: page.updated_at,
    is_deleted: page.is_deleted,
    meta_title: page.meta_title || undefined,
    meta_description: page.meta_description || undefined,
    restaurant_id: page.restaurant_id || undefined,
    is_system_page: page.is_system_page,
    show_on_navbar: page.show_on_navbar,
    show_on_footer: page.show_on_footer,
    keywords: page.keywords || null,
    og_image: page.og_image || undefined,
    published: page.published,
  };
}

export async function insertPage(payload: Record<string, unknown>) {
  const data = await fetchGraphQL<InsertPageResponse>(InsertPage, {
    object: payload,
  });

  const page = data.insert_web_pages_one;
  if (!page) {
    throw new Error("Failed to create page. No page returned in response.");
  }

  return {
    page_id: page.page_id,
    url_slug: page.url_slug,
    name: page.name,
    created_at: page.created_at,
    updated_at: page.updated_at,
    is_deleted: page.is_deleted,
    meta_title: page.meta_title || undefined,
    meta_description: page.meta_description || undefined,
    restaurant_id: page.restaurant_id || undefined,
    is_system_page: page.is_system_page,
    show_on_navbar: page.show_on_navbar,
    show_on_footer: page.show_on_footer,
    keywords: page.keywords || null,
    og_image: page.og_image || undefined,
    published: page.published,
  };
}

export async function updatePage(pageId: string, payload: Record<string, unknown>) {
  if (!pageId?.trim()) {
    throw new Error("Page ID is required to update page.");
  }

  const data = await fetchGraphQL<UpdatePageResponse>(UpdatePage, {
    page_id: pageId,
    set: payload,
  });

  if (!data.update_web_pages_by_pk) {
    throw new Error("Failed to update page.");
  }

  return data.update_web_pages_by_pk;
}

export async function deletePage(pageId: string) {
  if (!pageId?.trim()) {
    throw new Error("Page ID is required to delete page.");
  }

  const data = await fetchGraphQL<DeletePageResponse>(DeletePage, {
    page_id: pageId,
  });

  if (!data.update_web_pages_by_pk) {
    throw new Error("Failed to delete page.");
  }

  return data.update_web_pages_by_pk;
}

export async function getPageBySlug(urlSlug: string, restaurantId?: string, domain?: string) {
  if (!urlSlug?.trim()) {
    throw new Error("URL slug is required.");
  }

  let finalRestaurantId = restaurantId;

  // If domain is provided but no restaurantId, fetch restaurantId from domain
  if (domain && !restaurantId) {
    const domainRestaurantId = await getRestaurantIdByDomain(domain);
    if (!domainRestaurantId) {
      throw new Error(`No restaurant found for domain: ${domain}`);
    }
    finalRestaurantId = domainRestaurantId;
  }

  const data = await fetchGraphQL<PageBySlugQueryResponse>(GetPageBySlug, {
    url_slug: urlSlug,
    restaurant_id: finalRestaurantId || null,
  });

  const pages = data.web_pages;
  if (!pages.length) {
    return null;
  }

  const page = pages[0];
  return {
    page_id: page.page_id,
    url_slug: page.url_slug,
    name: page.name,
    created_at: page.created_at,
    updated_at: page.updated_at,
    is_deleted: page.is_deleted,
    meta_title: page.meta_title || undefined,
    meta_description: page.meta_description || undefined,
    restaurant_id: page.restaurant_id || undefined,
    is_system_page: page.is_system_page,
    show_on_navbar: page.show_on_navbar,
    show_on_footer: page.show_on_footer,
    keywords: page.keywords || null,
    og_image: page.og_image || undefined,
    published: page.published,
  };
}
