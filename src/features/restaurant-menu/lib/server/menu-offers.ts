import 'server-only';

import { adminGraphqlRequest } from '@/lib/server/api-auth';
import type {
  MenuOffer,
  MenuOfferItemMap,
  MenuOfferType,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

const GET_ACTIVE_OFFERS = `
  query GetActiveOffers($restaurant_id: uuid!, $now: timestamptz!) {
    offers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        status: { _eq: "active" }
        start_date: { _lte: $now }
        _or: [{ end_date: { _is_null: true } }, { end_date: { _gte: $now } }]
      }
      order_by: [{ start_date: desc }, { created_at: desc }]
    ) {
      offer_id
      name
      type
      sub_type
      status
      start_date
      end_date
      percentage_off
      amount_off
      min_spend
      discounted_items
      qualifying_items
      free_items
    }
  }
`;

interface OfferRecord {
  offer_id?: string | null;
  name?: string | null;
  type?: string | null;
  sub_type?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  percentage_off?: number | string | null;
  amount_off?: number | string | null;
  min_spend?: number | string | null;
  discounted_items?: unknown;
  qualifying_items?: unknown;
  free_items?: unknown;
}

interface GetActiveOffersResponse {
  offers?: OfferRecord[];
}

export async function loadActiveMenuOffers(restaurantId: string): Promise<MenuOffer[]> {
  if (!restaurantId) {
    return [] as MenuOffer[];
  }

  const response = await adminGraphqlRequest<GetActiveOffersResponse>(
    GET_ACTIVE_OFFERS,
    {
      restaurant_id: restaurantId,
      now: new Date().toISOString(),
    },
  );

  return (Array.isArray(response.offers) ? response.offers : [])
    .map(normalizeMenuOffer)
    .filter((offer): offer is MenuOffer => Boolean(offer));
}

function normalizeMenuOffer(record: OfferRecord) {
  const id = trimText(record.offer_id);
  const type = normalizeOfferType(record.type);

  if (!id || !type) {
    return null;
  }

  return {
    id,
    name: trimText(record.name) || 'Restaurant offer',
    type,
    subType: trimText(record.sub_type),
    status: trimText(record.status) || 'active',
    startDate: trimText(record.start_date) || new Date().toISOString(),
    endDate: trimText(record.end_date),
    percentageOff: currency(record.percentage_off),
    amountOff: currency(record.amount_off),
    minSpend: currency(record.min_spend),
    discountedItems: normalizeItemMap(record.discounted_items),
    qualifyingItems: normalizeItemMap(record.qualifying_items),
    freeItems: normalizeItemMap(record.free_items),
  } satisfies MenuOffer;
}

function normalizeOfferType(value: string | null | undefined) {
  const normalized = trimText(value);
  if (
    normalized === 'percentage_off' ||
    normalized === 'amount_off' ||
    normalized === 'buy_1_get_1' ||
    normalized === 'free_item'
  ) {
    return normalized as MenuOfferType;
  }

  return null;
}

function normalizeItemMap(value: unknown): MenuOfferItemMap | null {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const normalized: MenuOfferItemMap = {};

  for (const [categoryId, itemIds] of Object.entries(parsed)) {
    if (!categoryId.trim() || !Array.isArray(itemIds)) {
      continue;
    }

    const nextItemIds = itemIds
      .map((itemId) => trimText(itemId))
      .filter((itemId): itemId is string => Boolean(itemId));

    if (nextItemIds.length) {
      normalized[categoryId.trim()] = Array.from(new Set(nextItemIds));
    }
  }

  return Object.keys(normalized).length ? normalized : null;
}

function parseJsonValue(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

function currency(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return roundCurrency(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return roundCurrency(parsed);
    }
  }

  return null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function trimText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
