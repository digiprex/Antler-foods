/**
 * Modifier Items API Route
 * 
 * Handles CRUD operations for modifier items in the new separate table:
 * - GET: Fetch all active modifier items (optionally filtered by modifier_group_id)
 * - POST: Create new modifier item
 * - PUT: Update existing modifier item
 * - DELETE: Delete modifier item (soft delete)
 * 
 * Schema:
 * - modifier_item_id: uuid, primary key, unique, default: gen_random_uuid()
 * - created_at: timestamp with time zone, default: now()
 * - updated_at: timestamp with time zone, default: now()
 * - is_deleted: boolean, default: false
 * - name: text
 * - price: numeric
 * - modifier_group_id: uuid
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

// GraphQL queries and mutations
const GET_MODIFIER_ITEMS = `
  query GetModifierItems($modifier_group_id: uuid) {
    modifier_items(
      where: { 
        is_deleted: { _eq: false }
        modifier_group_id: { _eq: $modifier_group_id }
      }
      order_by: { created_at: asc }
    ) {
      modifier_item_id
      name
      price
      modifier_group_id
      created_at
      updated_at
      is_deleted
    }
  }
`;

const GET_ALL_MODIFIER_ITEMS = `
  query GetAllModifierItems {
    modifier_items(
      where: { is_deleted: { _eq: false } }
      order_by: { created_at: asc }
    ) {
      modifier_item_id
      name
      price
      modifier_group_id
      created_at
      updated_at
      is_deleted
    }
  }
`;

const INSERT_MODIFIER_ITEM = `
  mutation InsertModifierItem(
    $name: String!
    $price: numeric!
    $modifier_group_id: uuid!
  ) {
    insert_modifier_items_one(
      object: {
        name: $name
        price: $price
        modifier_group_id: $modifier_group_id
      }
    ) {
      modifier_item_id
      name
      price
      modifier_group_id
      created_at
      updated_at
      is_deleted
    }
  }
`;

const UPDATE_MODIFIER_ITEM = `
  mutation UpdateModifierItem(
    $modifier_item_id: uuid!
    $name: String!
    $price: numeric!
  ) {
    update_modifier_items_by_pk(
      pk_columns: { modifier_item_id: $modifier_item_id }
      _set: {
        name: $name
        price: $price
        updated_at: "now()"
      }
    ) {
      modifier_item_id
      name
      price
      modifier_group_id
      created_at
      updated_at
      is_deleted
    }
  }
`;

const DELETE_MODIFIER_ITEM = `
  mutation DeleteModifierItem($modifier_item_id: uuid!) {
    update_modifier_items_by_pk(
      pk_columns: { modifier_item_id: $modifier_item_id }
      _set: { 
        is_deleted: true, 
        updated_at: "now()" 
      }
    ) {
      modifier_item_id
      is_deleted
    }
  }
`;

interface GetModifierItemsResponse {
  modifier_items: any[];
}

interface InsertModifierItemResponse {
  insert_modifier_items_one: any;
}

interface UpdateModifierItemResponse {
  update_modifier_items_by_pk: any;
}

interface DeleteModifierItemResponse {
  update_modifier_items_by_pk: any;
}

/**
 * GET - Fetch modifier items
 * Query params:
 * - modifier_group_id: Filter by specific modifier group (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modifierGroupId = searchParams.get('modifier_group_id');

    let data: GetModifierItemsResponse;

    if (modifierGroupId) {
      // Fetch items for specific modifier group
      data = await adminGraphqlRequest<GetModifierItemsResponse>(
        GET_MODIFIER_ITEMS,
        { modifier_group_id: modifierGroupId }
      );
    } else {
      // Fetch all modifier items
      data = await adminGraphqlRequest<GetModifierItemsResponse>(
        GET_ALL_MODIFIER_ITEMS
      );
    }

    return NextResponse.json({
      success: true,
      modifier_items: data.modifier_items || []
    });

  } catch (error) {
    console.error('Error fetching modifier items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch modifier items' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new modifier item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      price = 0,
      modifier_group_id
    } = body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!modifier_group_id) {
      return NextResponse.json(
        { success: false, error: 'Modifier group ID is required' },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be a valid number greater than or equal to 0' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<InsertModifierItemResponse>(
      INSERT_MODIFIER_ITEM,
      {
        name: name.trim(),
        price: numericPrice,
        modifier_group_id
      }
    );

    if (!data.insert_modifier_items_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to create modifier item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      modifier_item: data.insert_modifier_items_one
    });

  } catch (error) {
    console.error('Error creating modifier item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create modifier item' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing modifier item
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modifier_item_id,
      name,
      price = 0
    } = body;

    // Validation
    if (!modifier_item_id) {
      return NextResponse.json(
        { success: false, error: 'Modifier item ID is required' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be a valid number greater than or equal to 0' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<UpdateModifierItemResponse>(
      UPDATE_MODIFIER_ITEM,
      {
        modifier_item_id,
        name: name.trim(),
        price: numericPrice
      }
    );

    if (!data.update_modifier_items_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Modifier item not found or failed to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modifier_item: data.update_modifier_items_by_pk
    });

  } catch (error) {
    console.error('Error updating modifier item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update modifier item' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete modifier item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modifierItemId = searchParams.get('modifier_item_id');

    if (!modifierItemId) {
      return NextResponse.json(
        { success: false, error: 'Modifier item ID is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<DeleteModifierItemResponse>(
      DELETE_MODIFIER_ITEM,
      { modifier_item_id: modifierItemId }
    );

    if (!data.update_modifier_items_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Modifier item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Modifier item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting modifier item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete modifier item' 
      },
      { status: 500 }
    );
  }
}