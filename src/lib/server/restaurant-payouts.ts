import 'server-only';

import Stripe from 'stripe';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  getRestaurantStripeAccountByRestaurantId,
  type RestaurantStripeAccountSnapshot,
} from '@/lib/server/restaurant-stripe-accounts';
import { getStripe } from '@/lib/server/stripe';

type PayoutOrderRow = {
  order_id?: string | null;
  order_number?: string | null;
  restaurant_id?: string | null;
  payment_status?: string | null;
  payout_status?: string | null;
  cart_total?: number | string | null;
  tax_total?: number | string | null;
  state_tax?: number | string | null;
  delivery_fee_total?: number | string | null;
  restaurant_payout_amount?: number | string | null;
  refund_amount?: number | string | null;
  placed_at?: string | null;
  created_at?: string | null;
};

type PayoutBatchRow = {
  payout_batch_id?: string | null;
  restaurant_id?: string | null;
  stripe_connected_account_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  currency?: string | null;
  order_count?: number | null;
  total_payout_amount?: number | string | null;
  stripe_transfer_id?: string | null;
  status?: string | null;
  failure_reason?: string | null;
  processed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PayoutStatementOrderRow = {
  order_id?: string | null;
  order_number?: string | null;
  payment_reference?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  fulfillment_type?: string | null;
  cart_total?: number | string | null;
  tip_total?: number | string | null;
  tax_total?: number | string | null;
  state_tax?: number | string | null;
  delivery_fee_total?: number | string | null;
  restaurant_payout_amount?: number | string | null;
  refund_amount?: number | string | null;
  placed_at?: string | null;
  created_at?: string | null;
};

type PayoutBatchOrderRow = {
  order_id?: string | null;
  restaurant_payout_amount?: number | string | null;
};

type RestaurantInfoRow = {
  restaurant_id?: string | null;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
};

type ConnectedRestaurantRow = {
  restaurant_id?: string | null;
  stripe_account_id?: string | null;
  default_currency?: string | null;
};

interface EligibleOrdersResponse {
  orders?: PayoutOrderRow[];
}

interface ConnectedRestaurantsResponse {
  restaurant_payment_accounts?: ConnectedRestaurantRow[];
}

interface InsertBatchResponse {
  insert_restaurant_payout_batches_one?: PayoutBatchRow | null;
}

interface UpdateBatchResponse {
  update_restaurant_payout_batches_by_pk?: PayoutBatchRow | null;
}

interface ClaimOrdersResponse {
  update_orders?: {
    affected_rows?: number | null;
    returning?: PayoutOrderRow[] | null;
  } | null;
}

interface InsertBatchOrdersResponse {
  insert_restaurant_payout_batch_orders?: {
    affected_rows?: number | null;
  } | null;
}

interface PayoutBatchListResponse {
  restaurant_payout_batches?: PayoutBatchRow[];
}

interface PayoutStatementPayloadResponse {
  restaurant_payout_batches?: PayoutBatchRow[];
  restaurants_by_pk?: RestaurantInfoRow | null;
  orders?: PayoutStatementOrderRow[];
  restaurant_payout_batch_orders?: PayoutBatchOrderRow[];
}

export interface RestaurantPayoutBatchSummary {
  payoutBatchId: string;
  restaurantId: string;
  stripeConnectedAccountId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  orderCount: number;
  totalPayoutAmount: number;
  stripeTransferId: string | null;
  status: string;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RestaurantPendingPayoutOrder {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  payoutStatus: string;
  payoutAmount: number;
  placedAt: string | null;
}

export interface RestaurantPayoutDashboardData {
  stripeConnectedAccountId: string | null;
  currency: string;
  pendingOrderCount: number;
  pendingPayoutAmount: number;
  pendingOrders: RestaurantPendingPayoutOrder[];
  recentBatches: RestaurantPayoutBatchSummary[];
}

export interface RestaurantPayoutRunResult {
  status: 'created' | 'skipped';
  batch: RestaurantPayoutBatchSummary | null;
  claimedOrderCount: number;
  totalPayoutAmount: number;
  message: string;
}

export interface RestaurantPayoutStatementOrder {
  orderId: string;
  orderNumber: string;
  paymentReference: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  fulfillmentType: string | null;
  cartTotal: number;
  tipTotal: number;
  taxTotal: number;
  stateTax: number;
  deliveryFeeTotal: number;
  refundAmount: number;
  payoutAmount: number;
  placedAt: string | null;
}

export interface RestaurantPayoutStatement {
  batch: RestaurantPayoutBatchSummary;
  restaurant: {
    restaurantId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    fullAddress: string;
  };
  currency: string;
  generatedAt: string;
  totals: {
    grossSales: number;
    tipTotal: number;
    serviceFeeTotal: number;
    stateTaxTotal: number;
    deliveryFeeTotal: number;
    refundTotal: number;
    netPayoutAmount: number;
  };
  orders: RestaurantPayoutStatementOrder[];
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

const GET_ELIGIBLE_PAYOUT_ORDERS = `
  query GetEligiblePayoutOrders($restaurant_id: uuid!) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payout_status: { _eq: "pending" }
        payment_status: { _in: ["paid", "partially_refunded"] }
      }
      order_by: [{ placed_at: asc_nulls_last }, { created_at: asc }]
    ) {
      order_id
      order_number
      restaurant_id
      payment_status
      payout_status
      cart_total
      tax_total
      state_tax
      delivery_fee_total
      restaurant_payout_amount
      refund_amount
      placed_at
      created_at
    }
  }
`;

const GET_CONNECTED_RESTAURANTS = `
  query GetConnectedRestaurantsForPayout {
    restaurant_payment_accounts(
      where: {
        provider: { _eq: "stripe" }
        is_connected: { _eq: true }
        payouts_enabled: { _eq: true }
        stripe_account_id: { _is_null: false }
      }
    ) {
      restaurant_id
      stripe_account_id
      default_currency
    }
  }
`;

const INSERT_PAYOUT_BATCH = `
  mutation InsertPayoutBatch($object: restaurant_payout_batches_insert_input!) {
    insert_restaurant_payout_batches_one(object: $object) {
      payout_batch_id
      restaurant_id
      stripe_connected_account_id
      period_start
      period_end
      currency
      order_count
      total_payout_amount
      stripe_transfer_id
      status
      failure_reason
      processed_at
      created_at
      updated_at
    }
  }
`;

const UPDATE_PAYOUT_BATCH = `
  mutation UpdatePayoutBatch(
    $payout_batch_id: uuid!
    $changes: restaurant_payout_batches_set_input!
  ) {
    update_restaurant_payout_batches_by_pk(
      pk_columns: { payout_batch_id: $payout_batch_id }
      _set: $changes
    ) {
      payout_batch_id
      restaurant_id
      stripe_connected_account_id
      period_start
      period_end
      currency
      order_count
      total_payout_amount
      stripe_transfer_id
      status
      failure_reason
      processed_at
      created_at
      updated_at
    }
  }
`;

const CLAIM_ORDERS_FOR_BATCH = `
  mutation ClaimOrdersForBatch($payout_batch_id: uuid!, $order_ids: [uuid!]!) {
    update_orders(
      where: {
        order_id: { _in: $order_ids }
        is_deleted: { _eq: false }
        payout_status: { _eq: "pending" }
        payment_status: { _in: ["paid", "partially_refunded"] }
      }
      _set: {
        payout_status: "batched"
        payout_batch_id: $payout_batch_id
      }
    ) {
      affected_rows
      returning {
        order_id
        order_number
        restaurant_id
        payment_status
        payout_status
        cart_total
        tax_total
        state_tax
        delivery_fee_total
        restaurant_payout_amount
        refund_amount
        placed_at
        created_at
      }
    }
  }
`;

const INSERT_PAYOUT_BATCH_ORDERS = `
  mutation InsertPayoutBatchOrders($objects: [restaurant_payout_batch_orders_insert_input!]!) {
    insert_restaurant_payout_batch_orders(objects: $objects) {
      affected_rows
    }
  }
`;

const UPDATE_ORDERS_PAYOUT_STATUS = `
  mutation UpdateOrdersPayoutStatus($payout_batch_id: uuid!, $status: String!) {
    update_orders(
      where: { payout_batch_id: { _eq: $payout_batch_id } }
      _set: { payout_status: $status }
    ) {
      affected_rows
    }
  }
`;

const GET_PAYOUT_BATCHES_BY_RESTAURANT = `
  query GetPayoutBatchesByRestaurant($restaurant_id: uuid!, $limit: Int!) {
    restaurant_payout_batches(
      where: { restaurant_id: { _eq: $restaurant_id } }
      order_by: [{ created_at: desc }]
      limit: $limit
    ) {
      payout_batch_id
      restaurant_id
      stripe_connected_account_id
      period_start
      period_end
      currency
      order_count
      total_payout_amount
      stripe_transfer_id
      status
      failure_reason
      processed_at
      created_at
      updated_at
    }
  }
`;

const GET_PAYOUT_BATCH_BY_TRANSFER_ID = `
  query GetPayoutBatchByTransferId($stripe_transfer_id: String!) {
    restaurant_payout_batches(
      where: { stripe_transfer_id: { _eq: $stripe_transfer_id } }
      limit: 1
    ) {
      payout_batch_id
      restaurant_id
      stripe_connected_account_id
      period_start
      period_end
      currency
      order_count
      total_payout_amount
      stripe_transfer_id
      status
      failure_reason
      processed_at
      created_at
      updated_at
    }
  }
`;

const GET_PAYOUT_STATEMENT_PAYLOAD = `
  query GetPayoutStatementPayload($payout_batch_id: uuid!, $restaurant_id: uuid!) {
    restaurant_payout_batches(
      where: { payout_batch_id: { _eq: $payout_batch_id } }
      limit: 1
    ) {
      payout_batch_id
      restaurant_id
      stripe_connected_account_id
      period_start
      period_end
      currency
      order_count
      total_payout_amount
      stripe_transfer_id
      status
      failure_reason
      processed_at
      created_at
      updated_at
    }
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      name
      address
      city
      state
      country
      postal_code
    }
    orders(
      where: {
        payout_batch_id: { _eq: $payout_batch_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ placed_at: asc_nulls_last }, { created_at: asc }]
    ) {
      order_id
      order_number
      payment_reference
      payment_status
      payment_method
      fulfillment_type
      cart_total
      tip_total
      tax_total
      state_tax
      delivery_fee_total
      restaurant_payout_amount
      refund_amount
      placed_at
      created_at
    }
    restaurant_payout_batch_orders(
      where: { payout_batch_id: { _eq: $payout_batch_id } }
    ) {
      order_id
      restaurant_payout_amount
    }
  }
`;

export async function getRestaurantPayoutDashboard(
  restaurantId: string,
): Promise<RestaurantPayoutDashboardData> {
  const [account, pendingOrders, batches] = await Promise.all([
    getRestaurantStripeAccountByRestaurantId(restaurantId),
    getEligiblePayoutOrders(restaurantId),
    listRestaurantPayoutBatches(restaurantId, 12),
  ]);

  const serializedPendingOrders = pendingOrders.map((order) => ({
    orderId: normalizeString(order.order_id) || '',
    orderNumber: normalizeString(order.order_number) || normalizeString(order.order_id) || '',
    paymentStatus: normalizeString(order.payment_status) || 'pending',
    payoutStatus: normalizeString(order.payout_status) || 'pending',
    payoutAmount: calculateEffectiveOrderPayout(order),
    placedAt: normalizeString(order.placed_at) || normalizeString(order.created_at),
  }));

  return {
    stripeConnectedAccountId: account?.stripeAccountId ?? null,
    currency: normalizeCurrencyCode(account?.defaultCurrency || 'usd'),
    pendingOrderCount: serializedPendingOrders.length,
    pendingPayoutAmount: roundCurrency(
      serializedPendingOrders.reduce((sum, order) => sum + order.payoutAmount, 0),
    ),
    pendingOrders: serializedPendingOrders.slice(0, 10),
    recentBatches: batches,
  };
}

export async function createRestaurantPayoutBatchForRestaurant(
  restaurantId: string,
  source: 'manual' | 'cron' = 'manual',
): Promise<RestaurantPayoutRunResult> {
  const account = await getRestaurantStripeAccountByRestaurantId(restaurantId);
  validatePayoutAccount(account, restaurantId);

  const eligibleOrders = (await getEligiblePayoutOrders(restaurantId)).filter(
    (order) => calculateEffectiveOrderPayout(order) > 0,
  );

  if (eligibleOrders.length === 0) {
    return {
      status: 'skipped',
      batch: null,
      claimedOrderCount: 0,
      totalPayoutAmount: 0,
      message: 'No eligible paid orders are ready for payout.',
    };
  }

  const currency = normalizeCurrencyCode(account.defaultCurrency || 'usd');
  const plannedPayoutAmount = roundCurrency(
    eligibleOrders.reduce((sum, order) => sum + calculateEffectiveOrderPayout(order), 0),
  );
  const plannedTransferAmount = toMinorCurrencyAmount(plannedPayoutAmount, currency);
  const availableBalanceAmount = await getAvailablePlatformBalanceMinor(currency);

  if (plannedTransferAmount > availableBalanceAmount) {
    return {
      status: 'skipped',
      batch: null,
      claimedOrderCount: 0,
      totalPayoutAmount: plannedPayoutAmount,
      message: `Insufficient available Stripe balance for payout. Available: ${formatMajorCurrencyAmount(
        availableBalanceAmount,
        currency,
      )}. Required: ${formatMajorCurrencyAmount(plannedTransferAmount, currency)}. Wait for funds to become available or use a bypass-pending test payment method in test mode.`,
    };
  }

  const periodStart = buildPeriodBoundary(
    eligibleOrders[0]?.placed_at,
    eligibleOrders[0]?.created_at,
  );
  const periodEnd = buildPeriodBoundary(
    eligibleOrders[eligibleOrders.length - 1]?.placed_at,
    eligibleOrders[eligibleOrders.length - 1]?.created_at,
  );

  const insertedBatch = await adminGraphqlRequest<InsertBatchResponse>(
    INSERT_PAYOUT_BATCH,
    {
      object: {
        restaurant_id: restaurantId,
        stripe_connected_account_id: account.stripeAccountId,
        period_start: periodStart,
        period_end: periodEnd,
        currency,
        status: 'processing',
      },
    },
  );

  const batchId = normalizeString(insertedBatch.insert_restaurant_payout_batches_one?.payout_batch_id);
  if (!batchId) {
    throw new Error('Payout batch could not be created.');
  }

  try {
    const claimedOrders = await claimOrdersForBatch(
      batchId,
      eligibleOrders.map((order) => normalizeString(order.order_id)).filter((id): id is string => Boolean(id)),
    );

    if (claimedOrders.length === 0) {
      const batch = await updatePayoutBatch(batchId, {
        status: 'failed',
        failure_reason: 'No orders could be claimed for this payout batch.',
      });
      return {
        status: 'skipped',
        batch,
        claimedOrderCount: 0,
        totalPayoutAmount: 0,
        message: 'No orders were claimed for payout. Another process may have already handled them.',
      };
    }

    const mappedOrders = claimedOrders.map((order) => ({
      orderId: normalizeString(order.order_id) || '',
      payoutAmount: calculateEffectiveOrderPayout(order),
    })).filter((order) => order.orderId && order.payoutAmount > 0);

    if (mappedOrders.length === 0) {
      await markOrdersForBatch(batchId, 'failed');
      const batch = await updatePayoutBatch(batchId, {
        status: 'failed',
        failure_reason: 'Claimed orders do not have a positive payout amount.',
      });

      return {
        status: 'skipped',
        batch,
        claimedOrderCount: 0,
        totalPayoutAmount: 0,
        message: 'No positive payout amount was found for the claimed orders.',
      };
    }

    const totalPayoutAmount = roundCurrency(
      mappedOrders.reduce((sum, order) => sum + order.payoutAmount, 0),
    );
    const transferAmount = toMinorCurrencyAmount(totalPayoutAmount, currency);

    if (transferAmount <= 0) {
      await markOrdersForBatch(batchId, 'failed');
      const batch = await updatePayoutBatch(batchId, {
        status: 'failed',
        failure_reason: 'Computed transfer amount is not positive.',
      });

      return {
        status: 'skipped',
        batch,
        claimedOrderCount: 0,
        totalPayoutAmount: 0,
        message: 'Computed transfer amount was zero.',
      };
    }

    await updatePayoutBatch(batchId, {
      currency,
      order_count: mappedOrders.length,
      total_payout_amount: totalPayoutAmount,
      failure_reason: null,
    });

    await adminGraphqlRequest<InsertBatchOrdersResponse>(
      INSERT_PAYOUT_BATCH_ORDERS,
      {
        objects: mappedOrders.map((order) => ({
          payout_batch_id: batchId,
          order_id: order.orderId,
          restaurant_payout_amount: order.payoutAmount,
        })),
      },
    );

    const transfer = await getStripe().transfers.create({
      amount: transferAmount,
      currency,
      destination: account.stripeAccountId!,
      description: `Weekly payout for restaurant ${restaurantId}`,
      metadata: {
        payout_batch_id: batchId,
        restaurant_id: restaurantId,
        source,
        order_count: String(mappedOrders.length),
      },
      transfer_group: `restaurant_payout_batch_${batchId}`,
    });

    const batch = await updatePayoutBatch(batchId, {
      currency,
      order_count: mappedOrders.length,
      total_payout_amount: totalPayoutAmount,
      stripe_transfer_id: transfer.id,
      status: 'transferred',
      failure_reason: null,
      processed_at: new Date().toISOString(),
    });

    await markOrdersForBatch(batchId, 'transferred');

    return {
      status: 'created',
      batch,
      claimedOrderCount: mappedOrders.length,
      totalPayoutAmount,
      message: `Created payout batch for ${mappedOrders.length} orders.`,
    };
  } catch (error) {
    const failureReason =
      error instanceof Stripe.errors.StripeError || error instanceof Error
        ? error.message
        : 'Payout transfer failed.';

    await updatePayoutBatch(batchId, {
      status: 'failed',
      failure_reason: failureReason,
    });
    await markOrdersForBatch(batchId, 'failed');
    throw error;
  }
}

export async function getRestaurantPayoutStatement(
  payoutBatchId: string,
): Promise<RestaurantPayoutStatement> {
  const normalizedBatchId = normalizeString(payoutBatchId);
  if (!normalizedBatchId) {
    throw new Error('payoutBatchId is required.');
  }

  const batchLookup = await adminGraphqlRequest<PayoutBatchListResponse>(
    `
      query GetPayoutBatchById($payout_batch_id: uuid!) {
        restaurant_payout_batches(
          where: { payout_batch_id: { _eq: $payout_batch_id } }
          limit: 1
        ) {
          payout_batch_id
          restaurant_id
          stripe_connected_account_id
          period_start
          period_end
          currency
          order_count
          total_payout_amount
          stripe_transfer_id
          status
          failure_reason
          processed_at
          created_at
          updated_at
        }
      }
    `,
    { payout_batch_id: normalizedBatchId },
  );

  const batchLookupRow = Array.isArray(batchLookup.restaurant_payout_batches)
    ? batchLookup.restaurant_payout_batches[0]
    : null;
  const restaurantId = normalizeString(batchLookupRow?.restaurant_id);
  if (!restaurantId) {
    throw new Error('Payout batch not found.');
  }

  const batchData = await adminGraphqlRequest<PayoutStatementPayloadResponse>(
    GET_PAYOUT_STATEMENT_PAYLOAD,
    {
      payout_batch_id: normalizedBatchId,
      restaurant_id: restaurantId,
    },
  );

  const batchRow = Array.isArray(batchData.restaurant_payout_batches)
    ? batchData.restaurant_payout_batches[0]
    : null;
  const batch = serializePayoutBatchRow(batchRow);

  if (!batch.payoutBatchId || !batch.restaurantId) {
    throw new Error('Payout batch not found.');
  }

  const payoutAmounts = new Map<string, number>(
    (Array.isArray(batchData.restaurant_payout_batch_orders)
      ? batchData.restaurant_payout_batch_orders
      : []
    )
      .map(
        (row): [string, number] | null => {
          const orderId = normalizeString(row.order_id);
          if (!orderId) {
            return null;
          }

          return [
            orderId,
            roundCurrency(toNumber(row.restaurant_payout_amount)),
          ];
        },
      )
      .filter((entry): entry is [string, number] => Boolean(entry)),
  );

  const orders = (Array.isArray(batchData.orders) ? batchData.orders : []).map((row) => {
    const orderId = normalizeString(row.order_id) || '';
    const fallbackPayout = calculateEffectiveOrderPayout({
      restaurant_payout_amount: row.restaurant_payout_amount,
      refund_amount: row.refund_amount,
    });

    return {
      orderId,
      orderNumber: normalizeString(row.order_number) || orderId,
      paymentReference: normalizeString(row.payment_reference),
      paymentStatus: normalizeString(row.payment_status) || 'pending',
      paymentMethod: normalizeString(row.payment_method),
      fulfillmentType: normalizeString(row.fulfillment_type),
      cartTotal: roundCurrency(toNumber(row.cart_total)),
      tipTotal: roundCurrency(toNumber(row.tip_total)),
      taxTotal: roundCurrency(toNumber(row.tax_total)),
      stateTax: roundCurrency(toNumber(row.state_tax)),
      deliveryFeeTotal: roundCurrency(toNumber(row.delivery_fee_total)),
      refundAmount: roundCurrency(toNumber(row.refund_amount)),
      payoutAmount: payoutAmounts.get(orderId) ?? fallbackPayout,
      placedAt: normalizeString(row.placed_at) || normalizeString(row.created_at),
    };
  });

  const restaurant = serializeRestaurantInfo(batchData.restaurants_by_pk, batch.restaurantId);

  return {
    batch,
    restaurant,
    currency: batch.currency.toUpperCase(),
    generatedAt: new Date().toISOString(),
    totals: {
      grossSales: roundCurrency(orders.reduce((sum, order) => sum + order.cartTotal, 0)),
      tipTotal: roundCurrency(orders.reduce((sum, order) => sum + order.tipTotal, 0)),
      serviceFeeTotal: roundCurrency(
        orders.reduce((sum, order) => sum + order.taxTotal, 0),
      ),
      stateTaxTotal: roundCurrency(
        orders.reduce((sum, order) => sum + order.stateTax, 0),
      ),
      deliveryFeeTotal: roundCurrency(
        orders.reduce((sum, order) => sum + order.deliveryFeeTotal, 0),
      ),
      refundTotal: roundCurrency(
        orders.reduce((sum, order) => sum + order.refundAmount, 0),
      ),
      netPayoutAmount: roundCurrency(
        orders.reduce((sum, order) => sum + order.payoutAmount, 0),
      ),
    },
    orders,
  };
}

export async function processRestaurantPayouts(
  restaurantId?: string | null,
) {
  const restaurants = restaurantId
    ? [restaurantId]
    : await listConnectedRestaurantsForPayout();

  const results: Array<{
    restaurantId: string;
    outcome: 'created' | 'skipped' | 'failed';
    message: string;
    payoutBatchId: string | null;
    totalPayoutAmount: number;
  }> = [];

  for (const id of restaurants) {
    try {
      const result = await createRestaurantPayoutBatchForRestaurant(id, 'cron');
      results.push({
        restaurantId: id,
        outcome: result.status,
        message: result.message,
        payoutBatchId: result.batch?.payoutBatchId ?? null,
        totalPayoutAmount: result.totalPayoutAmount,
      });
    } catch (error) {
      results.push({
        restaurantId: id,
        outcome: 'failed',
        message:
          error instanceof Error ? error.message : 'Payout processing failed.',
        payoutBatchId: null,
        totalPayoutAmount: 0,
      });
    }
  }

  return {
    processedRestaurants: results.length,
    createdBatches: results.filter((item) => item.outcome === 'created').length,
    skippedRestaurants: results.filter((item) => item.outcome === 'skipped').length,
    failedRestaurants: results.filter((item) => item.outcome === 'failed').length,
    results,
  };
}

export async function syncPayoutBatchByTransferEvent(
  transfer: Stripe.Transfer,
  eventType: string,
) {
  const transferId = normalizeString(transfer.id);
  if (!transferId) {
    return null;
  }

  const data = await adminGraphqlRequest<PayoutBatchListResponse>(
    GET_PAYOUT_BATCH_BY_TRANSFER_ID,
    { stripe_transfer_id: transferId },
  );
  const row = Array.isArray(data.restaurant_payout_batches)
    ? data.restaurant_payout_batches[0]
    : null;
  const batchId = normalizeString(row?.payout_batch_id);
  if (!batchId) {
    return null;
  }

  const isReversed =
    eventType === 'transfer.reversed' ||
    Boolean(transfer.reversed) ||
    toNumber(transfer.amount_reversed) > 0;

  const batch = await updatePayoutBatch(batchId, {
    status: isReversed ? 'reversed' : 'transferred',
    failure_reason: isReversed ? 'Stripe transfer was reversed.' : null,
    processed_at: row?.processed_at || new Date().toISOString(),
  });

  await markOrdersForBatch(batchId, isReversed ? 'reversed' : 'transferred');
  return batch;
}

async function getEligiblePayoutOrders(restaurantId: string) {
  const data = await adminGraphqlRequest<EligibleOrdersResponse>(
    GET_ELIGIBLE_PAYOUT_ORDERS,
    { restaurant_id: restaurantId },
  );

  return Array.isArray(data.orders) ? data.orders : [];
}

async function listConnectedRestaurantsForPayout() {
  const data = await adminGraphqlRequest<ConnectedRestaurantsResponse>(
    GET_CONNECTED_RESTAURANTS,
  );

  const rows = Array.isArray(data.restaurant_payment_accounts)
    ? data.restaurant_payment_accounts
    : [];

  return rows
    .map((row) => normalizeString(row.restaurant_id))
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
}

async function claimOrdersForBatch(batchId: string, orderIds: string[]) {
  const data = await adminGraphqlRequest<ClaimOrdersResponse>(
    CLAIM_ORDERS_FOR_BATCH,
    {
      payout_batch_id: batchId,
      order_ids: orderIds,
    },
  );

  return Array.isArray(data.update_orders?.returning)
    ? data.update_orders?.returning
    : [];
}

async function markOrdersForBatch(batchId: string, status: string) {
  await adminGraphqlRequest(UPDATE_ORDERS_PAYOUT_STATUS, {
    payout_batch_id: batchId,
    status,
  });
}

async function listRestaurantPayoutBatches(
  restaurantId: string,
  limit = 12,
) {
  const data = await adminGraphqlRequest<PayoutBatchListResponse>(
    GET_PAYOUT_BATCHES_BY_RESTAURANT,
    {
      restaurant_id: restaurantId,
      limit,
    },
  );

  return (Array.isArray(data.restaurant_payout_batches)
    ? data.restaurant_payout_batches
    : []
  ).map(serializePayoutBatchRow);
}

async function updatePayoutBatch(
  payoutBatchId: string,
  changes: Record<string, unknown>,
) {
  const updated = await adminGraphqlRequest<UpdateBatchResponse>(
    UPDATE_PAYOUT_BATCH,
    {
      payout_batch_id: payoutBatchId,
      changes,
    },
  );

  return serializePayoutBatchRow(updated.update_restaurant_payout_batches_by_pk);
}

function validatePayoutAccount(
  account: RestaurantStripeAccountSnapshot | null,
  restaurantId: string,
): asserts account is RestaurantStripeAccountSnapshot {
  if (!account?.stripeAccountId || !account.isConnected) {
    throw new Error(
      `Restaurant ${restaurantId} does not have a connected Stripe account.`,
    );
  }

  if (!account.payoutsEnabled) {
    throw new Error(
      `Restaurant ${restaurantId} is not payout-ready in Stripe yet.`,
    );
  }
}

function calculateEffectiveOrderPayout(order: PayoutOrderRow) {
  const basePayout = toNumber(order.restaurant_payout_amount);
  const refundAmount = toNumber(order.refund_amount);
  return roundCurrency(Math.max(basePayout - refundAmount, 0));
}

function serializePayoutBatchRow(row: PayoutBatchRow | null | undefined): RestaurantPayoutBatchSummary {
  return {
    payoutBatchId: normalizeString(row?.payout_batch_id) || '',
    restaurantId: normalizeString(row?.restaurant_id) || '',
    stripeConnectedAccountId: normalizeString(row?.stripe_connected_account_id),
    periodStart: normalizeString(row?.period_start),
    periodEnd: normalizeString(row?.period_end),
    currency: normalizeCurrencyCode(row?.currency || 'usd'),
    orderCount: toNumber(row?.order_count),
    totalPayoutAmount: roundCurrency(toNumber(row?.total_payout_amount)),
    stripeTransferId: normalizeString(row?.stripe_transfer_id),
    status: normalizeString(row?.status) || 'pending',
    failureReason: normalizeString(row?.failure_reason),
    processedAt: normalizeString(row?.processed_at),
    createdAt: normalizeString(row?.created_at),
    updatedAt: normalizeString(row?.updated_at),
  };
}

function serializeRestaurantInfo(
  row: RestaurantInfoRow | null | undefined,
  fallbackRestaurantId: string,
) {
  const address = normalizeString(row?.address) || '';
  const city = normalizeString(row?.city) || '';
  const state = normalizeString(row?.state) || '';
  const country = normalizeString(row?.country) || '';
  const postalCode = normalizeString(row?.postal_code) || '';

  return {
    restaurantId: normalizeString(row?.restaurant_id) || fallbackRestaurantId,
    name: normalizeString(row?.name) || 'Restaurant',
    address,
    city,
    state,
    country,
    postalCode,
    fullAddress: [address, city, state, postalCode, country].filter(Boolean).join(', '),
  };
}

function buildPeriodBoundary(
  placedAt: string | null | undefined,
  createdAt: string | null | undefined,
) {
  return normalizeString(placedAt) || normalizeString(createdAt) || new Date().toISOString();
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeCurrencyCode(value: unknown) {
  const text = normalizeString(value) || 'usd';
  return text.toLowerCase();
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function toMinorCurrencyAmount(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

async function getAvailablePlatformBalanceMinor(currency: string) {
  const balance = await getStripe().balance.retrieve();
  const normalizedCurrency = normalizeCurrencyCode(currency);

  const availableEntry = Array.isArray(balance.available)
    ? balance.available.find((entry) => entry.currency === normalizedCurrency)
    : null;

  return availableEntry?.amount ?? 0;
}

function formatMajorCurrencyAmount(amountMinor: number, currency: string) {
  const normalizedCurrency = normalizeCurrencyCode(currency).toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return `${normalizedCurrency} ${amountMinor.toFixed(0)}`;
  }

  return `${normalizedCurrency} ${(amountMinor / 100).toFixed(2)}`;
}
