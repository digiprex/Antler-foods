import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendGiftCardEmail } from '@/lib/server/email';

const GIFT_CARD_FIELDS = `
  gift_card_id
  created_at
  updated_at
  is_deleted
  expiry_date
  initial_value
  restaurant_id
  code
  is_active
  current_balance
  total_redeemed
  status
  customer_id
  email
`;

const GET_GIFT_CARDS = `
  query GetGiftCards($restaurant_id: uuid!) {
    gift_cards(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      ${GIFT_CARD_FIELDS}
    }
  }
`;

const INSERT_GIFT_CARD = `
  mutation InsertGiftCard(
    $restaurant_id: uuid!
    $code: String!
    $email: String!
    $initial_value: numeric!
    $current_balance: numeric!
    $expiry_date: timestamptz!
    $is_active: Boolean!
    $is_deleted: Boolean!
    $customer_id: uuid
    $total_redeemed: numeric
    $status: String
  ) {
    insert_gift_cards_one(
      object: {
        restaurant_id: $restaurant_id
        code: $code
        email: $email
        initial_value: $initial_value
        current_balance: $current_balance
        expiry_date: $expiry_date
        is_active: $is_active
        is_deleted: $is_deleted
        customer_id: $customer_id
        total_redeemed: $total_redeemed
        status: $status
      }
    ) {
      ${GIFT_CARD_FIELDS}
    }
  }
`;

const UPDATE_GIFT_CARD_STATUS = `
  mutation UpdateGiftCardStatus(
    $gift_card_id: uuid!
    $restaurant_id: uuid!
    $is_active: Boolean!
  ) {
    update_gift_cards(
      where: {
        gift_card_id: { _eq: $gift_card_id }
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      _set: {
        is_active: $is_active
      }
    ) {
      returning {
        ${GIFT_CARD_FIELDS}
      }
    }
  }
`;

type GiftCardPayload = {
  restaurant_id: string;
  code: string;
  email: string;
  initial_value: number;
  current_balance: number;
  expiry_date: string;
  is_active: boolean;
  is_deleted: boolean;
  customer_id: string | null;
  total_redeemed: number;
  status: string;
};

interface GiftCardsResponse {
  gift_cards?: any[];
}

interface InsertGiftCardResponse {
  insert_gift_cards_one?: any;
}

interface UpdateGiftCardResponse {
  update_gift_cards?: {
    returning?: any[];
  };
}

interface RestaurantNameResponse {
  restaurants_by_pk: {
    name: string | null;
  } | null;
}

const GET_RESTAURANT_NAME = `
  query GetRestaurantName($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
    }
  }
`;

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

function generateGiftCardCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GC-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function parseGiftCardPayload(raw: Record<string, unknown>) {
  const restaurantId = normalizeString(raw.restaurant_id);
  const email = normalizeString(raw.email).toLowerCase();
  const code = normalizeString(raw.code).toUpperCase() || generateGiftCardCode();
  const expiryRaw = normalizeString(raw.expiry_date);
  const initialValue = toNumber(raw.initial_value, NaN);
  const currentBalanceRaw = raw.current_balance;
  const isActive = typeof raw.is_active === 'boolean' ? raw.is_active : true;
  const customerIdRaw = normalizeString(raw.customer_id);

  if (!restaurantId) {
    return { error: 'Restaurant ID is required.' };
  }

  if (!email) {
    return { error: 'Email is required.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email must be valid.' };
  }

  if (!Number.isFinite(initialValue) || initialValue <= 0) {
    return { error: 'Initial value must be greater than 0.' };
  }

  const currentBalance =
    currentBalanceRaw === null || currentBalanceRaw === undefined || String(currentBalanceRaw).trim() === ''
      ? initialValue
      : toNumber(currentBalanceRaw, NaN);

  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    return { error: 'Current balance must be greater than or equal to 0.' };
  }

  if (currentBalance > initialValue) {
    return { error: 'Current balance cannot be greater than initial value.' };
  }

  const expiryDate = toIsoTimestamp(expiryRaw);
  if (!expiryDate) {
    return { error: 'Expiry date must be a valid date and time.' };
  }

  const totalRedeemed = initialValue - currentBalance;

  const payload: GiftCardPayload = {
    restaurant_id: restaurantId,
    code,
    email,
    initial_value: initialValue,
    current_balance: currentBalance,
    expiry_date: expiryDate,
    is_active: isActive,
    is_deleted: false,
    customer_id: customerIdRaw || null,
    total_redeemed: totalRedeemed,
    status: 'active',
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

    const data = await adminGraphqlRequest<GiftCardsResponse>(GET_GIFT_CARDS, {
      restaurant_id: restaurantId,
    });

    return NextResponse.json({
      success: true,
      gift_cards: data.gift_cards || [],
    });
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch gift cards' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseGiftCardPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const data = await adminGraphqlRequest<InsertGiftCardResponse>(INSERT_GIFT_CARD, parsed.payload);
    if (!data.insert_gift_cards_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to create gift card' },
        { status: 500 },
      );
    }

    const createdGiftCard = data.insert_gift_cards_one;
    let emailSent = false;
    let emailWarning: string | null = null;

    try {
      const restaurantData = await adminGraphqlRequest<RestaurantNameResponse>(GET_RESTAURANT_NAME, {
        restaurant_id: createdGiftCard.restaurant_id,
      });

      await sendGiftCardEmail(createdGiftCard.email, {
        code: createdGiftCard.code,
        initialValue: Number(createdGiftCard.initial_value || 0),
        currentBalance: Number(createdGiftCard.current_balance || 0),
        expiryDate: createdGiftCard.expiry_date,
        restaurantName: restaurantData.restaurants_by_pk?.name || undefined,
      });

      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send gift card email:', emailError);
      emailWarning = 'Gift card created, but failed to send recipient email.';
    }

    return NextResponse.json({
      success: true,
      gift_card: createdGiftCard,
      email_sent: emailSent,
      ...(emailWarning ? { warning: emailWarning } : {}),
    });
  } catch (error) {
    console.error('Error creating gift card:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create gift card' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const giftCardId = normalizeString(body.gift_card_id);
    const restaurantId = normalizeString(body.restaurant_id);
    const isActive = typeof body.is_active === 'boolean' ? body.is_active : null;

    if (!giftCardId) {
      return NextResponse.json(
        { success: false, error: 'gift_card_id is required' },
        { status: 400 },
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    if (isActive === null) {
      return NextResponse.json(
        { success: false, error: 'is_active must be a boolean' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<UpdateGiftCardResponse>(UPDATE_GIFT_CARD_STATUS, {
      gift_card_id: giftCardId,
      restaurant_id: restaurantId,
      is_active: isActive,
    });

    const updated = data.update_gift_cards?.returning?.[0];
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found or failed to update' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      gift_card: updated,
    });
  } catch (error) {
    console.error('Error updating gift card:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update gift card' },
      { status: 500 },
    );
  }
}
