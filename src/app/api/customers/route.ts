export const dynamic = 'force-dynamic';

/**
 * Customers API Route
 *
 * Fetches customer list for a restaurant from the customers table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_CUSTOMERS_QUERY = `
  query GetCustomers($restaurant_id: uuid!, $limit: Int, $offset: Int, $search: String) {
    customers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        _or: [
          { display_name: { _ilike: $search } }
          { email: { _ilike: $search } }
          { phone: { _ilike: $search } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      customer_id
      created_at
      display_name
      email
      phone
      is_guest
      email_opt_in
      sms_opt_in
    }
  }
`;

const GET_CUSTOMERS_WITH_ORDER_FILTER_QUERY = `
  query GetCustomersWithOrderFilter($restaurant_id: uuid!, $limit: Int, $offset: Int, $search: String, $customer_ids: [uuid!]!) {
    customers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        customer_id: { _in: $customer_ids }
        _or: [
          { display_name: { _ilike: $search } }
          { email: { _ilike: $search } }
          { phone: { _ilike: $search } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      customer_id
      created_at
      display_name
      email
      phone
      is_guest
      email_opt_in
      sms_opt_in
    }
  }
`;

const GET_CUSTOMERS_WITH_ORDER_FILTER_COUNT_QUERY = `
  query GetCustomersWithOrderFilterCount($restaurant_id: uuid!, $search: String, $customer_ids: [uuid!]!) {
    customers_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        customer_id: { _in: $customer_ids }
        _or: [
          { display_name: { _ilike: $search } }
          { email: { _ilike: $search } }
          { phone: { _ilike: $search } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_ORDERED_CUSTOMER_IDS_QUERY = `
  query GetOrderedCustomerIds($restaurant_id: uuid!, $since: timestamptz!) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        created_at: { _gte: $since }
      }
      distinct_on: customer_id
    ) {
      customer_id
    }
  }
`;

const GET_CUSTOMER_ADDRESSES_QUERY = `
  query GetCustomerAddresses($customer_ids: [uuid!]!) {
    customer_delivery_addresses(
      where: {
        customer_id: { _in: $customer_ids }
        is_deleted: { _eq: false }
      }
      order_by: [{ is_default: desc }, { created_at: desc }]
    ) {
      id
      customer_id
      address
      street
      house_no
      city
      state
      country
      zip_code
      saved_as
      nearby_landmark
      is_default
    }
  }
`;

const GET_CUSTOMERS_COUNT_QUERY = `
  query GetCustomersCount($restaurant_id: uuid!, $search: String) {
    customers_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        _or: [
          { display_name: { _ilike: $search } }
          { email: { _ilike: $search } }
          { phone: { _ilike: $search } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_CUSTOMER_ORDERS_QUERY = `
  query GetCustomerOrders($customer_id: uuid!) {
    orders_aggregate(
      where: {
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        count
        sum {
          cart_total
        }
      }
    }
    orders(
      where: {
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      created_at
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const includeOrderStats = searchParams.get('include_order_stats') === 'true';
    const orderedDays = searchParams.get('ordered_days');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    const searchFilter = search ? `%${search}%` : '%';

    // If ordered_days filter is set, first get customer IDs who ordered within that period
    let orderedCustomerIds: string[] | null = null;
    if (orderedDays) {
      const days = parseInt(orderedDays);
      if (!isNaN(days) && days > 0) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const orderData = await adminGraphqlRequest(GET_ORDERED_CUSTOMER_IDS_QUERY, {
          restaurant_id: restaurantId,
          since: since.toISOString(),
        });
        orderedCustomerIds = ((orderData as any).orders || []).map((o: any) => o.customer_id);
        if (orderedCustomerIds!.length === 0) {
          return NextResponse.json({
            success: true,
            customers: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }
      }
    }

    const [customersData, countData] = await Promise.all([
      orderedCustomerIds
        ? adminGraphqlRequest(GET_CUSTOMERS_WITH_ORDER_FILTER_QUERY, {
            restaurant_id: restaurantId,
            limit,
            offset,
            search: searchFilter,
            customer_ids: orderedCustomerIds,
          })
        : adminGraphqlRequest(GET_CUSTOMERS_QUERY, {
            restaurant_id: restaurantId,
            limit,
            offset,
            search: searchFilter,
          }),
      orderedCustomerIds
        ? adminGraphqlRequest(GET_CUSTOMERS_WITH_ORDER_FILTER_COUNT_QUERY, {
            restaurant_id: restaurantId,
            search: searchFilter,
            customer_ids: orderedCustomerIds,
          })
        : adminGraphqlRequest(GET_CUSTOMERS_COUNT_QUERY, {
            restaurant_id: restaurantId,
            search: searchFilter,
          }),
    ]);

    const customers = (customersData as any).customers || [];
    const totalCount = (countData as any).customers_aggregate?.aggregate?.count || 0;

    let customersWithStats = customers;

    if (customers.length > 0) {
      const customerIds = customers.map((c: any) => c.customer_id);

      const promises: Promise<any>[] = [
        adminGraphqlRequest(GET_CUSTOMER_ADDRESSES_QUERY, {
          customer_ids: customerIds,
        }).catch(() => null),
      ];

      if (includeOrderStats) {
        customers.forEach((customer: any) => {
          promises.push(
            adminGraphqlRequest(GET_CUSTOMER_ORDERS_QUERY, {
              customer_id: customer.customer_id,
            }).catch(() => null)
          );
        });
      }

      const results = await Promise.all(promises);
      const addressData = results[0];
      const addressesByCustomer = new Map<string, any[]>();

      if (addressData) {
        for (const addr of (addressData as any).customer_delivery_addresses || []) {
          const list = addressesByCustomer.get(addr.customer_id) || [];
          list.push(addr);
          addressesByCustomer.set(addr.customer_id, list);
        }
      }

      customersWithStats = customers.map((customer: any, index: number) => {
        const enriched: any = {
          ...customer,
          customer_delivery_addresses: addressesByCustomer.get(customer.customer_id) || [],
        };

        if (includeOrderStats) {
          const stats = results[index + 1]; // +1 because index 0 is addresses
          if (!stats) {
            enriched.order_count = 0;
            enriched.total_spent = 0;
            enriched.last_order_at = null;
          } else {
            const aggregate = (stats as any).orders_aggregate?.aggregate;
            const lastOrder = (stats as any).orders?.[0];
            enriched.order_count = aggregate?.count || 0;
            enriched.total_spent = aggregate?.sum?.cart_total || 0;
            enriched.last_order_at = lastOrder?.created_at || null;
          }
        }

        return enriched;
      });
    }

    return NextResponse.json({
      success: true,
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
