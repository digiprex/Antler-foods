import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const COUPON_FIELDS = `
  coupon_id
  created_at
  updated_at
  start_date
  end_date
  code
  discount_type
  value
  min_spend
  usage_limit
  restaurant_id
`;

const GET_COUPONS = `
  query GetCoupons($restaurant_id: uuid!) {
    coupons(
      where: { restaurant_id: { _eq: $restaurant_id } }
      order_by: { created_at: desc }
    ) {
      ${COUPON_FIELDS}
    }
  }
`;

const INSERT_COUPON = `
  mutation InsertCoupon(
    $code: String!
    $discount_type: String!
    $value: numeric!
    $min_spend: numeric!
    $usage_limit: numeric
    $start_date: timestamptz!
    $end_date: timestamptz
    $restaurant_id: uuid!
  ) {
    insert_coupons_one(
      object: {
        code: $code
        discount_type: $discount_type
        value: $value
        min_spend: $min_spend
        usage_limit: $usage_limit
        start_date: $start_date
        end_date: $end_date
        restaurant_id: $restaurant_id
      }
    ) {
      ${COUPON_FIELDS}
    }
  }
`;

const UPDATE_COUPON = `
  mutation UpdateCoupon(
    $coupon_id: uuid!
    $restaurant_id: uuid!
    $code: String!
    $discount_type: String!
    $value: numeric!
    $min_spend: numeric!
    $usage_limit: numeric
    $start_date: timestamptz!
    $end_date: timestamptz
  ) {
    update_coupons(
      where: {
        coupon_id: { _eq: $coupon_id }
        restaurant_id: { _eq: $restaurant_id }
      }
      _set: {
        code: $code
        discount_type: $discount_type
        value: $value
        min_spend: $min_spend
        usage_limit: $usage_limit
        start_date: $start_date
        end_date: $end_date
      }
    ) {
      returning {
        ${COUPON_FIELDS}
      }
    }
  }
`;

const DELETE_COUPON = `
  mutation DeleteCoupon($coupon_id: uuid!, $restaurant_id: uuid!) {
    delete_coupons(
      where: {
        coupon_id: { _eq: $coupon_id }
        restaurant_id: { _eq: $restaurant_id }
      }
    ) {
      affected_rows
    }
  }
`;

type CouponPayload = {
  code: string;
  discount_type: string;
  value: number;
  min_spend: number;
  usage_limit: number | null;
  start_date: string;
  end_date: string | null;
  restaurant_id: string;
};

interface CouponsResponse {
  coupons?: any[];
}

interface InsertCouponResponse {
  insert_coupons_one?: any;
}

interface UpdateCouponResponse {
  update_coupons?: {
    returning?: any[];
  };
}

interface DeleteCouponResponse {
  delete_coupons?: {
    affected_rows?: number;
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoTimestamp(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function parseCouponPayload(raw: Record<string, unknown>) {
  const code = normalizeString(raw.code).toUpperCase();
  const discountType = normalizeString(raw.discount_type);
  const value = toNumber(raw.value);
  const minSpend = toNumber(raw.min_spend);
  const usageLimitRaw = raw.usage_limit;
  const startDateRaw = normalizeString(raw.start_date);
  const endDateRaw = normalizeString(raw.end_date);
  const restaurantId = normalizeString(raw.restaurant_id);

  if (!restaurantId) {
    return { error: 'Restaurant ID is required.' };
  }

  if (!code) {
    return { error: 'Coupon code is required.' };
  }

  if (!discountType) {
    return { error: 'Discount type is required.' };
  }

  if (!Number.isFinite(value) || value < 0) {
    return { error: 'Value must be a valid number greater than or equal to 0.' };
  }

  if (discountType.toLowerCase() === 'percentage' && value > 100) {
    return { error: 'Percentage discount cannot be greater than 100.' };
  }

  if (!Number.isFinite(minSpend) || minSpend < 0) {
    return { error: 'Minimum spend must be a valid number greater than or equal to 0.' };
  }

  let usageLimit: number | null = null;
  if (usageLimitRaw !== null && usageLimitRaw !== undefined && String(usageLimitRaw).trim() !== '') {
    usageLimit = toNumber(usageLimitRaw, NaN);

    if (!Number.isFinite(usageLimit) || usageLimit < 1 || !Number.isInteger(usageLimit)) {
      return { error: 'Usage limit must be a whole number greater than or equal to 1.' };
    }
  }

  const parsedStartDate = toIsoTimestamp(startDateRaw || new Date().toISOString());
  if (!parsedStartDate) {
    return { error: 'Start date must be a valid date and time.' };
  }

  let parsedEndDate: string | null = null;
  if (endDateRaw) {
    parsedEndDate = toIsoTimestamp(endDateRaw);
    if (!parsedEndDate) {
      return { error: 'End date must be a valid date and time.' };
    }
  }

  if (
    parsedEndDate &&
    Date.parse(parsedEndDate) < Date.parse(parsedStartDate)
  ) {
    return { error: 'End date must be greater than or equal to start date.' };
  }

  const payload: CouponPayload = {
    code,
    discount_type: discountType,
    value,
    min_spend: minSpend,
    usage_limit: usageLimit,
    start_date: parsedStartDate,
    end_date: parsedEndDate,
    restaurant_id: restaurantId,
  };

  return { payload };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = normalizeString(searchParams.get('restaurant_id'));

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<CouponsResponse>(GET_COUPONS, {
      restaurant_id: restaurantId,
    });

    return NextResponse.json({
      success: true,
      coupons: data.coupons || [],
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch coupons' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseCouponPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const data = await adminGraphqlRequest<InsertCouponResponse>(INSERT_COUPON, parsed.payload);
    if (!data.insert_coupons_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to create coupon' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      coupon: data.insert_coupons_one,
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const couponId = normalizeString(body.coupon_id);

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: 'coupon_id is required' },
        { status: 400 },
      );
    }

    const parsed = parseCouponPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const data = await adminGraphqlRequest<UpdateCouponResponse>(UPDATE_COUPON, {
      coupon_id: couponId,
      ...parsed.payload,
    });

    const updated = data.update_coupons?.returning?.[0];
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found or failed to update' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      coupon: updated,
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update coupon' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const couponId = normalizeString(searchParams.get('coupon_id'));
    const restaurantId = normalizeString(searchParams.get('restaurant_id'));

    if (!couponId || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'coupon_id and restaurant_id are required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<DeleteCouponResponse>(DELETE_COUPON, {
      coupon_id: couponId,
      restaurant_id: restaurantId,
    });

    if (!data.delete_coupons?.affected_rows) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete coupon' },
      { status: 500 },
    );
  }
}
