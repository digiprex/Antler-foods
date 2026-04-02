import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  readMenuCustomerSession,
  getMenuCustomerSessionCookieName,
  MenuCustomerAuthError,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const ADDRESS_FIELDS = `
  id
  address
  street
  city
  state
  country
  zip_code
  house_no
  saved_as
  nearby_landmark
  is_default
  created_at
`;

const GET_CUSTOMER_ADDRESSES = `
  query GetCustomerAddresses($customer_id: uuid!) {
    customer_delivery_addresses(
      where: {
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ is_default: desc }, { created_at: desc }]
    ) {
      ${ADDRESS_FIELDS}
    }
  }
`;

const INSERT_CUSTOMER_ADDRESS = `
  mutation InsertCustomerAddress($object: customer_delivery_addresses_insert_input!) {
    insert_customer_delivery_addresses_one(object: $object) {
      ${ADDRESS_FIELDS}
    }
  }
`;

const UPDATE_CUSTOMER_ADDRESS = `
  mutation UpdateCustomerAddress($id: uuid!, $changes: customer_delivery_addresses_set_input!) {
    update_customer_delivery_addresses_by_pk(
      pk_columns: { id: $id }
      _set: $changes
    ) {
      ${ADDRESS_FIELDS}
    }
  }
`;

const CLEAR_DEFAULT_ADDRESSES = `
  mutation ClearDefaultAddresses($customer_id: uuid!) {
    update_customer_delivery_addresses(
      where: {
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
        is_default: { _eq: true }
      }
      _set: { is_default: false }
    ) {
      affected_rows
    }
  }
`;

const DELETE_CUSTOMER_ADDRESS = `
  mutation DeleteCustomerAddress($id: uuid!) {
    update_customer_delivery_addresses_by_pk(
      pk_columns: { id: $id }
      _set: { is_deleted: true }
    ) {
      id
    }
  }
`;

async function getSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(getMenuCustomerSessionCookieName())?.value;
  const session = await readMenuCustomerSession(sessionCookie);

  if (!session) {
    throw new MenuCustomerAuthError(401, 'You must be signed in.');
  }

  return session;
}

export async function GET() {
  try {
    const session = await getSession();

    const data = await adminGraphqlRequest<{
      customer_delivery_addresses: Array<Record<string, unknown>>;
    }>(GET_CUSTOMER_ADDRESSES, { customer_id: session.customerId });

    // Deduplicate by address string (keep the most recent)
    const seen = new Set<string>();
    const unique = (data.customer_delivery_addresses || []).filter((addr) => {
      const key = (typeof addr.address === 'string' ? addr.address.trim().toLowerCase() : '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ addresses: unique });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Menu Auth] Get addresses error:', error);
    return NextResponse.json({ error: 'Unable to fetch addresses.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const str = (val: unknown) => (typeof val === 'string' && val.trim() ? val.trim() : null);

    const address = str(body.address);
    if (!address) {
      return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
    }

    const result = await adminGraphqlRequest<{
      insert_customer_delivery_addresses_one: Record<string, unknown>;
    }>(INSERT_CUSTOMER_ADDRESS, {
      object: {
        customer_id: session.customerId,
        restaurant_id: session.restaurantId,
        address,
        street: str(body.street),
        city: str(body.city),
        state: str(body.state),
        country: str(body.country),
        zip_code: str(body.zip_code),
        house_no: str(body.house_no),
        saved_as: str(body.saved_as),
        nearby_landmark: str(body.nearby_landmark),
      },
    });

    return NextResponse.json({ address: result.insert_customer_delivery_addresses_one });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Menu Auth] Add address error:', error);
    return NextResponse.json({ error: 'Unable to add address.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Address ID is required.' }, { status: 400 });
    }

    const str = (val: unknown) => (typeof val === 'string' && val.trim() ? val.trim() : null);

    const changes: Record<string, string | boolean | null> = {};
    if ('address' in body) changes.address = str(body.address);
    if ('street' in body) changes.street = str(body.street);
    if ('city' in body) changes.city = str(body.city);
    if ('state' in body) changes.state = str(body.state);
    if ('country' in body) changes.country = str(body.country);
    if ('zip_code' in body) changes.zip_code = str(body.zip_code);
    if ('house_no' in body) changes.house_no = str(body.house_no);
    if ('saved_as' in body) changes.saved_as = str(body.saved_as);
    if ('nearby_landmark' in body) changes.nearby_landmark = str(body.nearby_landmark);
    if ('is_default' in body) changes.is_default = body.is_default === true;

    // Verify ownership
    const existing = await adminGraphqlRequest<{
      customer_delivery_addresses: Array<{ customer_id: string }>;
    }>(`query ($id: uuid!) { customer_delivery_addresses(where: { id: { _eq: $id }, is_deleted: { _eq: false } }) { customer_id } }`, { id: body.id });

    if (!existing.customer_delivery_addresses?.[0] || existing.customer_delivery_addresses[0].customer_id !== session.customerId) {
      return NextResponse.json({ error: 'Address not found.' }, { status: 404 });
    }

    // If setting as default, clear all other defaults first
    if (changes.is_default === true) {
      await adminGraphqlRequest(CLEAR_DEFAULT_ADDRESSES, { customer_id: session.customerId });
    }

    const result = await adminGraphqlRequest<{
      update_customer_delivery_addresses_by_pk: Record<string, unknown>;
    }>(UPDATE_CUSTOMER_ADDRESS, { id: body.id, changes });

    return NextResponse.json({ address: result.update_customer_delivery_addresses_by_pk });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Menu Auth] Update address error:', error);
    return NextResponse.json({ error: 'Unable to update address.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address ID is required.' }, { status: 400 });
    }

    // Verify ownership
    const existing = await adminGraphqlRequest<{
      customer_delivery_addresses: Array<{ customer_id: string }>;
    }>(`query ($id: uuid!) { customer_delivery_addresses(where: { id: { _eq: $id }, is_deleted: { _eq: false } }) { customer_id } }`, { id });

    if (!existing.customer_delivery_addresses?.[0] || existing.customer_delivery_addresses[0].customer_id !== session.customerId) {
      return NextResponse.json({ error: 'Address not found.' }, { status: 404 });
    }

    await adminGraphqlRequest(DELETE_CUSTOMER_ADDRESS, { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Menu Auth] Delete address error:', error);
    return NextResponse.json({ error: 'Unable to delete address.' }, { status: 500 });
  }
}
