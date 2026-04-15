import 'server-only';

import { adminGraphqlRequest } from '@/lib/server/api-auth';

export const MENU_CSV_HEADERS = [
  'record_type',
  'category_key',
  'category_name',
  'category_description',
  'category_sort_order',
  'category_type',
  'category_is_active',
  'item_key',
  'item_name',
  'item_description',
  'item_delivery_price',
  'item_pickup_price',
  'item_image_url',
  'item_is_recommended',
  'item_is_best_seller',
  'item_is_available',
  'item_in_stock',
  'item_has_variants',
  'parent_item_key',
  'modifier_group_key',
  'modifier_group_name',
  'modifier_group_description',
  'modifier_group_type',
  'modifier_group_min_selection',
  'modifier_group_max_selection',
  'modifier_group_is_required',
  'modifier_group_is_multi_select',
  'modifier_item_key',
  'modifier_item_name',
  'modifier_item_price',
] as const;

type MenuCsvHeader = (typeof MENU_CSV_HEADERS)[number];
type MenuCsvRecordType =
  | 'CATEGORY'
  | 'ITEM'
  | 'MODIFIER_GROUP'
  | 'MODIFIER_ITEM'
  | 'ITEM_MODIFIER_LINK';
type IssueType = 'error' | 'conflict' | 'warning';

type DbMenuRow = {
  menu_id?: string | null;
  restaurant_id?: string | null;
  name?: string | null;
};

type DbCategoryRow = {
  category_id?: string | null;
  menu_id?: string | null;
  name?: string | null;
  description?: string | null;
  order_index?: number | string | null;
  type?: string | null;
  is_active?: boolean | null;
  csv_key?: string | null;
};

type DbItemRow = {
  item_id?: string | null;
  category_id?: string | null;
  name?: string | null;
  description?: string | null;
  delivery_price?: number | string | null;
  pickup_price?: number | string | null;
  image_url?: string | null;
  is_recommended?: boolean | null;
  is_best_seller?: boolean | null;
  is_available?: boolean | null;
  in_stock?: boolean | null;
  modifiers?: unknown;
  has_variants?: boolean | null;
  parent_item_id?: string | null;
  csv_key?: string | null;
};

type DbModifierGroupRow = {
  modifier_group_id?: string | null;
  restaurant_id?: string | null;
  name?: string | null;
  description?: string | null;
  min_selection?: number | string | null;
  max_selection?: number | string | null;
  type?: string | null;
  is_required?: boolean | null;
  is_multi_select?: boolean | null;
  csv_key?: string | null;
};

type DbModifierItemRow = {
  modifier_item_id?: string | null;
  modifier_group_id?: string | null;
  name?: string | null;
  price?: number | string | null;
  csv_key?: string | null;
};

type MenuCsvContext = {
  menu: NormalizedMenuRow;
  categories: NormalizedCategoryRow[];
  items: NormalizedItemRow[];
  modifierGroups: NormalizedModifierGroupRow[];
  modifierItems: NormalizedModifierItemRow[];
};

type NormalizedMenuRow = {
  menuId: string;
  restaurantId: string;
  name: string;
};

type NormalizedCategoryRow = {
  categoryId: string;
  menuId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  type: string;
  isActive: boolean;
  csvKey: string | null;
};

type NormalizedItemRow = {
  itemId: string;
  categoryId: string;
  name: string;
  description: string | null;
  deliveryPrice: number;
  pickupPrice: number;
  imageUrl: string | null;
  isRecommended: boolean;
  isBestSeller: boolean;
  isAvailable: boolean;
  inStock: boolean;
  modifiers: unknown;
  hasVariants: boolean;
  parentItemId: string | null;
  csvKey: string | null;
};

type NormalizedModifierGroupRow = {
  modifierGroupId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number;
  type: string;
  isRequired: boolean;
  isMultiSelect: boolean;
  csvKey: string | null;
};

type NormalizedModifierItemRow = {
  modifierItemId: string;
  modifierGroupId: string;
  name: string;
  price: number;
  csvKey: string | null;
};

type ParsedCategoryCsvRecord = {
  rowNumber: number;
  categoryKey: string;
  categoryName: string;
  categoryDescription: string | null;
  categorySortOrder: number;
  categoryType: string;
  categoryIsActive: boolean;
};

type ParsedItemCsvRecord = {
  rowNumber: number;
  itemKey: string;
  categoryKey: string;
  itemName: string;
  itemDescription: string | null;
  itemDeliveryPrice: number;
  itemPickupPrice: number;
  itemImageUrl: string | null;
  itemIsRecommended: boolean;
  itemIsBestSeller: boolean;
  itemIsAvailable: boolean;
  itemInStock: boolean;
  itemHasVariants: boolean;
  parentItemKey: string | null;
};

type ParsedModifierGroupCsvRecord = {
  rowNumber: number;
  modifierGroupKey: string;
  modifierGroupName: string;
  modifierGroupDescription: string | null;
  modifierGroupType: string;
  modifierGroupMinSelection: number;
  modifierGroupMaxSelection: number;
  modifierGroupIsRequired: boolean;
  modifierGroupIsMultiSelect: boolean;
};

type ParsedModifierItemCsvRecord = {
  rowNumber: number;
  modifierGroupKey: string;
  modifierItemKey: string;
  modifierItemName: string;
  modifierItemPrice: number;
};

type ParsedItemModifierLinkCsvRecord = {
  rowNumber: number;
  itemKey: string;
  modifierGroupKey: string;
};

type MenuCsvIssue = {
  type: IssueType;
  rowNumber: number | null;
  recordType: MenuCsvRecordType | 'FILE';
  key: string | null;
  message: string;
};

type MenuCsvImportSummary = {
  categoriesToCreate: number;
  categoriesToUpdate: number;
  itemsToCreate: number;
  itemsToUpdate: number;
  modifierGroupsToCreate: number;
  modifierGroupsToReuse: number;
  modifierItemsToCreate: number;
  itemModifierLinksToApply: number;
  errors: number;
  conflicts: number;
  warnings: number;
};

export type MenuCsvPreview = {
  fileName: string;
  summary: MenuCsvImportSummary;
  issues: MenuCsvIssue[];
  hasBlockingIssues: boolean;
};

export type MenuCsvApplyResult = {
  summary: MenuCsvImportSummary;
  appliedAt: string;
};

type MenuCsvImportPlan = {
  context: MenuCsvContext;
  fileName: string;
  summary: MenuCsvImportSummary;
  issues: MenuCsvIssue[];
  hasBlockingIssues: boolean;
  categories: ParsedCategoryCsvRecord[];
  items: ParsedItemCsvRecord[];
  modifierGroups: ParsedModifierGroupCsvRecord[];
  modifierItems: ParsedModifierItemCsvRecord[];
  itemModifierLinks: ParsedItemModifierLinkCsvRecord[];
  existingCategoriesByKey: Map<string, NormalizedCategoryRow>;
  existingItemsByKey: Map<string, NormalizedItemRow>;
  existingModifierGroupsByKey: Map<string, NormalizedModifierGroupRow>;
  existingModifierItemsByGroupKey: Map<string, Map<string, NormalizedModifierItemRow>>;
};

type ParsedCsvContent = {
  categories: ParsedCategoryCsvRecord[];
  items: ParsedItemCsvRecord[];
  modifierGroups: ParsedModifierGroupCsvRecord[];
  modifierItems: ParsedModifierItemCsvRecord[];
  itemModifierLinks: ParsedItemModifierLinkCsvRecord[];
  issues: MenuCsvIssue[];
};

type ModifierGroupDefinition = {
  name: string;
  description: string;
  type: string;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  isMultiSelect: boolean;
  items: Array<{
    key: string;
    name: string;
    price: string;
  }>;
};

type ModifierGroupUpsertResult = {
  modifierGroupId: string;
  csvKey: string;
  reused: boolean;
};

const GET_MENU_HEADER = `
  query GetMenuCsvHeader($menu_id: uuid!) {
    menu_by_pk(menu_id: $menu_id) {
      menu_id
      restaurant_id
      name
    }
  }
`;

const GET_MENU_CATEGORIES = `
  query GetMenuCsvCategories($menu_id: uuid!) {
    categories(
      where: {
        menu_id: { _eq: $menu_id }
        is_deleted: { _eq: false }
      }
    ) {
      category_id
      menu_id
      name
      description
      order_index
      type
      is_active
      csv_key
    }
  }
`;

const GET_MENU_ITEMS = `
  query GetMenuCsvItems($category_ids: [uuid!]!) {
    items(
      where: {
        category_id: { _in: $category_ids }
        is_deleted: { _eq: false }
      }
    ) {
      item_id
      category_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      is_available
      in_stock
      modifiers
      has_variants
      parent_item_id
      csv_key
    }
  }
`;

const GET_RESTAURANT_MODIFIER_GROUPS = `
  query GetMenuCsvModifierGroups($restaurant_id: uuid!) {
    modifier_groups(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
    ) {
      modifier_group_id
      restaurant_id
      name
      description
      min_selection
      max_selection
      type
      is_required
      is_multi_select
      csv_key
    }
  }
`;

