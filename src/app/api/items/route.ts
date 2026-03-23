/**
 * Menu Items API Route
 * 
 * Handles CRUD operations for menu items:
 * - GET: Fetch items by category_id
 * - POST: Create new item
 * - PUT: Update existing item
 * - DELETE: Delete item (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

// GraphQL queries and mutations
const GET_ITEMS_BY_CATEGORY = `
  query GetItemsByCategory($category_id: uuid!) {
    items(
      where: {
        category_id: { _eq: $category_id },
        is_deleted: { _eq: false }
      }
      order_by: { created_at: asc }
    ) {
      item_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      created_at
      updated_at
      is_deleted
      category_id
      is_available
      in_stock
      modifiers
      has_variants
      parent_item_id
    }
  }
`;

const INSERT_ITEM = `
  mutation InsertItem(
    $name: String!
    $description: String
    $delivery_price: numeric!
    $pickup_price: numeric!
    $image_url: String
    $is_recommended: Boolean!
    $is_best_seller: Boolean!
    $category_id: uuid!
    $is_available: Boolean!
    $in_stock: Boolean!
    $modifiers: jsonb
    $has_variants: Boolean
    $parent_item_id: uuid
  ) {
    insert_items_one(
      object: {
        name: $name
        description: $description
        delivery_price: $delivery_price
        pickup_price: $pickup_price
        image_url: $image_url
        is_recommended: $is_recommended
        is_best_seller: $is_best_seller
        category_id: $category_id
        is_available: $is_available
        in_stock: $in_stock
        modifiers: $modifiers
        has_variants: $has_variants
        parent_item_id: $parent_item_id
      }
    ) {
      item_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      created_at
      updated_at
      is_deleted
      category_id
      is_available
      in_stock
      modifiers
      has_variants
      parent_item_id
    }
  }
`;

const UPDATE_ITEM = `
  mutation UpdateItem(
    $item_id: uuid!
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
    $has_variants: Boolean
    $parent_item_id: uuid
  ) {
    update_items_by_pk(
      pk_columns: { item_id: $item_id }
      _set: {
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
        updated_at: "now()"
      }
    ) {
      item_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      created_at
      updated_at
      is_deleted
      category_id
      is_available
      in_stock
      modifiers
      has_variants
      parent_item_id
    }
  }
`;

const DELETE_ITEM = `
  mutation DeleteItem($item_id: uuid!) {
    update_items_by_pk(
      pk_columns: { item_id: $item_id }
      _set: { 
        is_deleted: true, 
        updated_at: "now()" 
      }
    ) {
      item_id
      is_deleted
    }
  }
`;

interface GetItemsResponse {
  items: any[];
}

interface InsertItemResponse {
  insert_items_one: any;
}

interface UpdateItemResponse {
  update_items_by_pk: any;
}

interface DeleteItemResponse {
  update_items_by_pk: any;
}

/**
 * GET - Fetch items by category_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<GetItemsResponse>(
      GET_ITEMS_BY_CATEGORY,
      { category_id: categoryId }
    );

    return NextResponse.json({
      success: true,
      items: data.items || []
    });

  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch items' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      delivery_price,
      pickup_price,
      image_url,
      is_recommended = false,
      is_best_seller = false,
      category_id,
      is_available = true,
      in_stock = true,
      modifiers,
      has_variants = false,
      parent_item_id
    } = body;

    // Validation
    if (!name || !category_id) {
      return NextResponse.json(
        { success: false, error: 'Name and category_id are required' },
        { status: 400 }
      );
    }

    if (delivery_price === undefined || pickup_price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Both delivery_price and pickup_price are required' },
        { status: 400 }
      );
    }

    // Prepare variables, only include parent_item_id if it's a valid UUID
    const variables: any = {
      name,
      description,
      delivery_price: parseFloat(delivery_price),
      pickup_price: parseFloat(pickup_price),
      image_url,
      is_recommended,
      is_best_seller,
      category_id,
      is_available,
      in_stock,
      modifiers,
      has_variants
    };

    // Only include parent_item_id if it's a non-empty string (valid UUID)
    if (parent_item_id && parent_item_id.trim() !== '') {
      variables.parent_item_id = parent_item_id;
    }

    const data = await adminGraphqlRequest<InsertItemResponse>(
      INSERT_ITEM,
      variables
    );

    if (!data.insert_items_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to create item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data.insert_items_one
    });

  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create item' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing item
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      item_id,
      name,
      description,
      delivery_price,
      pickup_price,
      image_url,
      is_recommended = false,
      is_best_seller = false,
      is_available = true,
      in_stock = true,
      modifiers,
      has_variants = false,
      parent_item_id
    } = body;

    // Validation
    if (!item_id || !name) {
      return NextResponse.json(
        { success: false, error: 'Item ID and name are required' },
        { status: 400 }
      );
    }

    if (delivery_price === undefined || pickup_price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Both delivery_price and pickup_price are required' },
        { status: 400 }
      );
    }

    // Prepare variables, only include parent_item_id if it's a valid UUID
    const variables: any = {
      item_id,
      name,
      description,
      delivery_price: parseFloat(delivery_price),
      pickup_price: parseFloat(pickup_price),
      image_url,
      is_recommended,
      is_best_seller,
      is_available,
      in_stock,
      modifiers,
      has_variants
    };

    // Only include parent_item_id if it's a non-empty string (valid UUID)
    if (parent_item_id && parent_item_id.trim() !== '') {
      variables.parent_item_id = parent_item_id;
    }

    const data = await adminGraphqlRequest<UpdateItemResponse>(
      UPDATE_ITEM,
      variables
    );

    if (!data.update_items_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Item not found or failed to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data.update_items_by_pk
    });

  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update item' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<DeleteItemResponse>(
      DELETE_ITEM,
      { item_id: itemId }
    );

    if (!data.update_items_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete item' 
      },
      { status: 500 }
    );
  }
}