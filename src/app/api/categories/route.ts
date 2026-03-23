/**
 * Categories API Route
 * 
 * Handles CRUD operations for menu categories in the categories table.
 * Based on the provided schema:
 * - category_id: uuid, primary key, unique, default: gen_random_uuid()
 * - name: text
 * - sort_by: numeric
 * - menu_id: uuid
 * - created_at: timestamp with time zone, default: now()
 * - updated_at: timestamp with time zone, default: now()
 * - is_deleted: boolean, default: false
 * - type: text, default: 'default'::text
 * - description: text, nullable
 * - image: text, nullable
 * - modifier_groups: jsonb, nullable
 * - identifiers: jsonb, nullable
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch categories for a menu
 */
const GET_CATEGORIES_QUERY = `
  query GetCategories($menu_id: uuid!) {
    categories(where: {menu_id: {_eq: $menu_id}, is_deleted: {_eq: false}}, order_by: {order_index: asc}) {
      category_id
      name
      order_index
      menu_id
      created_at
      updated_at
      is_deleted
      type
      description
      is_active
    }
  }
`;

/**
 * GraphQL query to resolve the active menu for a restaurant.
 */
const GET_ACTIVE_MENU_QUERY = `
  query GetActiveMenuByRestaurant($restaurant_id: uuid!) {
    menu(
      where: {
        restaurant_id: {_eq: $restaurant_id}
        is_deleted: {_eq: false}
        is_active: {_eq: true}
      }
      order_by: [{updated_at: desc}, {created_at: desc}]
      limit: 1
    ) {
      menu_id
      name
      is_active
      restaurant_id
      updated_at
      created_at
    }
  }
`;

/**
 * GraphQL query to fetch all non-deleted items for a set of categories.
 * We merge these into categories server-side so the client avoids N+1 requests.
 */
const GET_ITEMS_BY_CATEGORY_IDS_QUERY = `
  query GetItemsByCategoryIds($category_ids: [uuid!]) {
    items(
      where: {
        category_id: {_in: $category_ids}
        is_deleted: {_eq: false}
      }
      order_by: [{category_id: asc}, {created_at: asc}]
    ) {
      item_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      is_available
      in_stock
      category_id
      created_at
      updated_at
      is_deleted
      modifiers
      has_variants
      parent_item_id
    }
  }
`;

/**
 * GraphQL mutation to create a new category
 */
const CREATE_CATEGORY_MUTATION = `
  mutation CreateCategory($menu_id: uuid!, $name: String!, $description: String, $order_index: numeric, $type: String, $is_active: Boolean) {
    insert_categories_one(object: {
      menu_id: $menu_id,
      name: $name,
      description: $description,
      order_index: $order_index,
      type: $type,
      is_active: $is_active
    }) {
      category_id
      name
      order_index
      menu_id
      created_at
      updated_at
      is_deleted
      type
      description
      is_active
    }
  }
`;

/**
 * GraphQL mutation to update a category
 */
const UPDATE_CATEGORY_MUTATION = `
  mutation UpdateCategory($category_id: uuid!, $name: String!, $description: String, $order_index: numeric, $type: String, $is_active: Boolean) {
    update_categories_by_pk(pk_columns: {category_id: $category_id}, _set: {
      name: $name,
      description: $description,
      order_index: $order_index,
      type: $type,
      is_active: $is_active,
      updated_at: "now()"
    }) {
      category_id
      name
      order_index
      menu_id
      created_at
      updated_at
      is_deleted
      type
      description
      is_active
    }
  }
`;

/**
 * GraphQL mutation to soft delete a category
 */
const DELETE_CATEGORY_MUTATION = `
  mutation DeleteCategory($category_id: uuid!) {
    update_categories_by_pk(pk_columns: {category_id: $category_id}, _set: {
      is_deleted: true,
      updated_at: "now()"
    }) {
      category_id
      is_deleted
    }
  }
`;

/**
 * GET endpoint to fetch categories for a menu
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menu_id');
    const restaurantId = searchParams.get('restaurant_id');
    const includeItems = searchParams.get('include_items') === 'true';
    const itemPreviewLimitRaw = Number(searchParams.get('item_preview_limit') || '3');
    const itemPreviewLimit = Number.isFinite(itemPreviewLimitRaw) && itemPreviewLimitRaw > 0
      ? Math.min(itemPreviewLimitRaw, 20)
      : 3;

    if (!menuId && !restaurantId) {
      return NextResponse.json(
        { error: 'menu_id or restaurant_id is required' },
        { status: 400 }
      );
    }

    let resolvedMenuId = menuId;

    // If menu_id is not provided, resolve using active menu for restaurant_id.
    if (!resolvedMenuId && restaurantId) {
      const menuData = await adminGraphqlRequest(GET_ACTIVE_MENU_QUERY, {
        restaurant_id: restaurantId,
      });
      const activeMenu = (menuData as any).menu?.[0];

      if (!activeMenu?.menu_id) {
        return NextResponse.json(
          { error: 'No active menu found for this restaurant' },
          { status: 404 }
        );
      }

      resolvedMenuId = activeMenu.menu_id;
    }

    const data = await adminGraphqlRequest(GET_CATEGORIES_QUERY, {
      menu_id: resolvedMenuId,
    });

    const baseCategories = (data as any).categories || [];
    let categories = baseCategories;

    if (includeItems && baseCategories.length > 0) {
      const categoryIds = baseCategories.map((category: any) => category.category_id);
      const itemsData = await adminGraphqlRequest(GET_ITEMS_BY_CATEGORY_IDS_QUERY, {
        category_ids: categoryIds,
      });
      const items = (itemsData as any).items || [];

      const itemsByCategoryId = new Map<string, any[]>();
      for (const item of items) {
        const existingItems = itemsByCategoryId.get(item.category_id) || [];
        existingItems.push(item);
        itemsByCategoryId.set(item.category_id, existingItems);
      }

      categories = baseCategories.map((category: any) => {
        const categoryItems = itemsByCategoryId.get(category.category_id) || [];
        return {
          ...category,
          items: categoryItems.slice(0, itemPreviewLimit),
          items_count: categoryItems.length,
        };
      });
    }

    return NextResponse.json({
      success: true,
      menu_id: resolvedMenuId,
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menu_id, name, description, order_index = 0, type = 'default', is_active = true } = body;

    if (!menu_id || !name) {
      return NextResponse.json(
        { error: 'menu_id and name are required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(CREATE_CATEGORY_MUTATION, {
      menu_id,
      name,
      description,
      order_index,
      type,
      is_active,
    });

    const category = (data as any).insert_categories_one;

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint to update a category
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_id, name, description, order_index, type, is_active } = body;

    if (!category_id || !name) {
      return NextResponse.json(
        { error: 'category_id and name are required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(UPDATE_CATEGORY_MUTATION, {
      category_id,
      name,
      description,
      order_index,
      type,
      is_active,
    });

    const category = (data as any).update_categories_by_pk;

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to soft delete a category
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(DELETE_CATEGORY_MUTATION, {
      category_id: categoryId,
    });

    const category = (data as any).update_categories_by_pk;

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
