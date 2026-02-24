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
  legalName: string;
  pocPhoneNumber: string;
  pocEmail: string;
  googlePlaceId: string;
  gmbLink: string;
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
    outputField: "id",
    query: `
      mutation InsertRestaurantWithId($object: restaurants_insert_input!) {
        insert_restaurants_one(object: $object) {
          id
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
  {
    pkField: "id",
    query: `
      mutation UpdateRestaurantById($restaurantId: uuid!, $changes: restaurants_set_input!) {
        update_restaurants_by_pk(pk_columns: { id: $restaurantId }, _set: $changes) {
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
    idField: "id",
    query: `
      query GetRestaurantsWithId {
        restaurants(order_by: { created_at: desc }) {
          id
          name
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
    idField: "id",
    query: `
      query GetRestaurantsWithoutCreatedAtWithId {
        restaurants {
          id
          name
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
      query GetRestaurantsMinimalWithRestaurantId {
        restaurants {
          restaurant_id
          name
        }
      }
    `,
  },
  {
    idField: "id",
    query: `
      query GetRestaurantsMinimalWithId {
        restaurants {
          id
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
          is_deleted
        }
      }
    `,
  },
  {
    idField: "id",
    query: `
      query GetRestaurantDraftById($restaurantId: uuid!) {
        restaurants(where: { id: { _eq: $restaurantId } }, limit: 1) {
          id
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
  {
    idField: "id",
    query: `
      query GetRestaurantDraftMinimalById($restaurantId: uuid!) {
        restaurants(where: { id: { _eq: $restaurantId } }, limit: 1) {
          id
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
    legalName: normalizeText(firstRow.sms_name, ""),
    pocPhoneNumber: normalizeText(firstRow.poc_phone_number, ""),
    pocEmail: normalizeText(firstRow.poc_email, ""),
    googlePlaceId: normalizeText(firstRow.google_place_id, ""),
    gmbLink: normalizeText(firstRow.gmb_link, ""),
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
