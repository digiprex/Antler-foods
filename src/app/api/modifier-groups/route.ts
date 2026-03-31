/**
 * Modifier Groups API Route
 * 
 * Handles CRUD operations for modifier groups:
 * - GET: Fetch all active modifier groups
 * - POST: Create new modifier group
 * - PUT: Update existing modifier group
 * - DELETE: Delete modifier group (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

// GraphQL queries and mutations
const GET_MODIFIER_GROUPS = `
  query GetModifierGroups($restaurant_id: uuid!) {
    modifier_groups(
      where: { is_deleted: { _eq: false }, restaurant_id: { _eq: $restaurant_id } }
      order_by: { created_at: asc }
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
      created_at
      updated_at
      is_deleted
    }
  }
`;

const INSERT_MODIFIER_GROUP = `
  mutation InsertModifierGroup(
    $restaurant_id: uuid!
    $name: String!
    $description: String
    $min_selection: numeric!
    $max_selection: numeric!
    $type: String!
    $is_required: Boolean!
    $is_multi_select: Boolean!
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
      created_at
      updated_at
      is_deleted
    }
  }
`;

const UPDATE_MODIFIER_GROUP = `
  mutation UpdateModifierGroup(
    $modifier_group_id: uuid!
    $restaurant_id: uuid!
    $name: String!
    $description: String
    $min_selection: numeric!
    $max_selection: numeric!
    $type: String!
    $is_required: Boolean!
    $is_multi_select: Boolean!
  ) {
    update_modifier_groups_by_pk(
      pk_columns: { modifier_group_id: $modifier_group_id }
      _set: {
        restaurant_id: $restaurant_id
        name: $name
        description: $description
        min_selection: $min_selection
        max_selection: $max_selection
        type: $type
        is_required: $is_required
        is_multi_select: $is_multi_select
        updated_at: "now()"
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
      created_at
      updated_at
      is_deleted
    }
  }
`;

const DELETE_MODIFIER_GROUP = `
  mutation DeleteModifierGroup($modifier_group_id: uuid!) {
    update_modifier_groups_by_pk(
      pk_columns: { modifier_group_id: $modifier_group_id }
      _set: { 
        is_deleted: true, 
        updated_at: "now()" 
      }
    ) {
      modifier_group_id
      is_deleted
    }
  }
`;

interface GetModifierGroupsResponse {
  modifier_groups: any[];
}

interface InsertModifierGroupResponse {
  insert_modifier_groups_one: any;
}

interface UpdateModifierGroupResponse {
  update_modifier_groups_by_pk: any;
}

interface DeleteModifierGroupResponse {
  update_modifier_groups_by_pk: any;
}

/**
 * GET - Fetch all active modifier groups
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<GetModifierGroupsResponse>(
      GET_MODIFIER_GROUPS,
      { restaurant_id: restaurantId }
    );

    return NextResponse.json({
      success: true,
      modifier_groups: data.modifier_groups || []
    });

  } catch (error) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch modifier groups'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new modifier group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurant_id,
      name,
      description,
      min_selection = 0,
      max_selection = 0,
      type = 'Regular',
      is_required = false,
      is_multi_select = false
    } = body;

    // Validation
    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<InsertModifierGroupResponse>(
      INSERT_MODIFIER_GROUP,
      {
        restaurant_id,
        name,
        description,
        min_selection: Number(min_selection),
        max_selection: Number(max_selection),
        type,
        is_required: Boolean(is_required),
        is_multi_select: Boolean(is_multi_select)
      }
    );

    if (!data.insert_modifier_groups_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to create modifier group' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      modifier_group: data.insert_modifier_groups_one
    });

  } catch (error) {
    console.error('Error creating modifier group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create modifier group' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing modifier group
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modifier_group_id,
      restaurant_id,
      name,
      description,
      min_selection = 0,
      max_selection = 0,
      type = 'Regular',
      is_required = false,
      is_multi_select = false
    } = body;

    // Validation
    if (!modifier_group_id || !name) {
      return NextResponse.json(
        { success: false, error: 'Modifier group ID and name are required' },
        { status: 400 }
      );
    }

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<UpdateModifierGroupResponse>(
      UPDATE_MODIFIER_GROUP,
      {
        modifier_group_id,
        restaurant_id,
        name,
        description,
        min_selection: Number(min_selection),
        max_selection: Number(max_selection),
        type,
        is_required: Boolean(is_required),
        is_multi_select: Boolean(is_multi_select)
      }
    );

    if (!data.update_modifier_groups_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Modifier group not found or failed to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modifier_group: data.update_modifier_groups_by_pk
    });

  } catch (error) {
    console.error('Error updating modifier group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update modifier group' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete modifier group
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modifierGroupId = searchParams.get('modifier_group_id');

    if (!modifierGroupId) {
      return NextResponse.json(
        { success: false, error: 'Modifier group ID is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<DeleteModifierGroupResponse>(
      DELETE_MODIFIER_GROUP,
      { modifier_group_id: modifierGroupId }
    );

    if (!data.update_modifier_groups_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Modifier group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Modifier group deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting modifier group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete modifier group' 
      },
      { status: 500 }
    );
  }
}