const GET_RESTAURANT_MODIFIER_ITEMS = `
  query GetMenuCsvModifierItems($modifier_group_ids: [uuid!]!) {
    modifier_items(
      where: {
        modifier_group_id: { _in: $modifier_group_ids }
        is_deleted: { _eq: false }
      }
    ) {
      modifier_item_id
      modifier_group_id
      name
      price
      csv_key
    }
  }
`;

const UPDATE_CATEGORY_CSV_KEY = `
  mutation UpdateCategoryCsvKey($category_id: uuid!, $csv_key: String!) {
    update_categories_by_pk(
      pk_columns: { category_id: $category_id }
      _set: { csv_key: $csv_key }
    ) {
      category_id
      csv_key
    }
  }
`;

const BATCH_UPDATE_CATEGORIES_CSV_KEYS = `
  mutation BatchUpdateCategoriesCsvKeys($updates: [categories_updates!]!) {
    update_categories_many(updates: $updates) {
      affected_rows
    }
  }
`;

const UPDATE_ITEM_CSV_KEY = `
  mutation UpdateItemCsvKey($item_id: uuid!, $csv_key: String!) {
    update_items_by_pk(
      pk_columns: { item_id: $item_id }
      _set: { csv_key: $csv_key }
    ) {
      item_id
      csv_key
    }
  }
`;

const BATCH_UPDATE_ITEMS_CSV_KEYS = `
  mutation BatchUpdateItemsCsvKeys($updates: [items_updates!]!) {
    update_items_many(updates: $updates) {
      affected_rows
    }
  }
`;

const UPDATE_MODIFIER_GROUP_CSV_KEY = `
  mutation UpdateModifierGroupCsvKey($modifier_group_id: uuid!, $csv_key: String!) {
    update_modifier_groups_by_pk(
      pk_columns: { modifier_group_id: $modifier_group_id }
      _set: { csv_key: $csv_key }
    ) {
      modifier_group_id
      csv_key
    }
  }
`;

const BATCH_UPDATE_MODIFIER_GROUPS_CSV_KEYS = `
  mutation BatchUpdateModifierGroupsCsvKeys($updates: [modifier_groups_updates!]!) {
    update_modifier_groups_many(updates: $updates) {
      affected_rows
    }
  }
`;

const UPDATE_MODIFIER_ITEM_CSV_KEY = `
  mutation UpdateModifierItemCsvKey($modifier_item_id: uuid!, $csv_key: String!) {
    update_modifier_items_by_pk(
      pk_columns: { modifier_item_id: $modifier_item_id }
      _set: { csv_key: $csv_key }
    ) {
      modifier_item_id
      csv_key
    }
  }
`;

const BATCH_UPDATE_MODIFIER_ITEMS_CSV_KEYS = `
  mutation BatchUpdateModifierItemsCsvKeys($updates: [modifier_items_updates!]!) {
    update_modifier_items_many(updates: $updates) {
      affected_rows
    }
  }
`;

const INSERT_CATEGORY = `
  mutation InsertCsvCategory(
    $menu_id: uuid!
    $name: String!
    $description: String
    $order_index: numeric!
    $type: String!
    $is_active: Boolean!
    $csv_key: String!
  ) {
    insert_categories_one(
      object: {
        menu_id: $menu_id
        name: $name
        description: $description
        order_index: $order_index
        type: $type
        is_active: $is_active
        csv_key: $csv_key
      }
    ) {
      category_id
      menu_id
      name
      description
      order_index
      type
      is_active
      csv_key
    }
  }
`;

const UPDATE_CATEGORY = `
  mutation UpdateCsvCategory(
    $category_id: uuid!
    $name: String!
    $description: String
    $order_index: numeric!
    $type: String!
    $is_active: Boolean!
    $csv_key: String!
  ) {
    update_categories_by_pk(
      pk_columns: { category_id: $category_id }
      _set: {
        name: $name
        description: $description
        order_index: $order_index
        type: $type
        is_active: $is_active
        csv_key: $csv_key
      }
    ) {
      category_id
      menu_id
      name
      description
      order_index
      type
      is_active
      csv_key
    }
  }
`;

const INSERT_ITEM = `
  mutation InsertCsvItem(
    $category_id: uuid!
    $name: String!
    $description: String
    $delivery_price: numeric!
    $pickup_price: numeric!
    $image_url: String
    $is_recommended: Boolean!
    $is_best_seller: Boolean!
    $is_available: Boolean!
    $in_stock: Boolean!
    $modifiers: jsonb
    $has_variants: Boolean!
    $parent_item_id: uuid
    $csv_key: String!
  ) {
    insert_items_one(
      object: {
        category_id: $category_id
        name: $name
        description: $description
        delivery_price: $delivery_price
        pickup_price: $pickup_price
        image_url: $image_url
        is_recommended: $is_recommended
        is_best_seller: $is_best_seller
        is_available: $is_available
        in_stock: $in_stock
        modifiers: $modifiers
        has_variants: $has_variants
        parent_item_id: $parent_item_id
        csv_key: $csv_key
      }
    ) {
      item_id
      category_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      is_available
      in_stock
      modifiers
      has_variants
      parent_item_id
      csv_key
    }
  }
`;

const UPDATE_ITEM = `
  mutation UpdateCsvItem(
    $item_id: uuid!
    $category_id: uuid!
    $name: String!
    $description: String
    $delivery_price: numeric!
    $pickup_price: numeric!
    $image_url: String
    $is_recommended: Boolean!
    $is_best_seller: Boolean!
    $is_available: Boolean!
    $in_stock: Boolean!
    $modifiers: jsonb
    $has_variants: Boolean!
    $parent_item_id: uuid
    $csv_key: String!
  ) {
    update_items_by_pk(
      pk_columns: { item_id: $item_id }
      _set: {
        category_id: $category_id
        name: $name
        description: $description
        delivery_price: $delivery_price
        pickup_price: $pickup_price
        image_url: $image_url
        is_recommended: $is_recommended
        is_best_seller: $is_best_seller
        is_available: $is_available
        in_stock: $in_stock
        modifiers: $modifiers
        has_variants: $has_variants
        parent_item_id: $parent_item_id
        csv_key: $csv_key
      }
    ) {
      item_id
      category_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      is_available
      in_stock
      modifiers
      has_variants
      parent_item_id
      csv_key
    }
  }
`;

const INSERT_MODIFIER_GROUP = `
  mutation InsertCsvModifierGroup(
    $restaurant_id: uuid!
    $name: String!
    $description: String
    $min_selection: numeric!
    $max_selection: numeric!
    $type: String!
    $is_required: Boolean!
    $is_multi_select: Boolean!
    $csv_key: String!
  ) {
    insert_modifier_groups_one(
      object: {
        restaurant_id: $restaurant_id
        name: $name
        description: $description
        min_selection: $min_selection
        max_selection: $max_selection
        type: $type
        is_required: $is_required
        is_multi_select: $is_multi_select
        csv_key: $csv_key
      }
    ) {
      modifier_group_id
      restaurant_id
      name
      description
      min_selection
      max_selection
      type
      is_required
      is_multi_select
      csv_key
    }
  }
`;

const INSERT_MODIFIER_ITEM = `
  mutation InsertCsvModifierItem(
    $modifier_group_id: uuid!
    $name: String!
    $price: numeric!
    $csv_key: String!
  ) {
    insert_modifier_items_one(
      object: {
        modifier_group_id: $modifier_group_id
        name: $name
        price: $price
        csv_key: $csv_key
      }
    ) {
      modifier_item_id
      modifier_group_id
      name
      price
      csv_key
    }
  }
`;

