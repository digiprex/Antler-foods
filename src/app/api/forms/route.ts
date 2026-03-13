/**
 * Forms API Routes
 * 
 * Handles CRUD operations for dynamic forms
 * GET /api/forms - List all forms for a restaurant
 * POST /api/forms - Create a new form
 * PUT /api/forms - Update an existing form
 * DELETE /api/forms - Delete a form (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import type { Form, FormPayload } from '@/types/forms.types';

// GET - List forms for a restaurant or get a single form by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const formId = searchParams.get('form_id');

    // If form_id is provided, fetch a single form
    if (formId) {
      const data = await adminGraphqlRequest(`
        query GetForm($form_id: uuid!) {
          forms_by_pk(form_id: $form_id) {
            form_id
            created_at
            updated_at
            title
            email
            fields
            restaurant_id
            is_deleted
          }
        }
      `, {
        form_id: formId
      });

      const form = (data as any).forms_by_pk;
      
      if (!form || form.is_deleted) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: form
      });
    }

    // Otherwise, list forms for a restaurant
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Query forms for the restaurant
    const data = await adminGraphqlRequest(`
      query GetForms($restaurant_id: uuid!) {
        forms(
          where: {
            restaurant_id: { _eq: $restaurant_id },
            is_deleted: { _eq: false }
          }
          order_by: { created_at: desc }
        ) {
          form_id
          created_at
          updated_at
          title
          email
          fields
          restaurant_id
        }
      }
    `, {
      restaurant_id: restaurantId
    });

    return NextResponse.json({
      success: true,
      data: (data as any).forms || []
    });

  } catch (error) {
    console.error('Forms API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new form
export async function POST(request: NextRequest) {
  try {
    const body: FormPayload = await request.json();
    const { title, email, fields, restaurant_id } = body;

    // Validate required fields
    if (!title || !restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Title and restaurant_id are required' },
        { status: 400 }
      );
    }

    // Fetch restaurant POC email and regular email
    let finalEmail = email; // Use provided email as fallback
    
    try {
      const restaurantData = await adminGraphqlRequest(`
        query GetRestaurantEmails($restaurant_id: uuid!) {
          restaurants_by_pk(restaurant_id: $restaurant_id) {
            poc_email
            email
          }
        }
      `, {
        restaurant_id
      });

      const restaurant = (restaurantData as any).restaurants_by_pk;
      if (restaurant?.poc_email) {
        finalEmail = restaurant.poc_email;
        console.log('[Forms API] Using restaurant POC email:', finalEmail);
      } else if (restaurant?.email) {
        finalEmail = restaurant.email;
        console.log('[Forms API] Using restaurant email:', finalEmail);
      } else {
        console.log('[Forms API] No POC email or restaurant email found, using provided email:', finalEmail);
      }
    } catch (restaurantError) {
      console.error('Error fetching restaurant emails:', restaurantError);
      // Continue with provided email as fallback
    }

    // Validate final email format
    if (finalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'No valid email found (POC email, restaurant email, or provided email)' },
        { status: 400 }
      );
    }

    // Create the form
    const data = await adminGraphqlRequest(`
      mutation CreateForm(
        $title: String!
        $email: String!
        $fields: jsonb!
        $restaurant_id: uuid!
      ) {
        insert_forms_one(object: {
          title: $title
          email: $email
          fields: $fields
          restaurant_id: $restaurant_id
        }) {
          form_id
          created_at
          updated_at
          title
          email
          fields
          restaurant_id
        }
      }
    `, {
      title,
      email: finalEmail,
      fields: fields || [],
      restaurant_id
    });

    return NextResponse.json({
      success: true,
      data: (data as any).insert_forms_one
    });

  } catch (error) {
    console.error('Forms API POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing form
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { form_id, title, email, fields } = body;

    if (!form_id) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (email !== undefined) updateData.email = email;
    if (fields !== undefined) updateData.fields = fields;

    // Update the form
    const data = await adminGraphqlRequest(`
      mutation UpdateForm($form_id: uuid!, $updates: forms_set_input!) {
        update_forms_by_pk(pk_columns: { form_id: $form_id }, _set: $updates) {
          form_id
          created_at
          updated_at
          title
          email
          fields
          restaurant_id
        }
      }
    `, {
      form_id,
      updates: updateData
    });

    if (!(data as any).update_forms_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (data as any).update_forms_by_pk
    });

  } catch (error) {
    console.error('Forms API PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a form
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('form_id');

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Soft delete the form
    const data = await adminGraphqlRequest(`
      mutation DeleteForm($form_id: uuid!) {
        update_forms_by_pk(
          pk_columns: { form_id: $form_id },
          _set: { is_deleted: true }
        ) {
          form_id
        }
      }
    `, {
      form_id: formId
    });

    if (!(data as any).update_forms_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully'
    });

  } catch (error) {
    console.error('Forms API DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}