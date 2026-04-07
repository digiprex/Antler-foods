import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_ORDER_SETTINGS = `
  query GetOrderSettings($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      allow_tips
      pickup_allowed
      delivery_allowed
      preparation_time
      transaction_tax_rate
      address
      city
      state
      postal_code
      country
    }
    delivery_zones(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: asc }
    ) {
      id
      created_at
      updated_at
      is_deleted
      restaurant_id
      name
      map_selection
      delivery_fee
      zip_code
      polygon_points
      circle_radius
      min_order_amount
    }
  }
`;

const UPDATE_ORDER_SETTINGS = `
  mutation UpdateOrderSettings($restaurant_id: uuid!, $allow_tips: Boolean!, $pickup_allowed: Boolean!, $delivery_allowed: Boolean!, $preparation_time: numeric, $transaction_tax_rate: numeric) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: {
        allow_tips: $allow_tips
        pickup_allowed: $pickup_allowed
        delivery_allowed: $delivery_allowed
        preparation_time: $preparation_time
        transaction_tax_rate: $transaction_tax_rate
      }
    ) {
      restaurant_id
      allow_tips
      pickup_allowed
      delivery_allowed
      preparation_time
      transaction_tax_rate
    }
  }
`;

const REPLACE_DELIVERY_ZONES = `
  mutation ReplaceDeliveryZones($restaurant_id: uuid!, $zones: [delivery_zones_insert_input!]!) {
    soft_delete: update_delivery_zones(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
    insert_delivery_zones(objects: $zones) {
      returning {
        id
        created_at
        updated_at
        is_deleted
        restaurant_id
        name
        map_selection
        delivery_fee
        zip_code
        polygon_points
        circle_radius
        min_order_amount
      }
    }
  }
`;

type DeliveryZoneMapSelection = 'circle' | 'polygon' | 'zip_code';

type DeliveryZoneRecord = {
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_deleted?: boolean | null;
  restaurant_id?: string | null;
  name?: string | null;
  map_selection?: string | null;
  delivery_fee?: string | number | null;
  zip_code?: string | null;
  polygon_points?: unknown;
  circle_radius?: string | number | null;
  min_order_amount?: string | number | null;
};

type DeliveryZoneInput = {
  name: string;
  map_selection: DeliveryZoneMapSelection;
  delivery_fee: number;
  zip_code: string | null;
  polygon_points: unknown | null;
  circle_radius: number | null;
  min_order_amount: number;
};

interface OrderSettingsResponse {
  restaurants_by_pk?: {
    restaurant_id?: string | null;
    allow_tips?: boolean | null;
    pickup_allowed?: boolean | null;
    delivery_allowed?: boolean | null;
    preparation_time?: number | null;
    transaction_tax_rate?: number | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  delivery_zones?: DeliveryZoneRecord[];
}

interface UpdateOrderSettingsResponse {
  update_restaurants_by_pk?: {
    restaurant_id?: string | null;
    allow_tips?: boolean | null;
    pickup_allowed?: boolean | null;
    delivery_allowed?: boolean | null;
    preparation_time?: number | null;
    transaction_tax_rate?: number | null;
  } | null;
}

interface ReplaceDeliveryZonesResponse {
  insert_delivery_zones?: {
    returning?: DeliveryZoneRecord[];
  } | null;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMapSelection(value: unknown): DeliveryZoneMapSelection {
  const mapSelection = normalizeString(value).toLowerCase();
  if (mapSelection === 'polygon' || mapSelection === 'zip_code') {
    return mapSelection;
  }
  return 'circle';
}

function normalizeDeliveryZoneOutput(zone: DeliveryZoneRecord) {
  return {
    id: normalizeString(zone.id) || null,
    created_at: normalizeString(zone.created_at) || null,
    updated_at: normalizeString(zone.updated_at) || null,
    is_deleted: Boolean(zone.is_deleted),
    restaurant_id: normalizeString(zone.restaurant_id) || null,
    name: normalizeString(zone.name),
    map_selection: normalizeMapSelection(zone.map_selection),
    delivery_fee: toNumber(zone.delivery_fee, 0),
    zip_code: normalizeString(zone.zip_code) || null,
    polygon_points: zone.polygon_points ?? null,
    circle_radius: zone.circle_radius === null || zone.circle_radius === undefined
      ? null
      : toNumber(zone.circle_radius, 0),
    min_order_amount: toNumber(zone.min_order_amount, 0),
  };
}

function parseDeliveryZones(raw: unknown) {
  if (!Array.isArray(raw)) {
    return { zones: [] as DeliveryZoneInput[] };
  }

  const zones: DeliveryZoneInput[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const row = entry as Record<string, unknown>;
    const name = normalizeString(row.name);
    const mapSelection = normalizeMapSelection(row.map_selection ?? row.coverageMode);
    const deliveryFee = toNumber(row.delivery_fee ?? row.deliveryFee, NaN);
    const minOrderAmount = toNumber(row.min_order_amount ?? row.minimumOrderAmount, NaN);
    const circleRadiusRaw = row.circle_radius ?? row.radiusKm;
    const circleRadius =
      circleRadiusRaw === null || circleRadiusRaw === undefined || String(circleRadiusRaw).trim() === ''
        ? null
        : toNumber(circleRadiusRaw, NaN);
    const zipCode = normalizeString(row.zip_code ?? row.zipCodes) || null;
    const polygonPoints = row.polygon_points ?? row.polygonPoints ?? null;

    if (!name) {
      return { error: 'Each delivery zone must have a name.' };
    }
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      return { error: `Delivery fee must be 0 or greater for zone "${name}".` };
    }
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      return { error: `Minimum order amount must be 0 or greater for zone "${name}".` };
    }
    if (mapSelection === 'circle' && (circleRadius === null || !Number.isFinite(circleRadius) || circleRadius < 0)) {
      return { error: `Circle radius must be 0 or greater for zone "${name}".` };
    }
    if (mapSelection === 'zip_code' && !zipCode) {
      return { error: `ZIP code is required for zone "${name}".` };
    }