const SOFT_DELETE_CATEGORIES = `
  mutation SoftDeleteCategories($category_ids: [uuid!]!) {
    update_categories(
      where: { category_id: { _in: $category_ids } }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

const SOFT_DELETE_ITEMS = `
  mutation SoftDeleteItems($item_ids: [uuid!]!) {
    update_items(
      where: { item_id: { _in: $item_ids } }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

const SOFT_DELETE_MODIFIER_GROUPS = `
  mutation SoftDeleteModifierGroups($modifier_group_ids: [uuid!]!) {
    update_modifier_groups(
      where: { modifier_group_id: { _in: $modifier_group_ids } }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

const SOFT_DELETE_MODIFIER_ITEMS = `
  mutation SoftDeleteModifierItems($modifier_item_ids: [uuid!]!) {
    update_modifier_items(
      where: { modifier_item_id: { _in: $modifier_item_ids } }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

export async function exportMenuCsv(input: {
  restaurantId: string;
  menuId: string;
}) {
  const context = await ensureMenuCsvContext(input.menuId, input.restaurantId);
  const rows = buildExportRows(context);
  return {
    fileName: `${slugify(context.menu.name)}-menu-export.csv`,
    csvText: buildCsvText(rows),
  };
}

export function buildMenuCsvSample() {
  const rows = [
    createCsvRow({
      record_type: 'CATEGORY',
      category_key: 'main-course',
      category_name: 'Main Course',
      category_description: 'Popular entrees and curries',
      category_sort_order: '1',
      category_type: 'default',
      category_is_active: 'true',
    }),
    createCsvRow({
      record_type: 'ITEM',
      category_key: 'main-course',
      item_key: 'butter-chicken',
      item_name: 'Butter Chicken',
      item_description: 'Creamy tomato curry',
      item_delivery_price: '14.99',
      item_pickup_price: '13.99',
      item_is_recommended: 'true',
      item_is_best_seller: 'true',
      item_is_available: 'true',
      item_in_stock: 'true',
      item_has_variants: 'false',
    }),
    createCsvRow({
      record_type: 'MODIFIER_GROUP',
      modifier_group_key: 'spice-level',
      modifier_group_name: 'Spice Level',
      modifier_group_description: 'Choose your heat preference',
      modifier_group_type: 'Regular',
      modifier_group_min_selection: '1',
      modifier_group_max_selection: '1',
      modifier_group_is_required: 'true',
      modifier_group_is_multi_select: 'false',
    }),
    createCsvRow({
      record_type: 'MODIFIER_ITEM',
      modifier_group_key: 'spice-level',
      modifier_item_key: 'spice-level-mild',
      modifier_item_name: 'Mild',
      modifier_item_price: '0.00',
    }),
    createCsvRow({
      record_type: 'MODIFIER_ITEM',
      modifier_group_key: 'spice-level',
      modifier_item_key: 'spice-level-hot',
      modifier_item_name: 'Hot',
      modifier_item_price: '0.00',
    }),
    createCsvRow({
      record_type: 'ITEM_MODIFIER_LINK',
      item_key: 'butter-chicken',
      modifier_group_key: 'spice-level',
    }),
  ];

  return {
    fileName: 'menu-import-sample.csv',
    csvText: buildCsvText(rows),
  };
}

export async function previewMenuCsvImport(input: {
  restaurantId: string;
  menuId: string;
  csvText: string;
  fileName?: string;
}): Promise<MenuCsvPreview> {
  const plan = await buildMenuCsvImportPlan(input);

  return {
    fileName: plan.fileName,
    summary: plan.summary,
    issues: plan.issues,
    hasBlockingIssues: plan.hasBlockingIssues,
  };
}

export async function applyMenuCsvImport(input: {
  restaurantId: string;
  menuId: string;
  csvText: string;
  fileName?: string;
}): Promise<MenuCsvApplyResult> {
  const plan = await buildMenuCsvImportPlan(input);
  if (plan.hasBlockingIssues) {
    const firstIssue = plan.issues.find(
      (issue) => issue.type === 'error' || issue.type === 'conflict',
    );
    throw new Error(
      firstIssue?.message || 'Import has blocking issues. Resolve them before applying.',
    );
  }

  const createdIds = {
    categories: [] as string[],
    items: [] as string[],
    modifierGroups: [] as string[],
    modifierItems: [] as string[],
  };

  try {
    const categoryResults = await applyCategoryChanges(plan, createdIds);
    const modifierGroupResults = await applyModifierGroupChanges(plan, createdIds);
    await applyItemChanges(plan, categoryResults, modifierGroupResults, createdIds);

    return {
      summary: plan.summary,
      appliedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Rollback: soft-delete all created records
    await rollbackImport(createdIds);
    throw new Error(
      `Import failed and was rolled back: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function rollbackImport(createdIds: {
  categories: string[];
  items: string[];
  modifierGroups: string[];
  modifierItems: string[];
}) {
  try {
    if (createdIds.categories.length > 0) {
      await adminGraphqlRequest(SOFT_DELETE_CATEGORIES, {
        category_ids: createdIds.categories,
      });
    }
    if (createdIds.items.length > 0) {
      await adminGraphqlRequest(SOFT_DELETE_ITEMS, {
        item_ids: createdIds.items,
      });
    }
    if (createdIds.modifierGroups.length > 0) {
      await adminGraphqlRequest(SOFT_DELETE_MODIFIER_GROUPS, {
        modifier_group_ids: createdIds.modifierGroups,
      });
    }
    if (createdIds.modifierItems.length > 0) {
      await adminGraphqlRequest(SOFT_DELETE_MODIFIER_ITEMS, {
        modifier_item_ids: createdIds.modifierItems,
      });
    }
  } catch (rollbackError) {
    console.error('Rollback failed:', rollbackError);
    // Log but don't throw - we want the original error to be thrown
  }
}

async function buildMenuCsvImportPlan(input: {
  restaurantId: string;
  menuId: string;
  csvText: string;
  fileName?: string;
}): Promise<MenuCsvImportPlan> {
  const parsed = parseMenuCsv(input.csvText);
  const context = await ensureMenuCsvContext(input.menuId, input.restaurantId);
  const issues = [...parsed.issues];

  const existingCategoriesByKey = buildUniqueMap(
    context.categories,
    (category) => category.csvKey,
    'CATEGORY',
    issues,
    'Target menu already has duplicate category keys.',
  );
  const existingItemsByKey = buildUniqueMap(
    context.items,
    (item) => item.csvKey,
    'ITEM',
    issues,
    'Target menu already has duplicate item keys.',
  );
  const existingModifierGroupsByKey = buildUniqueMap(
    context.modifierGroups,
    (group) => group.csvKey,
    'MODIFIER_GROUP',
    issues,
    'Restaurant already has duplicate modifier group keys.',
  );
  const existingModifierItemsByGroupKey = buildExistingModifierItemsByGroupKey(
    context.modifierGroups,
    context.modifierItems,
    issues,
  );

  validateParsedCsvContent(parsed, {
    existingCategoriesByKey,
    existingItemsByKey,
    existingModifierGroupsByKey,
    issues,
  });

  validateModifierGroupConflicts(parsed, {
    existingModifierGroupsByKey,
    existingModifierItemsByGroupKey,
    issues,
  });

  const summary = buildSummary(parsed, {
    existingCategoriesByKey,
    existingItemsByKey,
    existingModifierGroupsByKey,
    issues,
  });

  return {
    context,
    fileName: normalizeCsvFileName(input.fileName),
    summary,
    issues: sortIssues(issues),
    hasBlockingIssues: issues.some(
      (issue) => issue.type === 'error' || issue.type === 'conflict',
    ),
    categories: parsed.categories,
    items: parsed.items,
    modifierGroups: parsed.modifierGroups,
    modifierItems: parsed.modifierItems,
    itemModifierLinks: dedupeItemModifierLinks(parsed.itemModifierLinks),
    existingCategoriesByKey,
    existingItemsByKey,
    existingModifierGroupsByKey,
    existingModifierItemsByGroupKey,
  };
}

async function ensureMenuCsvContext(menuId: string, restaurantId: string) {
  const context = await loadMenuCsvContext(menuId);
  if (context.menu.restaurantId !== restaurantId) {
    throw new Error('Selected menu does not belong to this restaurant.');
  }

  await ensureCsvKeys(context);
  return loadMenuCsvContext(menuId);
}

async function loadMenuCsvContext(menuId: string): Promise<MenuCsvContext> {
  const menuPayload = await adminGraphqlRequest<{ menu_by_pk?: DbMenuRow | null }>(
    GET_MENU_HEADER,
    { menu_id: menuId },
  );
  const menu = normalizeMenu(menuPayload.menu_by_pk);
  if (!menu) {
    throw new Error('Menu not found.');
  }

  const categoriesPayload = await adminGraphqlRequest<{
    categories?: DbCategoryRow[];
  }>(GET_MENU_CATEGORIES, { menu_id: menuId });

  const categories = (categoriesPayload.categories || [])
    .map(normalizeCategory)
    .filter((value): value is NormalizedCategoryRow => Boolean(value))
    .sort((left, right) => {
      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex;
      }
      return left.name.localeCompare(right.name);
    });

  const categoryIds = categories.map((category) => category.categoryId);
  const itemsPayload =
    categoryIds.length > 0
      ? await adminGraphqlRequest<{ items?: DbItemRow[] }>(GET_MENU_ITEMS, {
          category_ids: categoryIds,
        })
      : { items: [] };
  const items = (itemsPayload.items || [])
    .map(normalizeItem)
    .filter((value): value is NormalizedItemRow => Boolean(value))
    .sort(sortItemsForExport);

  const groupsPayload = await adminGraphqlRequest<{
    modifier_groups?: DbModifierGroupRow[];
  }>(GET_RESTAURANT_MODIFIER_GROUPS, { restaurant_id: menu.restaurantId });
  const modifierGroups = (groupsPayload.modifier_groups || [])
    .map(normalizeModifierGroup)
    .filter((value): value is NormalizedModifierGroupRow => Boolean(value))
    .sort((left, right) => left.name.localeCompare(right.name));

  const groupIds = modifierGroups.map((group) => group.modifierGroupId);
  const modifierItemsPayload =
    groupIds.length > 0
      ? await adminGraphqlRequest<{ modifier_items?: DbModifierItemRow[] }>(
          GET_RESTAURANT_MODIFIER_ITEMS,
          {
            modifier_group_ids: groupIds,
          },
        )
      : { modifier_items: [] };
  const modifierItems = (modifierItemsPayload.modifier_items || [])
    .map(normalizeModifierItem)
    .filter((value): value is NormalizedModifierItemRow => Boolean(value))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    menu,
    categories,
    items,
    modifierGroups,
    modifierItems,
  };
}

async function ensureCsvKeys(context: MenuCsvContext) {
  const categoryUpdates = buildMissingKeyAssignments(
    context.categories,
    (category) => category.name,
    (category) => category.csvKey,
    (category) => category.categoryId,
  );

  // Batch update categories in chunks of 50
  if (categoryUpdates.length > 0) {
    await batchUpdateCsvKeys(
      categoryUpdates,
      (batch) =>
        adminGraphqlRequest(BATCH_UPDATE_CATEGORIES_CSV_KEYS, {
          updates: batch.map((entry) => ({
            where: { category_id: { _eq: entry.id } },
            _set: { csv_key: entry.key },
          })),
        }),
      50,
    );
  }

  const itemUpdates = buildMissingKeyAssignments(
    context.items,
    (item) => item.name,
    (item) => item.csvKey,
    (item) => item.itemId,
    (item) => item.categoryId,
  );

  // Batch update items in chunks of 50
  if (itemUpdates.length > 0) {
    await batchUpdateCsvKeys(
      itemUpdates,
      (batch) =>
        adminGraphqlRequest(BATCH_UPDATE_ITEMS_CSV_KEYS, {
          updates: batch.map((entry) => ({
            where: { item_id: { _eq: entry.id } },
            _set: { csv_key: entry.key },
          })),
        }),
      50,
    );
  }

  const groupUpdates = buildMissingKeyAssignments(
    context.modifierGroups,
    (group) => group.name,
    (group) => group.csvKey,
    (group) => group.modifierGroupId,
  );

  // Batch update modifier groups in chunks of 50
  if (groupUpdates.length > 0) {
    await batchUpdateCsvKeys(
      groupUpdates,
      (batch) =>
        adminGraphqlRequest(BATCH_UPDATE_MODIFIER_GROUPS_CSV_KEYS, {
          updates: batch.map((entry) => ({
            where: { modifier_group_id: { _eq: entry.id } },
            _set: { csv_key: entry.key },
          })),
        }),
      50,
    );
  }

  const modifierItemsByGroupId = groupBy(
    context.modifierItems,
    (modifierItem) => modifierItem.modifierGroupId,
  );

  const allModifierItemUpdates: Array<{ id: string; key: string }> = [];
  for (const [groupId, modifierItems] of modifierItemsByGroupId.entries()) {
    const modifierItemUpdates = buildMissingKeyAssignments(
      modifierItems,
      (modifierItem) => modifierItem.name,
      (modifierItem) => modifierItem.csvKey,
      (modifierItem) => modifierItem.modifierItemId,
      () => groupId,
    );
    allModifierItemUpdates.push(...modifierItemUpdates);
  }

  // Batch update modifier items in chunks of 50
  if (allModifierItemUpdates.length > 0) {
    await batchUpdateCsvKeys(
      allModifierItemUpdates,
      (batch) =>
        adminGraphqlRequest(BATCH_UPDATE_MODIFIER_ITEMS_CSV_KEYS, {
          updates: batch.map((entry) => ({
            where: { modifier_item_id: { _eq: entry.id } },
            _set: { csv_key: entry.key },
          })),
        }),
      50,
    );
  }
}

async function batchUpdateCsvKeys<T>(
  items: T[],
  updateFn: (batch: T[]) => Promise<unknown>,
  chunkSize: number,
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = items.slice(i, i + chunkSize);
    await updateFn(batch);
  }
}

async function applyCategoryChanges(
  plan: MenuCsvImportPlan,
  createdIds: { categories: string[] },
) {
  const results = new Map<string, NormalizedCategoryRow>();

  for (const category of plan.categories) {
    const existing = plan.existingCategoriesByKey.get(category.categoryKey);
    if (existing) {
      const payload = await adminGraphqlRequest<{
        update_categories_by_pk?: DbCategoryRow | null;
      }>(UPDATE_CATEGORY, {
        category_id: existing.categoryId,
        name: category.categoryName,
        description: category.categoryDescription,
        order_index: category.categorySortOrder,
        type: category.categoryType,
        is_active: category.categoryIsActive,
        csv_key: category.categoryKey,
      });
      const normalized = normalizeCategory(payload.update_categories_by_pk);
      if (!normalized) {
        throw new Error(`Failed to update category "${category.categoryKey}".`);
      }
      results.set(category.categoryKey, normalized);
      continue;
    }

    const payload = await adminGraphqlRequest<{
      insert_categories_one?: DbCategoryRow | null;
    }>(INSERT_CATEGORY, {
      menu_id: plan.context.menu.menuId,
      name: category.categoryName,
      description: category.categoryDescription,
      order_index: category.categorySortOrder,
      type: category.categoryType,
      is_active: category.categoryIsActive,
      csv_key: category.categoryKey,
    });
    const normalized = normalizeCategory(payload.insert_categories_one);
    if (!normalized) {
      throw new Error(`Failed to create category "${category.categoryKey}".`);
    }
    createdIds.categories.push(normalized.categoryId);
    results.set(category.categoryKey, normalized);
  }

  return results;
}

async function applyModifierGroupChanges(
  plan: MenuCsvImportPlan,
  createdIds: { modifierGroups: string[]; modifierItems: string[] },
) {
  const results = new Map<string, ModifierGroupUpsertResult>();
  const modifierItemsByGroupKey = groupBy(
    plan.modifierItems,
    (modifierItem) => modifierItem.modifierGroupKey,
  );

  for (const group of plan.modifierGroups) {
    const existing = plan.existingModifierGroupsByKey.get(group.modifierGroupKey);
    if (existing) {
      results.set(group.modifierGroupKey, {
        modifierGroupId: existing.modifierGroupId,
        csvKey: group.modifierGroupKey,
        reused: true,
      });
      continue;
    }

    const payload = await adminGraphqlRequest<{
      insert_modifier_groups_one?: DbModifierGroupRow | null;
    }>(INSERT_MODIFIER_GROUP, {
      restaurant_id: plan.context.menu.restaurantId,
      name: group.modifierGroupName,
      description: group.modifierGroupDescription,
      min_selection: group.modifierGroupMinSelection,
      max_selection: group.modifierGroupMaxSelection,
      type: group.modifierGroupType,
      is_required: group.modifierGroupIsRequired,
      is_multi_select: group.modifierGroupIsMultiSelect,
      csv_key: group.modifierGroupKey,
    });
    const normalized = normalizeModifierGroup(payload.insert_modifier_groups_one);
    if (!normalized) {
      throw new Error(
        `Failed to create modifier group "${group.modifierGroupKey}".`,
      );
    }

    createdIds.modifierGroups.push(normalized.modifierGroupId);

    results.set(group.modifierGroupKey, {
      modifierGroupId: normalized.modifierGroupId,
      csvKey: group.modifierGroupKey,
      reused: false,
    });

    const modifierItems = modifierItemsByGroupKey.get(group.modifierGroupKey) || [];
    for (const modifierItem of modifierItems) {
      const itemPayload = await adminGraphqlRequest<{
        insert_modifier_items_one?: DbModifierItemRow | null;
      }>(INSERT_MODIFIER_ITEM, {
        modifier_group_id: normalized.modifierGroupId,
        name: modifierItem.modifierItemName,
        price: modifierItem.modifierItemPrice,
        csv_key: modifierItem.modifierItemKey,
      });
      const normalizedItem = normalizeModifierItem(itemPayload.insert_modifier_items_one);
      if (normalizedItem) {
        createdIds.modifierItems.push(normalizedItem.modifierItemId);
      }
    }
  }

  for (const [key, group] of plan.existingModifierGroupsByKey.entries()) {
    if (!results.has(key)) {
      results.set(key, {
        modifierGroupId: group.modifierGroupId,
        csvKey: key,
        reused: true,
      });
    }
  }

  return results;
}

async function applyItemChanges(
  plan: MenuCsvImportPlan,
  categoryResults: Map<string, NormalizedCategoryRow>,
  modifierGroupResults: Map<string, ModifierGroupUpsertResult>,
  createdIds: { items: string[] },
) {
  const importedParentKeys = new Set(
    plan.items
      .map((item) => item.parentItemKey)
      .filter((value): value is string => Boolean(value)),
  );
  const itemModifierLinksByItemKey = groupBy(
    plan.itemModifierLinks,
    (row) => row.itemKey,
  );
  const itemResults = new Map<string, NormalizedItemRow>();

  const orderedItems = [
    ...plan.items.filter((item) => !item.parentItemKey),
    ...plan.items.filter((item) => Boolean(item.parentItemKey)),
  ];

  for (const item of orderedItems) {
    const existing = plan.existingItemsByKey.get(item.itemKey);
    const category = categoryResults.get(item.categoryKey);
    if (!category) {
      throw new Error(
        `Category "${item.categoryKey}" was not resolved during import.`,
      );
    }

    const parentItemId = resolveParentItemId(
      item.parentItemKey,
      itemResults,
      plan.existingItemsByKey,
    );

    const modifierLinks = itemModifierLinksByItemKey.get(item.itemKey) || [];
    const modifierGroupIds = Array.from(
      new Set(
        modifierLinks
          .map((link) => modifierGroupResults.get(link.modifierGroupKey)?.modifierGroupId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const shared = {
      category_id: category.categoryId,
      name: item.itemName,
      description: item.itemDescription,
      delivery_price: item.itemDeliveryPrice,
      pickup_price: item.itemPickupPrice,
      image_url: item.itemImageUrl,
      is_recommended: item.itemIsRecommended,
      is_best_seller: item.itemIsBestSeller,
      is_available: item.itemIsAvailable,
      in_stock: item.itemInStock,
      modifiers:
        modifierGroupIds.length > 0
          ? { modifier_group_ids: modifierGroupIds }
          : null,
      has_variants:
        Boolean(item.parentItemKey) ||
        importedParentKeys.has(item.itemKey) ||
        item.itemHasVariants,
      parent_item_id: parentItemId,
      csv_key: item.itemKey,
    };

    const normalized = existing
      ? normalizeItem(
          (
            await adminGraphqlRequest<{ update_items_by_pk?: DbItemRow | null }>(
              UPDATE_ITEM,
              {
                item_id: existing.itemId,
                ...shared,
              },
            )
          ).update_items_by_pk,
        )
      : normalizeItem(
          (
            await adminGraphqlRequest<{ insert_items_one?: DbItemRow | null }>(
              INSERT_ITEM,
              shared,
            )
          ).insert_items_one,
        );

    if (!normalized) {
      throw new Error(`Failed to upsert item "${item.itemKey}".`);
    }

    if (!existing) {
      createdIds.items.push(normalized.itemId);
    }

    itemResults.set(item.itemKey, normalized);
  }
}

function validateParsedCsvContent(
  parsed: ParsedCsvContent,
  input: {
    existingCategoriesByKey: Map<string, NormalizedCategoryRow>;
    existingItemsByKey: Map<string, NormalizedItemRow>;
    existingModifierGroupsByKey: Map<string, NormalizedModifierGroupRow>;
    issues: MenuCsvIssue[];
  },
) {
  const categoryKeysInCsv = new Set(parsed.categories.map((category) => category.categoryKey));
  const itemKeysInCsv = new Set(parsed.items.map((item) => item.itemKey));
  const modifierGroupKeysInCsv = new Set(
    parsed.modifierGroups.map((group) => group.modifierGroupKey),
  );

  for (const item of parsed.items) {
    if (
      !categoryKeysInCsv.has(item.categoryKey) &&
      !input.existingCategoriesByKey.has(item.categoryKey)
    ) {
      input.issues.push({
        type: 'error',
        rowNumber: item.rowNumber,
        recordType: 'ITEM',
        key: item.itemKey,
        message: `Category key "${item.categoryKey}" does not exist in this CSV or the target menu.`,
      });
    }

    if (
      item.parentItemKey &&
      !itemKeysInCsv.has(item.parentItemKey) &&
      !input.existingItemsByKey.has(item.parentItemKey)
    ) {
      input.issues.push({
        type: 'error',
        rowNumber: item.rowNumber,
        recordType: 'ITEM',
        key: item.itemKey,
        message: `Parent item key "${item.parentItemKey}" does not exist in this CSV or the target menu.`,
      });
    }
  }

  for (const modifierItem of parsed.modifierItems) {
    if (!modifierGroupKeysInCsv.has(modifierItem.modifierGroupKey)) {
      input.issues.push({
        type: 'error',
        rowNumber: modifierItem.rowNumber,
        recordType: 'MODIFIER_ITEM',
        key: modifierItem.modifierItemKey,
        message: `Modifier item references modifier group "${modifierItem.modifierGroupKey}" without a MODIFIER_GROUP row in this CSV.`,
      });
    }
  }

  for (const link of parsed.itemModifierLinks) {
    if (
      !itemKeysInCsv.has(link.itemKey) &&
      !input.existingItemsByKey.has(link.itemKey)
    ) {
      input.issues.push({
        type: 'error',
        rowNumber: link.rowNumber,
        recordType: 'ITEM_MODIFIER_LINK',
        key: link.itemKey,
        message: `Item key "${link.itemKey}" does not exist in this CSV or the target menu.`,
      });
    }

    if (
      !modifierGroupKeysInCsv.has(link.modifierGroupKey) &&
      !input.existingModifierGroupsByKey.has(link.modifierGroupKey)
    ) {
      input.issues.push({
        type: 'error',
        rowNumber: link.rowNumber,
        recordType: 'ITEM_MODIFIER_LINK',
        key: link.modifierGroupKey,
        message: `Modifier group key "${link.modifierGroupKey}" does not exist in this CSV or the restaurant.`,
      });
    }
  }
}

function validateModifierGroupConflicts(
  parsed: ParsedCsvContent,
  input: {
    existingModifierGroupsByKey: Map<string, NormalizedModifierGroupRow>;
    existingModifierItemsByGroupKey: Map<string, Map<string, NormalizedModifierItemRow>>;
    issues: MenuCsvIssue[];
  },
) {
  const modifierItemsByGroupKey = groupBy(
    parsed.modifierItems,
    (modifierItem) => modifierItem.modifierGroupKey,
  );

  for (const group of parsed.modifierGroups) {
    const existing = input.existingModifierGroupsByKey.get(group.modifierGroupKey);
    if (!existing) {
      continue;
    }

    const existingDefinition = buildExistingModifierGroupDefinition(
      existing,
      input.existingModifierItemsByGroupKey.get(group.modifierGroupKey) ||
        new Map<string, NormalizedModifierItemRow>(),
    );
    const csvDefinition = buildCsvModifierGroupDefinition(
      group,
      modifierItemsByGroupKey.get(group.modifierGroupKey) || [],
    );

    if (stringifyDefinition(existingDefinition) !== stringifyDefinition(csvDefinition)) {
      input.issues.push({
        type: 'conflict',
        rowNumber: group.rowNumber,
        recordType: 'MODIFIER_GROUP',
        key: group.modifierGroupKey,
        message:
          `Modifier group "${group.modifierGroupKey}" already exists for this restaurant with a different definition. ` +
          'V1 import will not overwrite shared modifier groups automatically.',
      });
    }
  }
}

function buildSummary(
  parsed: ParsedCsvContent,
  input: {
    existingCategoriesByKey: Map<string, NormalizedCategoryRow>;
    existingItemsByKey: Map<string, NormalizedItemRow>;
    existingModifierGroupsByKey: Map<string, NormalizedModifierGroupRow>;
    issues: MenuCsvIssue[];
  },
): MenuCsvImportSummary {
  let categoriesToCreate = 0;
  let categoriesToUpdate = 0;
  let itemsToCreate = 0;
  let itemsToUpdate = 0;
  let modifierGroupsToCreate = 0;
  let modifierGroupsToReuse = 0;

  for (const category of parsed.categories) {
    if (input.existingCategoriesByKey.has(category.categoryKey)) {
      categoriesToUpdate += 1;
    } else {
      categoriesToCreate += 1;
    }
  }

  for (const item of parsed.items) {
    if (input.existingItemsByKey.has(item.itemKey)) {
      itemsToUpdate += 1;
    } else {
      itemsToCreate += 1;
    }
  }

  for (const group of parsed.modifierGroups) {
    if (input.existingModifierGroupsByKey.has(group.modifierGroupKey)) {
      modifierGroupsToReuse += 1;
    } else {
      modifierGroupsToCreate += 1;
    }
  }

  return {
    categoriesToCreate,
    categoriesToUpdate,
    itemsToCreate,
    itemsToUpdate,
    modifierGroupsToCreate,
    modifierGroupsToReuse,
    modifierItemsToCreate: parsed.modifierItems.filter(
      (modifierItem) =>
        !input.existingModifierGroupsByKey.has(modifierItem.modifierGroupKey),
    ).length,
    itemModifierLinksToApply: dedupeItemModifierLinks(parsed.itemModifierLinks).length,
    errors: input.issues.filter((issue) => issue.type === 'error').length,
    conflicts: input.issues.filter((issue) => issue.type === 'conflict').length,
    warnings: input.issues.filter((issue) => issue.type === 'warning').length,
  };
}

function buildExportRows(context: MenuCsvContext) {
  const rows: Record<MenuCsvHeader, string>[] = [];
  const categoryById = new Map(
    context.categories.map((category) => [category.categoryId, category] as const),
  );
  const itemById = new Map(context.items.map((item) => [item.itemId, item] as const));
  const usedModifierGroupIds = Array.from(
    new Set(context.items.flatMap((item) => modifierGroupIdsFromValue(item.modifiers))),
  );
  const modifierGroups = context.modifierGroups.filter((group) =>
    usedModifierGroupIds.includes(group.modifierGroupId),
  );
  const modifierItemsByGroupId = groupBy(
    context.modifierItems.filter((modifierItem) =>
      usedModifierGroupIds.includes(modifierItem.modifierGroupId),
    ),
    (modifierItem) => modifierItem.modifierGroupId,
  );

  for (const category of context.categories) {
    rows.push(
      createCsvRow({
        record_type: 'CATEGORY',
        category_key: category.csvKey || '',
        category_name: category.name,
        category_description: category.description || '',
        category_sort_order: String(category.orderIndex),
        category_type: category.type,
        category_is_active: formatBoolean(category.isActive),
      }),
    );
  }

  for (const group of modifierGroups) {
    rows.push(
      createCsvRow({
        record_type: 'MODIFIER_GROUP',
        modifier_group_key: group.csvKey || '',
        modifier_group_name: group.name,
        modifier_group_description: group.description || '',
        modifier_group_type: group.type,
        modifier_group_min_selection: formatNumber(group.minSelection),
        modifier_group_max_selection: formatNumber(group.maxSelection),
        modifier_group_is_required: formatBoolean(group.isRequired),
        modifier_group_is_multi_select: formatBoolean(group.isMultiSelect),
      }),
    );

    const groupItems = modifierItemsByGroupId.get(group.modifierGroupId) || [];
    for (const modifierItem of groupItems) {
      rows.push(
        createCsvRow({
          record_type: 'MODIFIER_ITEM',
          modifier_group_key: group.csvKey || '',
          modifier_item_key: modifierItem.csvKey || '',
          modifier_item_name: modifierItem.name,
          modifier_item_price: formatPrice(modifierItem.price),
        }),
      );
    }
  }

  for (const item of context.items) {
    const category = categoryById.get(item.categoryId);
    if (!category) {
      continue;
    }
    const parentItem = item.parentItemId ? itemById.get(item.parentItemId) : null;

    rows.push(
      createCsvRow({
        record_type: 'ITEM',
        category_key: category.csvKey || '',
        item_key: item.csvKey || '',
        item_name: item.name,
        item_description: item.description || '',
        item_delivery_price: formatPrice(item.deliveryPrice),
        item_pickup_price: formatPrice(item.pickupPrice),
        item_image_url: item.imageUrl || '',
        item_is_recommended: formatBoolean(item.isRecommended),
        item_is_best_seller: formatBoolean(item.isBestSeller),
        item_is_available: formatBoolean(item.isAvailable),
        item_in_stock: formatBoolean(item.inStock),
        item_has_variants: formatBoolean(item.hasVariants),
        parent_item_key: parentItem?.csvKey || '',
      }),
    );
  }

  for (const item of context.items) {
    const modifierGroupIds = modifierGroupIdsFromValue(item.modifiers);
    for (const modifierGroupId of modifierGroupIds) {
      const modifierGroup = modifierGroups.find(
        (group) => group.modifierGroupId === modifierGroupId,
      );
      if (!modifierGroup?.csvKey || !item.csvKey) {
        continue;
      }

      rows.push(
        createCsvRow({
          record_type: 'ITEM_MODIFIER_LINK',
          item_key: item.csvKey,
          modifier_group_key: modifierGroup.csvKey,
        }),
      );
    }
  }

  return rows;
}

function parseMenuCsv(csvText: string): ParsedCsvContent {
  const issues: MenuCsvIssue[] = [];
  const categories: ParsedCategoryCsvRecord[] = [];
  const items: ParsedItemCsvRecord[] = [];
  const modifierGroups: ParsedModifierGroupCsvRecord[] = [];
  const modifierItems: ParsedModifierItemCsvRecord[] = [];
  const itemModifierLinks: ParsedItemModifierLinkCsvRecord[] = [];

  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    return {
      categories,
      items,
      modifierGroups,
      modifierItems,
      itemModifierLinks,
      issues: [
        {
          type: 'error',
          rowNumber: null,
          recordType: 'FILE',
          key: null,
          message: 'CSV file is empty.',
        },
      ],
    };
  }

  const headerRow = rows[0].map((cell) => stripBom(cell).trim());
  const missingHeaders = MENU_CSV_HEADERS.filter((header) => !headerRow.includes(header));
  if (missingHeaders.length) {
    issues.push({
      type: 'error',
      rowNumber: 1,
      recordType: 'FILE',
      key: null,
      message: `CSV is missing required columns: ${missingHeaders.join(', ')}.`,
    });
    return {
      categories,
      items,
      modifierGroups,
      modifierItems,
      itemModifierLinks,
      issues,
    };
  }

  const headerIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    headerIndex.set(header, index);
  });

  const keyTrackers = {
    category: new Set<string>(),
    item: new Set<string>(),
    modifierGroup: new Set<string>(),
    modifierItem: new Set<string>(),
    itemModifierLink: new Set<string>(),
  };

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const rawRow = rows[rowIndex];
    const rowNumber = rowIndex + 1;
    const row = readCsvRow(rawRow, headerIndex);
    if (isCsvRowEmpty(row)) {
      continue;
    }

    const recordType = normalizeRecordType(row.record_type);
    if (!recordType) {
      issues.push({
        type: 'error',
        rowNumber,
        recordType: 'FILE',
        key: null,
        message: `Unknown record_type "${row.record_type || ''}".`,
      });
      continue;
    }

    switch (recordType) {
      case 'CATEGORY': {
        const categoryKey = normalizeRequiredKey(row.category_key);
        const categoryName = normalizeRequiredString(row.category_name);
        const categorySortOrder = parseInteger(row.category_sort_order, 0);
        const categoryType = normalizeOptionalString(row.category_type) || 'default';

        if (!categoryKey || !categoryName) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: categoryKey,
            message: 'CATEGORY rows require category_key and category_name.',
          });
          continue;
        }

        if (keyTrackers.category.has(categoryKey)) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: categoryKey,
            message: `Duplicate category_key "${categoryKey}" in CSV.`,
          });
          continue;
        }
        keyTrackers.category.add(categoryKey);

        categories.push({
          rowNumber,
          categoryKey,
          categoryName,
          categoryDescription: normalizeOptionalString(row.category_description),
          categorySortOrder,
          categoryType,
          categoryIsActive: parseBoolean(row.category_is_active, true),
        });
        break;
      }
      case 'ITEM': {
        const itemKey = normalizeRequiredKey(row.item_key);
        const categoryKey = normalizeRequiredKey(row.category_key);
        const itemName = normalizeRequiredString(row.item_name);
        const deliveryPrice = parsePrice(row.item_delivery_price);
        const pickupPrice = parsePrice(row.item_pickup_price);

        if (
          !itemKey ||
          !categoryKey ||
          !itemName ||
          deliveryPrice === null ||
          pickupPrice === null
        ) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: itemKey,
            message:
              'ITEM rows require item_key, category_key, item_name, item_delivery_price, and item_pickup_price.',
          });
          continue;
        }

        // Validate prices
        if (deliveryPrice < 0) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: itemKey,
            message: `Delivery price cannot be negative (got ${deliveryPrice}).`,
          });
          continue;
        }

        if (pickupPrice < 0) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: itemKey,
            message: `Pickup price cannot be negative (got ${pickupPrice}).`,
          });
          continue;
        }

        const MAX_PRICE = 99999.99;
        if (deliveryPrice > MAX_PRICE || pickupPrice > MAX_PRICE) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: itemKey,
            message: `Prices must be less than $${MAX_PRICE.toLocaleString()}.`,
          });
          continue;
        }

        // Validate image URL if provided
        const imageUrl = normalizeOptionalString(row.item_image_url);
        if (imageUrl && !isValidUrl(imageUrl)) {
          issues.push({
            type: 'warning',
            rowNumber,
            recordType,
            key: itemKey,
            message: `Image URL "${imageUrl}" may not be valid. Expected format: https://... or /api/...`,
          });
        }

        if (keyTrackers.item.has(itemKey)) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: itemKey,
            message: `Duplicate item_key "${itemKey}" in CSV.`,
          });
          continue;
        }
        keyTrackers.item.add(itemKey);

        items.push({
          rowNumber,
          itemKey,
          categoryKey,
          itemName,
          itemDescription: normalizeOptionalString(row.item_description),
          itemDeliveryPrice: deliveryPrice,
          itemPickupPrice: pickupPrice,
          itemImageUrl: imageUrl,
          itemIsRecommended: parseBoolean(row.item_is_recommended, false),
          itemIsBestSeller: parseBoolean(row.item_is_best_seller, false),
          itemIsAvailable: parseBoolean(row.item_is_available, true),
          itemInStock: parseBoolean(row.item_in_stock, true),
          itemHasVariants: parseBoolean(row.item_has_variants, false),
          parentItemKey: normalizeOptionalString(row.parent_item_key),
        });
        break;
      }
      case 'MODIFIER_GROUP': {
        const modifierGroupKey = normalizeRequiredKey(row.modifier_group_key);
        const modifierGroupName = normalizeRequiredString(row.modifier_group_name);
        const minSelection = parseInteger(row.modifier_group_min_selection, 0);
        const maxSelection = parseInteger(row.modifier_group_max_selection, 0);

        if (!modifierGroupKey || !modifierGroupName) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierGroupKey,
            message:
              'MODIFIER_GROUP rows require modifier_group_key and modifier_group_name.',
          });
          continue;
        }

        // Validate min/max selection
        if (minSelection < 0) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierGroupKey,
            message: `Min selection cannot be negative (got ${minSelection}).`,
          });
          continue;
        }

        if (maxSelection < 0) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierGroupKey,
            message: `Max selection cannot be negative (got ${maxSelection}).`,
          });
          continue;
        }

        if (minSelection > maxSelection) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierGroupKey,
            message: `Min selection (${minSelection}) cannot exceed max selection (${maxSelection}).`,
          });
          continue;
        }

        if (keyTrackers.modifierGroup.has(modifierGroupKey)) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierGroupKey,
            message: `Duplicate modifier_group_key "${modifierGroupKey}" in CSV.`,
          });
          continue;
        }
        keyTrackers.modifierGroup.add(modifierGroupKey);

        modifierGroups.push({
          rowNumber,
          modifierGroupKey,
          modifierGroupName,
          modifierGroupDescription: normalizeOptionalString(
            row.modifier_group_description,
          ),
          modifierGroupType:
            normalizeOptionalString(row.modifier_group_type) || 'Regular',
          modifierGroupMinSelection: minSelection,
          modifierGroupMaxSelection: maxSelection,
          modifierGroupIsRequired: parseBoolean(
            row.modifier_group_is_required,
            false,
          ),
          modifierGroupIsMultiSelect: parseBoolean(
            row.modifier_group_is_multi_select,
            false,
          ),
        });
        break;
      }
      case 'MODIFIER_ITEM': {
        const modifierGroupKey = normalizeRequiredKey(row.modifier_group_key);
        const modifierItemKey = normalizeRequiredKey(row.modifier_item_key);
        const modifierItemName = normalizeRequiredString(row.modifier_item_name);
        const modifierItemPrice = parsePrice(row.modifier_item_price);

        if (
          !modifierGroupKey ||
          !modifierItemKey ||
          !modifierItemName ||
          modifierItemPrice === null
        ) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierItemKey,
            message:
              'MODIFIER_ITEM rows require modifier_group_key, modifier_item_key, modifier_item_name, and modifier_item_price.',
          });
          continue;
        }

        // Validate price
        if (modifierItemPrice < 0) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierItemKey,
            message: `Modifier item price cannot be negative (got ${modifierItemPrice}).`,
          });
          continue;
        }

        const MAX_PRICE = 99999.99;
        if (modifierItemPrice > MAX_PRICE) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: modifierItemKey,
            message: `Modifier item price must be less than $${MAX_PRICE.toLocaleString()}.`,
          });
          continue;
        }

        const compositeKey = `${modifierGroupKey}::${modifierItemKey}`;
        if (keyTrackers.modifierItem.has(compositeKey)) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: compositeKey,
            message: `Duplicate modifier item key "${modifierItemKey}" under group "${modifierGroupKey}".`,
          });
          continue;
        }
        keyTrackers.modifierItem.add(compositeKey);

        modifierItems.push({
          rowNumber,
          modifierGroupKey,
          modifierItemKey,
          modifierItemName,
          modifierItemPrice,
        });
        break;
      }
      case 'ITEM_MODIFIER_LINK': {
        const itemKey = normalizeRequiredKey(row.item_key);
        const modifierGroupKey = normalizeRequiredKey(row.modifier_group_key);
        if (!itemKey || !modifierGroupKey) {
          issues.push({
            type: 'error',
            rowNumber,
            recordType,
            key: itemKey || modifierGroupKey,
            message: 'ITEM_MODIFIER_LINK rows require item_key and modifier_group_key.',
          });
          continue;
        }

        const compositeKey = `${itemKey}::${modifierGroupKey}`;
        if (keyTrackers.itemModifierLink.has(compositeKey)) {
          issues.push({
            type: 'warning',
            rowNumber,
            recordType,
            key: compositeKey,
            message: `Duplicate modifier link "${compositeKey}" found. It will be applied only once.`,
          });
        }
        keyTrackers.itemModifierLink.add(compositeKey);

        itemModifierLinks.push({
          rowNumber,
          itemKey,
          modifierGroupKey,
        });
        break;
      }
    }
  }

  return {
    categories,
    items,
    modifierGroups,
    modifierItems,
    itemModifierLinks,
    issues,
  };
}

