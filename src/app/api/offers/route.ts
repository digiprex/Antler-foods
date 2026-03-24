import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const OFFER_FIELDS = `
  offer_id
  created_at
  updated_at
  is_deleted
  start_date
  end_date
  name
  type
  sub_type
  status
  details
  restaurant_id
`;

const GET_OFFERS = `
  query GetOffers($restaurant_id: uuid!) {
    offers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      ${OFFER_FIELDS}
    }
  }
`;

const INSERT_OFFER = `
  mutation InsertOffer(
    $name: String!
    $type: String!
    $sub_type: String
    $status: String!
    $details: String!
    $start_date: timestamptz!
    $end_date: timestamptz
    $is_deleted: Boolean!
    $restaurant_id: uuid!
  ) {
    insert_offers_one(
      object: {
        name: $name
        type: $type
        sub_type: $sub_type
        status: $status
        details: $details
        start_date: $start_date
        end_date: $end_date
        is_deleted: $is_deleted
        restaurant_id: $restaurant_id
      }
    ) {
      ${OFFER_FIELDS}
    }
  }
`;

const UPDATE_OFFER = `
  mutation UpdateOffer(
    $offer_id: uuid!
    $restaurant_id: uuid!
    $name: String!
    $type: String!
    $sub_type: String
    $status: String!
    $details: String!
    $start_date: timestamptz!
    $end_date: timestamptz
  ) {
    update_offers(
      where: {
        offer_id: { _eq: $offer_id }
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      _set: {
        name: $name
        type: $type
        sub_type: $sub_type
        status: $status
        details: $details
        start_date: $start_date
        end_date: $end_date
      }
    ) {
      returning {
        ${OFFER_FIELDS}
      }
    }
  }
`;

const DELETE_OFFER = `
  mutation DeleteOffer($offer_id: uuid!, $restaurant_id: uuid!) {
    update_offers(
      where: {
        offer_id: { _eq: $offer_id }
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

type OfferPayload = {
  name: string;
  type: string;
  sub_type: string | null;
  status: string;
  details: string;
  start_date: string;
  end_date: string | null;
  is_deleted: boolean;
  restaurant_id: string;
};

interface OffersResponse {
  offers?: any[];
}

interface InsertOfferResponse {
  insert_offers_one?: any;
}

interface UpdateOfferResponse {
  update_offers?: {
    returning?: any[];
  };
}

interface DeleteOfferResponse {
  update_offers?: {
    affected_rows?: number;
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toIsoTimestamp(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function parseOfferPayload(raw: Record<string, unknown>) {
  const name = normalizeString(raw.name);
  const type = normalizeString(raw.type);
  const subType = normalizeString(raw.sub_type) || null;
  const status = normalizeString(raw.status);
  const details = normalizeString(raw.details);
  const startDateRaw = normalizeString(raw.start_date);
  const endDateRaw = normalizeString(raw.end_date);
  const restaurantId = normalizeString(raw.restaurant_id);

  if (!restaurantId) {
    return { error: 'Restaurant ID is required.' };
  }

  if (!name) {
    return { error: 'Offer name is required.' };
  }

  if (!type) {
    return { error: 'Offer type is required.' };
  }

  if (!status) {
    return { error: 'Offer status is required.' };
  }

  if (!details) {
    return { error: 'Offer details are required.' };
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

  const payload: OfferPayload = {
    name,
    type,
    sub_type: subType,
    status,
    details,
    start_date: parsedStartDate,
    end_date: parsedEndDate,
    is_deleted: false,
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

    const data = await adminGraphqlRequest<OffersResponse>(GET_OFFERS, {
      restaurant_id: restaurantId,
    });

    return NextResponse.json({
      success: true,
      offers: data.offers || [],
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch offers' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseOfferPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const data = await adminGraphqlRequest<InsertOfferResponse>(INSERT_OFFER, parsed.payload);
    if (!data.insert_offers_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to create offer' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      offer: data.insert_offers_one,
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create offer' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const offerId = normalizeString(body.offer_id);

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: 'offer_id is required' },
        { status: 400 },
      );
    }

    const parsed = parseOfferPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const data = await adminGraphqlRequest<UpdateOfferResponse>(UPDATE_OFFER, {
      offer_id: offerId,
      ...parsed.payload,
    });

    const updated = data.update_offers?.returning?.[0];
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Offer not found or failed to update' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      offer: updated,
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update offer' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = normalizeString(searchParams.get('offer_id'));
    const restaurantId = normalizeString(searchParams.get('restaurant_id'));

    if (!offerId || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'offer_id and restaurant_id are required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<DeleteOfferResponse>(DELETE_OFFER, {
      offer_id: offerId,
      restaurant_id: restaurantId,
    });

    if (!data.update_offers?.affected_rows) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete offer' },
      { status: 500 },
    );
  }
}