    zones.push({
      name,
      map_selection: mapSelection,
      delivery_fee: deliveryFee,
      zip_code: mapSelection === 'zip_code' ? zipCode : null,
      polygon_points: mapSelection === 'polygon' ? polygonPoints : null,
      circle_radius: mapSelection === 'circle' ? circleRadius : null,
      min_order_amount: minOrderAmount,
    });
  }

  return { zones };
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = new URL(request.url).searchParams.get('restaurant_id');
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<OrderSettingsResponse>(
      GET_ORDER_SETTINGS,
      { restaurant_id: restaurantId },
    );

    if (!data.restaurants_by_pk?.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: data.restaurants_by_pk.restaurant_id,
        allow_tips: data.restaurants_by_pk.allow_tips ?? true,
        pickup_allowed: data.restaurants_by_pk.pickup_allowed ?? true,
        delivery_allowed: data.restaurants_by_pk.delivery_allowed ?? true,
        preparation_time: data.restaurants_by_pk.preparation_time ?? null,
        transaction_tax_rate: data.restaurants_by_pk.transaction_tax_rate ?? 5,
        address: [
          data.restaurants_by_pk.address,
          data.restaurants_by_pk.city,
          data.restaurants_by_pk.state,
          data.restaurants_by_pk.postal_code,
          data.restaurants_by_pk.country,
        ]
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
          .join(', '),
        delivery_zones: (data.delivery_zones || []).map(normalizeDeliveryZoneOutput),
      },
    });
  } catch (error) {
    console.error('[Order Settings] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          restaurant_id?: string;
          allow_tips?: boolean;
          pickup_allowed?: boolean;
          delivery_allowed?: boolean;
          preparation_time?: number | null;
          transaction_tax_rate?: number | null;
          delivery_zones?: unknown[];
        }
      | null;

    const restaurantId = body?.restaurant_id;
    const allowTips = body?.allow_tips;
    const pickupAllowed = body?.pickup_allowed;
    const deliveryAllowed = body?.delivery_allowed;
    const preparationTimeRaw = body?.preparation_time;
    const preparationTime = preparationTimeRaw === null || preparationTimeRaw === undefined
      ? null
      : Number.isFinite(Number(preparationTimeRaw)) && Number(preparationTimeRaw) >= 0
        ? Math.round(Number(preparationTimeRaw))
        : null;
    const taxRateRaw = body?.transaction_tax_rate;
    const transactionTaxRate = taxRateRaw === null || taxRateRaw === undefined
      ? 5
      : Number.isFinite(Number(taxRateRaw)) && Number(taxRateRaw) >= 0 && Number(taxRateRaw) <= 100
        ? Math.round(Number(taxRateRaw) * 100) / 100
        : 5;
    const parsedDeliveryZones = parseDeliveryZones(body?.delivery_zones);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    if (typeof allowTips !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'allow_tips must be a boolean' },
        { status: 400 },
      );
    }
    if (typeof pickupAllowed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'pickup_allowed must be a boolean' },
        { status: 400 },
      );
    }
    if (typeof deliveryAllowed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'delivery_allowed must be a boolean' },
        { status: 400 },
      );
    }
    if ('error' in parsedDeliveryZones) {
      return NextResponse.json(
        { success: false, error: parsedDeliveryZones.error },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<UpdateOrderSettingsResponse>(
      UPDATE_ORDER_SETTINGS,
      {
        restaurant_id: restaurantId,
        allow_tips: allowTips,
        pickup_allowed: pickupAllowed,
        delivery_allowed: deliveryAllowed,
        preparation_time: preparationTime,
        transaction_tax_rate: transactionTaxRate,
      },
    );

    if (!data.update_restaurants_by_pk?.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order settings' },
        { status: 500 },
      );
    }

    const zonesInsertObjects = parsedDeliveryZones.zones.map((zone) => ({
      restaurant_id: restaurantId,
      is_deleted: false,
      name: zone.name,
      map_selection: zone.map_selection,
      delivery_fee: zone.delivery_fee,
      zip_code: zone.zip_code,
      polygon_points: zone.polygon_points,
      circle_radius: zone.circle_radius,
      min_order_amount: zone.min_order_amount,
    }));

    const zonesData = await adminGraphqlRequest<ReplaceDeliveryZonesResponse>(
      REPLACE_DELIVERY_ZONES,
      {
        restaurant_id: restaurantId,
        zones: zonesInsertObjects,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: data.update_restaurants_by_pk.restaurant_id,
        allow_tips: data.update_restaurants_by_pk.allow_tips ?? true,
        pickup_allowed: data.update_restaurants_by_pk.pickup_allowed ?? true,
        delivery_allowed: data.update_restaurants_by_pk.delivery_allowed ?? true,
        preparation_time: data.update_restaurants_by_pk.preparation_time ?? null,
        transaction_tax_rate: data.update_restaurants_by_pk.transaction_tax_rate ?? 5,
        delivery_zones: (zonesData.insert_delivery_zones?.returning || []).map(normalizeDeliveryZoneOutput),
      },
    });
  } catch (error) {
    console.error('[Order Settings] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order settings' },
      { status: 500 },
    );
  }
}