function buildCsvText(rows: Record<MenuCsvHeader, string>[]) {
  const csvRows = [MENU_CSV_HEADERS.join(',')];
  for (const row of rows) {
    csvRows.push(
      MENU_CSV_HEADERS.map((header) => escapeCsvValue(row[header] || '')).join(','),
    );
  }

  return `\uFEFF${csvRows.join('\r\n')}`;
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === ',') {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if (!inQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function readCsvRow(
  rawRow: string[],
  headerIndex: Map<string, number>,
): Record<MenuCsvHeader, string> {
  return MENU_CSV_HEADERS.reduce((result, header) => {
    const index = headerIndex.get(header) ?? -1;
    result[header] = index >= 0 ? (rawRow[index] || '').trim() : '';
    return result;
  }, {} as Record<MenuCsvHeader, string>);
}

function isCsvRowEmpty(row: Record<MenuCsvHeader, string>) {
  return MENU_CSV_HEADERS.every((header) => !row[header]);
}

function createCsvRow(overrides: Partial<Record<MenuCsvHeader, string>>) {
  return MENU_CSV_HEADERS.reduce((result, header) => {
    result[header] = overrides[header] || '';
    return result;
  }, {} as Record<MenuCsvHeader, string>);
}

function buildExistingModifierItemsByGroupKey(
  groups: NormalizedModifierGroupRow[],
  modifierItems: NormalizedModifierItemRow[],
  issues: MenuCsvIssue[],
) {
  const groupKeyById = new Map(
    groups
      .filter((group) => Boolean(group.csvKey))
      .map((group) => [group.modifierGroupId, group.csvKey as string] as const),
  );

  const result = new Map<string, Map<string, NormalizedModifierItemRow>>();
  for (const modifierItem of modifierItems) {
    const groupKey = groupKeyById.get(modifierItem.modifierGroupId);
    if (!groupKey || !modifierItem.csvKey) {
      continue;
    }

    const current = result.get(groupKey) || new Map<string, NormalizedModifierItemRow>();
    if (current.has(modifierItem.csvKey)) {
      issues.push({
        type: 'error',
        rowNumber: null,
        recordType: 'MODIFIER_ITEM',
        key: `${groupKey}::${modifierItem.csvKey}`,
        message:
          `Restaurant already has duplicate modifier item keys for group "${groupKey}".`,
      });
    } else {
      current.set(modifierItem.csvKey, modifierItem);
    }
    result.set(groupKey, current);
  }

  return result;
}

function buildUniqueMap<T>(
  rows: T[],
  readKey: (row: T) => string | null,
  recordType: MenuCsvRecordType,
  issues: MenuCsvIssue[],
  duplicateMessage: string,
) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = readKey(row);
    if (!key) {
      continue;
    }
    if (map.has(key)) {
      issues.push({
        type: 'error',
        rowNumber: null,
        recordType,
        key,
        message: duplicateMessage,
      });
      continue;
    }
    map.set(key, row);
  }
  return map;
}

