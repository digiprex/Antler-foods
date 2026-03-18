/**
 * Menu Management API Route
 * 
 * Handles CRUD operations for menu definitions in the menu table.
 * Based on the provided schema:
 * - menu_id: uuid, primary key, unique, default: gen_random_uuid()
 * - created_at: timestamp with time zone, default: now()
 * - updated_at: timestamp with time zone, default: now()
 * - is_deleted: boolean, default: false
 * - is_active: boolean, default: false
 * - name: text
 * - restaurant_id: uuid
 * - varies_with_time: boolean, default: false
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch menus for a restaurant
 */
const GET_MENUS_QUERY = `
  query GetMenus($restaurant_id: uuid!) {
    menu(where: {restaurant_id: {_eq: $restaurant_id}, is_deleted: {_eq: false}}, order_by: {created_at: desc}) {
      menu_id
      created_at
      updated_at
      is_deleted
      is_active
      name
      restaurant_id
      varies_with_time
    }
  }
`;

/**
 * GraphQL mutation to create a new menu
 */
const CREATE_MENU_MUTATION = `
  mutation CreateMenu($restaurant_id: uuid!, $name: String!, $is_active: Boolean!, $varies_with_time: Boolean!) {
    insert_menu_one(object: {
      restaurant_id: $restaurant_id,
      name: $name,
      is_active: $is_active,
      varies_with_time: $varies_with_time
    }) {
      menu_id
      created_at
      updated_at
      is_deleted
      is_active
      name
      restaurant_id
      varies_with_time
    }
  }
`;

/**
 * GraphQL mutation to update a menu
 */
const UPDATE_MENU_MUTATION = `
  mutation UpdateMenu($menu_id: uuid!, $name: String!, $is_active: Boolean!, $varies_with_time: Boolean!) {
    update_menu_by_pk(pk_columns: {menu_id: $menu_id}, _set: {
      name: $name,
      is_active: $is_active,
      varies_with_time: $varies_with_time,
      updated_at: "now()"
    }) {
      menu_id
      created_at
      updated_at
      is_deleted
      is_active
      name
      restaurant_id
      varies_with_time
    }
  }
`;

/**
 * GraphQL mutation to soft delete a menu
 */
const DELETE_MENU_MUTATION = `
  mutation DeleteMenu($menu_id: uuid!) {
    update_menu_by_pk(pk_columns: {menu_id: $menu_id}, _set: {
      is_deleted: true,
      updated_at: "now()"
    }) {
      menu_id
      is_deleted
    }
  }
`;

/**
 * GET endpoint to fetch menus for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(GET_MENUS_QUERY, {
      restaurant_id: restaurantId,
    });

    const menus = (data as any).menu || [];

    return NextResponse.json({
      success: true,
      menus,
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menus' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new menu
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, name, is_active = false, varies_with_time = false } = body;

    if (!restaurant_id || !name) {
      return NextResponse.json(
        { error: 'restaurant_id and name are required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(CREATE_MENU_MUTATION, {
      restaurant_id,
      name,
      is_active,
      varies_with_time,
    });

    const menu = (data as any).insert_menu_one;

    return NextResponse.json({
      success: true,
      menu,
    });
  } catch (error) {
    console.error('Error creating menu:', error);
    return NextResponse.json(
      { error: 'Failed to create menu' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint to update a menu
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { menu_id, name, is_active, varies_with_time } = body;

    if (!menu_id || !name) {
      return NextResponse.json(
        { error: 'menu_id and name are required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(UPDATE_MENU_MUTATION, {
      menu_id,
      name,
      is_active,
      varies_with_time,
    });

    const menu = (data as any).update_menu_by_pk;

    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      menu,
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    return NextResponse.json(
      { error: 'Failed to update menu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to soft delete a menu
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menu_id');

    if (!menuId) {
      return NextResponse.json(
        { error: 'menu_id is required' },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest(DELETE_MENU_MUTATION, {
      menu_id: menuId,
    });

    const menu = (data as any).update_menu_by_pk;

    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Menu deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu' },
      { status: 500 }
    );
  }
}