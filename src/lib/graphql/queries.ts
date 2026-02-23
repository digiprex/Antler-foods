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

export const GetServiceModels = /* GraphQL */ `
  query GetServiceModels {
    service_model(where: { is_deleted: { _eq: false } }, order_by: { name: asc }) {
      id
      name
      description
    }
  }
`;

const INSERT_RESTAURANT_VARIANTS = [
  {
    outputField: "restaurant_id",
    query: /* GraphQL */ `
      mutation InsertRestaurantWithRestaurantId($object: restaurants_insert_input!) {
        insert_restaurants_one(object: $object) {
          restaurant_id
        }
      }
    `,
  },
  {
    outputField: "id",
    query: /* GraphQL */ `
      mutation InsertRestaurantWithId($object: restaurants_insert_input!) {
        insert_restaurants_one(object: $object) {
          id
        }
      }
    `,
  },
  {
    outputField: "__typename",
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
      mutation UpdateRestaurantByRestaurantId($restaurantId: uuid!, $changes: restaurants_set_input!) {
        update_restaurants_by_pk(pk_columns: { restaurant_id: $restaurantId }, _set: $changes) {
          __typename
        }
      }
    `,
  },
  {
    pkField: "id",
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
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
    query: /* GraphQL */ `
      query GetRestaurantsMinimalWithId {
        restaurants {
          id
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

interface RestaurantsListQueryResponse {
  restaurants: Array<Record<string, unknown>>;
}

interface InsertRestaurantResponse {
  insert_restaurants_one: Record<string, unknown> | null;
}

interface UpdateRestaurantResponse {
  update_restaurants_by_pk: Record<string, unknown> | null;
}

export interface InsertRestaurantResult {
  primaryKey: string | null;
  row: Record<string, unknown>;
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
  return /* GraphQL */ `
    query GetCuisineTypeCategoriesVariant {
      cuisine_types_categories {
        ${variant.idField}
        ${variant.labelField}
      }
    }
  `;
}

function buildCuisineTypesQuery(variant: CuisineTypeVariant) {
  return /* GraphQL */ `
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
    `Failed to create restaurant after schema fallback attempts.${
      lastGraphQlError ? ` Last GraphQL error: ${lastGraphQlError}` : ""
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
    `Failed to update restaurant after schema fallback attempts.${
      lastGraphQlError ? ` Last GraphQL error: ${lastGraphQlError}` : ""
    }`,
  );
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