function buildMissingKeyAssignments<T>(
  rows: T[],
  readName: (row: T) => string,
  readKey: (row: T) => string | null,
  readId: (row: T) => string,
  readScope: (row: T) => string = () => 'global',
) {
  const usedKeysByScope = new Map<string, Set<string>>();
  for (const row of rows) {
    const scope = readScope(row);
    const key = readKey(row);
    if (!usedKeysByScope.has(scope)) {
      usedKeysByScope.set(scope, new Set<string>());
    }
    if (key) {
      usedKeysByScope.get(scope)?.add(key);
    }
  }

  const assignments: Array<{ id: string; key: string }> = [];
  for (const row of rows) {
    const scope = readScope(row);
    const key = readKey(row);
    if (key) {
      continue;
    }
    const used = usedKeysByScope.get(scope) || new Set<string>();
    const nextKey = generateUniqueKey(readName(row), used);
    used.add(nextKey);
    usedKeysByScope.set(scope, used);
    assignments.push({
      id: readId(row),
      key: nextKey,
    });
  }

  return assignments;
}

function groupBy<T>(rows: T[], readKey: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = readKey(row);
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
  }
  return map;
}

function buildExistingModifierGroupDefinition(
  group: NormalizedModifierGroupRow,
  modifierItems: Map<string, NormalizedModifierItemRow>,
): ModifierGroupDefinition {
  return {
    name: normalizeDefinitionString(group.name),
    description: normalizeDefinitionString(group.description),
    type: normalizeDefinitionString(group.type),
    minSelection: group.minSelection,
    maxSelection: group.maxSelection,
    isRequired: group.isRequired,
    isMultiSelect: group.isMultiSelect,
    items: Array.from(modifierItems.values())
      .map((modifierItem) => ({
        key: normalizeDefinitionString(modifierItem.csvKey),
        name: normalizeDefinitionString(modifierItem.name),
        price: formatPrice(modifierItem.price),
      }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  };
}

function buildCsvModifierGroupDefinition(
  group: ParsedModifierGroupCsvRecord,
  modifierItems: ParsedModifierItemCsvRecord[],
): ModifierGroupDefinition {
  return {
    name: normalizeDefinitionString(group.modifierGroupName),
    description: normalizeDefinitionString(group.modifierGroupDescription),
    type: normalizeDefinitionString(group.modifierGroupType),
    minSelection: group.modifierGroupMinSelection,
    maxSelection: group.modifierGroupMaxSelection,
    isRequired: group.modifierGroupIsRequired,
    isMultiSelect: group.modifierGroupIsMultiSelect,
    items: modifierItems
      .map((modifierItem) => ({
        key: normalizeDefinitionString(modifierItem.modifierItemKey),
        name: normalizeDefinitionString(modifierItem.modifierItemName),
        price: formatPrice(modifierItem.modifierItemPrice),
      }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  };
}

function stringifyDefinition(value: ModifierGroupDefinition) {
  return JSON.stringify(value);
}

function resolveParentItemId(
  parentItemKey: string | null,
  importedItemResults: Map<string, NormalizedItemRow>,
  existingItemsByKey: Map<string, NormalizedItemRow>,
) {
  if (!parentItemKey) {
    return null;
  }

  return (
    importedItemResults.get(parentItemKey)?.itemId ||
    existingItemsByKey.get(parentItemKey)?.itemId ||
    null
  );
}

function dedupeItemModifierLinks(rows: ParsedItemModifierLinkCsvRecord[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.itemKey}::${row.modifierGroupKey}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function modifierGroupIdsFromValue(modifiers: unknown) {
  if (Array.isArray(modifiers)) {
    return modifiers.filter(
      (value): value is string => typeof value === 'string' && Boolean(value.trim()),
    );
  }

  if (modifiers && typeof modifiers === 'object') {
    const record = modifiers as Record<string, unknown>;
    if (Array.isArray(record.modifier_group_ids)) {
      return record.modifier_group_ids.filter(
        (value): value is string => typeof value === 'string' && Boolean(value.trim()),
      );
    }
  }

  return [] as string[];
}

function normalizeMenu(
  row: DbMenuRow | null | undefined,
): NormalizedMenuRow | null {
  const menuId = normalizeString(row?.menu_id);
  const restaurantId = normalizeString(row?.restaurant_id);
  const name = normalizeString(row?.name);
  if (!menuId || !restaurantId || !name) {
    return null;
  }

  return {
    menuId,
    restaurantId,
    name,
  };
}

function normalizeCategory(
  row: DbCategoryRow | null | undefined,
): NormalizedCategoryRow | null {
  const categoryId = normalizeString(row?.category_id);
  const menuId = normalizeString(row?.menu_id);
  const name = normalizeString(row?.name);
  if (!categoryId || !menuId || !name) {
    return null;
  }

  return {
    categoryId,
    menuId,
    name,
    description: normalizeNullableString(row?.description),
    orderIndex: normalizeNumber(row?.order_index),
    type: normalizeNullableString(row?.type) || 'default',
    isActive: normalizeBoolean(row?.is_active, true),
    csvKey: normalizeNullableString(row?.csv_key),
  };
}

function normalizeItem(
  row: DbItemRow | null | undefined,
): NormalizedItemRow | null {
  const itemId = normalizeString(row?.item_id);
  const categoryId = normalizeString(row?.category_id);
  const name = normalizeString(row?.name);
  if (!itemId || !categoryId || !name) {
    return null;
  }

  return {
    itemId,
    categoryId,
    name,
    description: normalizeNullableString(row?.description),
    deliveryPrice: normalizeNumber(row?.delivery_price),
    pickupPrice: normalizeNumber(row?.pickup_price),
    imageUrl: normalizeNullableString(row?.image_url),
    isRecommended: normalizeBoolean(row?.is_recommended, false),
    isBestSeller: normalizeBoolean(row?.is_best_seller, false),
    isAvailable: normalizeBoolean(row?.is_available, true),
    inStock: normalizeBoolean(row?.in_stock, true),
    modifiers: row?.modifiers ?? null,
    hasVariants: normalizeBoolean(row?.has_variants, false),
    parentItemId: normalizeNullableString(row?.parent_item_id),
    csvKey: normalizeNullableString(row?.csv_key),
  };
}

function normalizeModifierGroup(
  row: DbModifierGroupRow | null | undefined,
): NormalizedModifierGroupRow | null {
  const modifierGroupId = normalizeString(row?.modifier_group_id);
  const restaurantId = normalizeString(row?.restaurant_id);
  const name = normalizeString(row?.name);
  if (!modifierGroupId || !restaurantId || !name) {
    return null;
  }

  return {
    modifierGroupId,
    restaurantId,
    name,
    description: normalizeNullableString(row?.description),
    minSelection: normalizeNumber(row?.min_selection),
    maxSelection: normalizeNumber(row?.max_selection),
    type: normalizeNullableString(row?.type) || 'Regular',
    isRequired: normalizeBoolean(row?.is_required, false),
    isMultiSelect: normalizeBoolean(row?.is_multi_select, false),
    csvKey: normalizeNullableString(row?.csv_key),
  };
}

function normalizeModifierItem(
  row: DbModifierItemRow | null | undefined,
): NormalizedModifierItemRow | null {
  const modifierItemId = normalizeString(row?.modifier_item_id);
  const modifierGroupId = normalizeString(row?.modifier_group_id);
  const name = normalizeString(row?.name);
  if (!modifierItemId || !modifierGroupId || !name) {
    return null;
  }

  return {
    modifierItemId,
    modifierGroupId,
    name,
    price: normalizeNumber(row?.price),
    csvKey: normalizeNullableString(row?.csv_key),
  };
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeRequiredString(value: string) {
  const normalized = normalizeString(value);
  return normalized || '';
}

function normalizeRequiredKey(value: string) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  return slugify(normalized);
}

function normalizeOptionalString(value: string) {
  return normalizeString(value);
}

function normalizeRecordType(value: string): MenuCsvRecordType | null {
  const normalized = normalizeString(value)?.toUpperCase();
  if (
    normalized === 'CATEGORY' ||
    normalized === 'ITEM' ||
    normalized === 'MODIFIER_GROUP' ||
    normalized === 'MODIFIER_ITEM' ||
    normalized === 'ITEM_MODIFIER_LINK'
  ) {
    return normalized;
  }

  return null;
}

function parseBoolean(value: string, fallback: boolean) {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['true', 'yes', '1'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', '0'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseInteger(value: string, fallback: number) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePrice(value: string) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function sortItemsForExport(left: NormalizedItemRow, right: NormalizedItemRow) {
  if (left.parentItemId && !right.parentItemId) {
    return 1;
  }
  if (!left.parentItemId && right.parentItemId) {
    return -1;
  }
  return left.name.localeCompare(right.name);
}

function generateUniqueKey(value: string, used: Set<string>) {
  const base = slugify(value) || 'record';
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeDefinitionString(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function formatBoolean(value: boolean) {
  return value ? 'true' : 'false';
}

function formatPrice(value: number) {
  return value.toFixed(2);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, '');
}

function normalizeCsvFileName(value: string | undefined) {
  const normalized = normalizeString(value);
  return normalized || 'menu-import.csv';
}

function sortIssues(issues: MenuCsvIssue[]) {
  return [...issues].sort((left, right) => {
    const leftRow = left.rowNumber ?? Number.MAX_SAFE_INTEGER;
    const rightRow = right.rowNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftRow !== rightRow) {
      return leftRow - rightRow;
    }

    const severityOrder: Record<IssueType, number> = {
      error: 0,
      conflict: 1,
      warning: 2,
    };
    return severityOrder[left.type] - severityOrder[right.type];
  });
}

function isValidUrl(url: string) {
  // Allow relative URLs (e.g., /api/image-proxy?fileId=...)
  if (url.startsWith('/')) {
    return true;
  }

  // Validate absolute URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
