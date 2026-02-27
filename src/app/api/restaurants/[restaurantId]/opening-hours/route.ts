import { NextResponse } from 'next/server';
import {
  RouteError,
  adminGraphqlRequest,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';

type OpeningHoursProfileRow = {
  opening_hour_id?: string | null;
  restaurant_id?: string | null;
  source?: string | null;
  timezone?: string | null;
  is_active?: boolean | null;
  is_24x7?: boolean | null;
  notes?: string | null;
  synced_at?: string | null;
  created_by_user_id?: string | null;
  is_deleted?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type OpeningHourSlotRow = {
  opening_hour_slot_id?: string | null;
  opening_hour_id?: string | null;
  day_of_week?: number | null;
  slot_order?: number | null;
  is_closed?: boolean | null;
  open_time?: string | null;
  close_time?: string | null;
  is_deleted?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

interface ActiveOpeningHoursResponse {
  opening_hours?: OpeningHoursProfileRow[];
}

interface OpeningHourSlotsResponse {
  opening_hour_slots?: OpeningHourSlotRow[];
}

interface InsertOpeningHoursResponse {
  insert_opening_hours_one?: OpeningHoursProfileRow | null;
}

interface InsertOpeningHourSlotsResponse {
  insert_opening_hour_slots?: {
    affected_rows?: number | null;
  } | null;
}

interface UpdateOpeningHoursByPkResponse {
  update_opening_hours_by_pk?: OpeningHoursProfileRow | null;
}

interface SoftDeleteOpeningHourSlotsByIdsResponse {
  update_opening_hour_slots?: {
    affected_rows?: number | null;
  } | null;
}

interface UpdateOpeningHourSlotByPkResponse {
  update_opening_hour_slots_by_pk?: OpeningHourSlotRow | null;
}

type GooglePlacePeriodPoint = {
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
};

type GooglePlacePeriod = {
  open?: GooglePlacePeriodPoint;
  close?: GooglePlacePeriodPoint;
};

type GooglePlaceOpeningHoursResponse = {
  regularOpeningHours?: {
    periods?: unknown;
  };
  error?: unknown;
  message?: unknown;
};

type CanonicalOpeningHourSlot = {
  day_of_week: number;
  slot_order: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

const DAY_OF_WEEK_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;
const MAX_SLOTS_PER_DAY = 5;
const GOOGLE_HOURS_FIELDS_MASK = 'regularOpeningHours.periods';

const GET_ACTIVE_OPENING_HOURS = `
  query GetActiveOpeningHours($restaurant_id: uuid!) {
    opening_hours(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_active: { _eq: true }
        is_deleted: { _eq: false }
      }
      order_by: [{ updated_at: desc }, { created_at: desc }]
      limit: 1
    ) {
      opening_hour_id
      restaurant_id
      source
      timezone
      is_active
      is_24x7
      notes
      synced_at
      created_by_user_id
      is_deleted
      created_at
      updated_at
    }
  }
`;

const GET_OPENING_HOUR_SLOTS = `
  query GetOpeningHourSlots($opening_hour_id: uuid!) {
    opening_hour_slots(
      where: {
        opening_hour_id: { _eq: $opening_hour_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ day_of_week: asc }, { slot_order: asc }, { created_at: asc }]
    ) {
      opening_hour_slot_id
      opening_hour_id
      day_of_week
      slot_order
      is_closed
      open_time
      close_time
      is_deleted
      created_at
      updated_at
    }
  }
`;

const INSERT_OPENING_HOURS = `
  mutation InsertOpeningHours($object: opening_hours_insert_input!) {
    insert_opening_hours_one(object: $object) {
      opening_hour_id
      restaurant_id
      source
      timezone
      is_active
      is_24x7
      notes
      synced_at
      created_by_user_id
      is_deleted
      created_at
      updated_at
    }
  }
`;

const UPDATE_OPENING_HOURS_BY_PK = `
  mutation UpdateOpeningHoursByPk(
    $opening_hour_id: uuid!
    $changes: opening_hours_set_input!
  ) {
    update_opening_hours_by_pk(
      pk_columns: { opening_hour_id: $opening_hour_id }
      _set: $changes
    ) {
      opening_hour_id
      restaurant_id
      source
      timezone
      is_active
      is_24x7
      notes
      synced_at
      created_by_user_id
      is_deleted
      created_at
      updated_at
    }
  }
`;

const SOFT_DELETE_OPENING_HOUR_SLOTS_BY_IDS = `
  mutation SoftDeleteOpeningHourSlotsByIds(
    $opening_hour_slot_ids: [uuid!]!
    $updated_at: timestamptz!
  ) {
    update_opening_hour_slots(
      where: {
        opening_hour_slot_id: { _in: $opening_hour_slot_ids }
        is_deleted: { _eq: false }
      }
      _set: { is_deleted: true, updated_at: $updated_at }
    ) {
      affected_rows
    }
  }
`;

const INSERT_OPENING_HOUR_SLOTS = `
  mutation InsertOpeningHourSlots($objects: [opening_hour_slots_insert_input!]!) {
    insert_opening_hour_slots(objects: $objects) {
      affected_rows
    }
  }
`;

const UPDATE_OPENING_HOUR_SLOT_BY_PK = `
  mutation UpdateOpeningHourSlotByPk(
    $opening_hour_slot_id: uuid!
    $changes: opening_hour_slots_set_input!
  ) {
    update_opening_hour_slots_by_pk(
      pk_columns: { opening_hour_slot_id: $opening_hour_slot_id }
      _set: $changes
    ) {
      opening_hour_slot_id
    }
  }
`;

export async function GET(
  request: Request,
  context: { params: { restaurantId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    const { restaurant, user } = await requireRestaurantAccess(request, restaurantId);

    let profile = await loadActiveOpeningHoursProfile(restaurantId);
    let slots = profile?.opening_hour_id
      ? await loadOpeningHourSlots(profile.opening_hour_id)
      : [];
    let googleSyncError: string | null = null;

    if (!profile && restaurant.googlePlaceId) {
      try {
        const synced = await syncGoogleHoursToDatabase({
          restaurantId,
          googlePlaceId: restaurant.googlePlaceId,
          createdByUserId: user.userId,
          timezoneFallback: 'UTC',
        });
        profile = synced.profile;
        slots = synced.slots;
      } catch (caughtError) {
        googleSyncError =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to sync opening hours from Google.';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: profile ? normalizeOpeningHoursProfile(profile) : null,
        slots: slots.map(normalizeOpeningHourSlot).filter(Boolean),
        has_google_place_id: Boolean(restaurant.googlePlaceId),
        google_sync_error: googleSyncError,
      },
    });
  } catch (caughtError) {
    if (caughtError instanceof RouteError) {
      return NextResponse.json(
        { success: false, error: caughtError.message },
        { status: caughtError.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to load opening hours.',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { restaurantId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    const { restaurant, user } = await requireRestaurantAccess(request, restaurantId);
    const payload = (await safeParseJson(request)) as
      | {
          action?: unknown;
          timezone?: unknown;
          is_24x7?: unknown;
          notes?: unknown;
          slots?: unknown;
        }
      | null;

    const action = normalizeString(payload?.action)?.toLowerCase() || 'save_manual';

    if (action === 'sync_google') {
      if (!restaurant.googlePlaceId) {
        return NextResponse.json(
          { success: false, error: 'Restaurant does not have a Google Place ID.' },
          { status: 400 },
        );
      }

      const timezoneFallback =
        normalizeString(payload?.timezone) ||
        (await loadActiveOpeningHoursProfile(restaurantId))?.timezone ||
        'UTC';

      const synced = await syncGoogleHoursToDatabase({
        restaurantId,
        googlePlaceId: restaurant.googlePlaceId,
        createdByUserId: user.userId,
        timezoneFallback,
      });

      return NextResponse.json({
        success: true,
        data: {
          profile: normalizeOpeningHoursProfile(synced.profile),
          slots: synced.slots.map(normalizeOpeningHourSlot).filter(Boolean),
        },
        message: 'Opening hours synced from Google.',
      });
    }

    const timezone = normalizeString(payload?.timezone);
    if (!timezone) {
      return NextResponse.json(
        { success: false, error: 'timezone is required.' },
        { status: 400 },
      );
    }

    const is24x7 = normalizeBoolean(payload?.is_24x7, false);
    const notes = normalizeNullableString(payload?.notes);
    const rawSlots = Array.isArray(payload?.slots) ? payload.slots : [];
    const slots = buildCanonicalManualSlots(rawSlots, is24x7);

    const persisted = await persistOpeningHoursProfile({
      restaurantId,
      source: 'manual',
      timezone,
      is24x7,
      notes,
      syncedAt: null,
      createdByUserId: user.userId,
      slots,
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: normalizeOpeningHoursProfile(persisted.profile),
        slots: persisted.slots.map(normalizeOpeningHourSlot).filter(Boolean),
      },
      message: 'Opening hours saved.',
    });
  } catch (caughtError) {
    if (caughtError instanceof RouteError) {
      return NextResponse.json(
        { success: false, error: caughtError.message },
        { status: caughtError.status },
      );
    }

    const message =
      caughtError instanceof Error ? caughtError.message : 'Failed to save opening hours.';
    const status =
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('overlap') ||
      message.includes('same day')
        ? 400
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}

async function loadActiveOpeningHoursProfile(restaurantId: string) {
  const data = await adminGraphqlRequest<ActiveOpeningHoursResponse>(
    GET_ACTIVE_OPENING_HOURS,
    {
      restaurant_id: restaurantId,
    },
  );

  const rows = Array.isArray(data.opening_hours) ? data.opening_hours : [];
  return rows[0] || null;
}

async function loadOpeningHourSlots(openingHourId: string) {
  const data = await adminGraphqlRequest<OpeningHourSlotsResponse>(GET_OPENING_HOUR_SLOTS, {
    opening_hour_id: openingHourId,
  });

  return Array.isArray(data.opening_hour_slots) ? data.opening_hour_slots : [];
}

type ComparableOpeningHourSlot = {
  opening_hour_slot_id: string;
  day_of_week: number;
  slot_order: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

function buildSlotDiffKey(dayOfWeek: number, slotOrder: number) {
  return `${dayOfWeek}:${slotOrder}`;
}

function areSlotValuesEqualForDiff(
  existing: ComparableOpeningHourSlot,
  next: CanonicalOpeningHourSlot,
) {
  return (
    existing.is_closed === next.is_closed &&
    existing.open_time === next.open_time &&
    existing.close_time === next.close_time
  );
}

function normalizeSlotForDiff(row: OpeningHourSlotRow): ComparableOpeningHourSlot | null {
  const openingHourSlotId = normalizeString(row.opening_hour_slot_id);
  const dayOfWeek = normalizeDayOfWeek(row.day_of_week);
  const slotOrder = normalizePositiveInt(row.slot_order);

  if (!openingHourSlotId || !dayOfWeek || !slotOrder) {
    return null;
  }

  return {
    opening_hour_slot_id: openingHourSlotId,
    day_of_week: dayOfWeek,
    slot_order: slotOrder,
    is_closed: Boolean(row.is_closed),
    open_time: normalizeNullableTimeValue(row.open_time),
    close_time: normalizeNullableTimeValue(row.close_time),
  };
}

async function syncOpeningHourSlotsWithDiff({
  openingHourId,
  desiredSlots,
  nowIso,
}: {
  openingHourId: string;
  desiredSlots: CanonicalOpeningHourSlot[];
  nowIso: string;
}) {
  const existingRows = await loadOpeningHourSlots(openingHourId);
  const existingSlots = existingRows
    .map(normalizeSlotForDiff)
    .filter((slot): slot is ComparableOpeningHourSlot => Boolean(slot));

  const seenDesiredKeys = new Set<string>();
  for (const slot of desiredSlots) {
    const key = buildSlotDiffKey(slot.day_of_week, slot.slot_order);
    if (seenDesiredKeys.has(key)) {
      throw new Error(
        `Duplicate slot key found for day ${slot.day_of_week}, order ${slot.slot_order}.`,
      );
    }
    seenDesiredKeys.add(key);
  }

  const existingByKey = new Map<string, ComparableOpeningHourSlot>();
  existingSlots.forEach((slot) => {
    const key = buildSlotDiffKey(slot.day_of_week, slot.slot_order);
    if (!existingByKey.has(key)) {
      existingByKey.set(key, slot);
    }
  });

  const matchedExistingIds = new Set<string>();
  const toInsert: CanonicalOpeningHourSlot[] = [];
  const toUpdate: Array<{
    opening_hour_slot_id: string;
    slot: CanonicalOpeningHourSlot;
  }> = [];

  desiredSlots.forEach((slot) => {
    const key = buildSlotDiffKey(slot.day_of_week, slot.slot_order);
    const existing = existingByKey.get(key);
    if (!existing) {
      toInsert.push(slot);
      return;
    }

    matchedExistingIds.add(existing.opening_hour_slot_id);
    if (!areSlotValuesEqualForDiff(existing, slot)) {
      toUpdate.push({
        opening_hour_slot_id: existing.opening_hour_slot_id,
        slot,
      });
    }
  });

  const toSoftDeleteIds = existingSlots
    .filter((slot) => !matchedExistingIds.has(slot.opening_hour_slot_id))
    .map((slot) => slot.opening_hour_slot_id);

  if (toUpdate.length > 0) {
    await Promise.all(
      toUpdate.map(({ opening_hour_slot_id, slot }) =>
        adminGraphqlRequest<UpdateOpeningHourSlotByPkResponse>(
          UPDATE_OPENING_HOUR_SLOT_BY_PK,
          {
            opening_hour_slot_id,
            changes: {
              day_of_week: slot.day_of_week,
              slot_order: slot.slot_order,
              is_closed: slot.is_closed,
              open_time: slot.open_time,
              close_time: slot.close_time,
              is_deleted: false,
              updated_at: nowIso,
            },
          },
        ),
      ),
    );
  }

  if (toInsert.length > 0) {
    await adminGraphqlRequest<InsertOpeningHourSlotsResponse>(INSERT_OPENING_HOUR_SLOTS, {
      objects: toInsert.map((slot) => ({
        opening_hour_id: openingHourId,
        day_of_week: slot.day_of_week,
        slot_order: slot.slot_order,
        is_closed: slot.is_closed,
        open_time: slot.open_time,
        close_time: slot.close_time,
        is_deleted: false,
        created_at: nowIso,
        updated_at: nowIso,
      })),
    });
  }

  if (toSoftDeleteIds.length > 0) {
    await adminGraphqlRequest<SoftDeleteOpeningHourSlotsByIdsResponse>(
      SOFT_DELETE_OPENING_HOUR_SLOTS_BY_IDS,
      {
        opening_hour_slot_ids: toSoftDeleteIds,
        updated_at: nowIso,
      },
    );
  }
}

async function persistOpeningHoursProfile({
  restaurantId,
  source,
  timezone,
  is24x7,
  notes,
  syncedAt,
  createdByUserId,
  slots,
}: {
  restaurantId: string;
  source: 'google' | 'manual';
  timezone: string;
  is24x7: boolean;
  notes: string | null;
  syncedAt: string | null;
  createdByUserId: string | null;
  slots: CanonicalOpeningHourSlot[];
}) {
  const nowIso = new Date().toISOString();
  const activeProfile = await loadActiveOpeningHoursProfile(restaurantId);
  const activeOpeningHourId = normalizeString(activeProfile?.opening_hour_id);
  let profile: OpeningHoursProfileRow | null = null;
  let openingHourId = activeOpeningHourId;

  if (openingHourId) {
    const updated = await adminGraphqlRequest<UpdateOpeningHoursByPkResponse>(
      UPDATE_OPENING_HOURS_BY_PK,
      {
        opening_hour_id: openingHourId,
        changes: {
          source,
          timezone,
          is_active: true,
          is_24x7: is24x7,
          notes,
          synced_at: syncedAt,
          created_by_user_id: createdByUserId,
          is_deleted: false,
          updated_at: nowIso,
        },
      },
    );
    profile = updated.update_opening_hours_by_pk || null;
  } else {
    const inserted = await adminGraphqlRequest<InsertOpeningHoursResponse>(
      INSERT_OPENING_HOURS,
      {
        object: {
          restaurant_id: restaurantId,
          source,
          timezone,
          is_active: true,
          is_24x7: is24x7,
          notes,
          synced_at: syncedAt,
          created_by_user_id: createdByUserId,
          is_deleted: false,
          created_at: nowIso,
          updated_at: nowIso,
        },
      },
    );
    profile = inserted.insert_opening_hours_one || null;
    openingHourId = normalizeString(profile?.opening_hour_id);
  }

  if (!profile || !openingHourId) {
    throw new Error('Failed to persist opening hours profile.');
  }

  await syncOpeningHourSlotsWithDiff({
    openingHourId,
    desiredSlots: is24x7 ? [] : slots,
    nowIso,
  });

  const insertedSlots = is24x7 ? [] : await loadOpeningHourSlots(openingHourId);

  return {
    profile,
    slots: insertedSlots,
  };
}

async function syncGoogleHoursToDatabase({
  restaurantId,
  googlePlaceId,
  createdByUserId,
  timezoneFallback,
}: {
  restaurantId: string;
  googlePlaceId: string;
  createdByUserId: string | null;
  timezoneFallback: string;
}) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured on server.');
  }

  const normalizedPlaceId = normalizePlaceId(googlePlaceId);
  if (!normalizedPlaceId) {
    throw new Error('Stored Google Place ID is invalid. Update Google profile settings.');
  }

  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(
    normalizedPlaceId,
  )}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_HOURS_FIELDS_MASK,
    },
    cache: 'no-store',
  });

  const payload = (await safeParseJson(response)) as GooglePlaceOpeningHoursResponse | null;
  if (!response.ok) {
    const message = extractGoogleErrorMessage(payload);
    throw new Error(
      message || `Google Places opening-hours request failed with HTTP ${response.status}.`,
    );
  }

  const periods = extractGoogleOpeningPeriods(payload);
  const mapped = mapGooglePeriodsToCanonicalSlots(periods);

  return persistOpeningHoursProfile({
    restaurantId,
    source: 'google',
    timezone: normalizeString(timezoneFallback) || 'UTC',
    is24x7: mapped.is24x7,
    notes: null,
    syncedAt: new Date().toISOString(),
    createdByUserId,
    slots: mapped.slots,
  });
}

function buildCanonicalManualSlots(rawSlots: unknown[], is24x7: boolean) {
  if (is24x7) {
    return [] as CanonicalOpeningHourSlot[];
  }

  type DayAccumulator = {
    explicitlyClosed: boolean;
    intervals: Array<{
      open_time: string;
      close_time: string;
    }>;
  };

  const byDay = new Map<number, DayAccumulator>();
  DAY_OF_WEEK_VALUES.forEach((day) => {
    byDay.set(day, { explicitlyClosed: false, intervals: [] });
  });

  for (const rawSlot of rawSlots) {
    if (!rawSlot || typeof rawSlot !== 'object') {
      continue;
    }

    const record = rawSlot as Record<string, unknown>;
    const dayOfWeek = normalizeDayOfWeek(record.day_of_week);
    if (!dayOfWeek) {
      throw new Error('Invalid day_of_week in opening-hour slots.');
    }

    const isClosed = normalizeBoolean(record.is_closed, false);
    const dayState = byDay.get(dayOfWeek);
    if (!dayState) {
      continue;
    }

    if (isClosed) {
      dayState.explicitlyClosed = true;
      continue;
    }

    const openTime = normalizeTimeValue(record.open_time);
    const closeTime = normalizeTimeValue(record.close_time);
    if (!openTime || !closeTime) {
      throw new Error('Open and close time are required for open slots.');
    }

    if (timeToMinutes(openTime) >= timeToMinutes(closeTime)) {
      throw new Error(
        'Each slot must close after it opens on the same day. Split overnight hours across two days.',
      );
    }

    dayState.intervals.push({
      open_time: openTime,
      close_time: closeTime,
    });
  }

  const canonical: CanonicalOpeningHourSlot[] = [];

  for (const dayOfWeek of DAY_OF_WEEK_VALUES) {
    const dayState = byDay.get(dayOfWeek);
    if (!dayState) {
      continue;
    }

    if (dayState.explicitlyClosed && dayState.intervals.length > 0) {
      throw new Error(
        `Day ${dayOfWeek} has both closed and open slots. Keep either closed or open slots.`,
      );
    }

    if (dayState.explicitlyClosed || dayState.intervals.length === 0) {
      canonical.push({
        day_of_week: dayOfWeek,
        slot_order: 1,
        is_closed: true,
        open_time: null,
        close_time: null,
      });
      continue;
    }

    const sorted = dayState.intervals
      .slice()
      .sort((a, b) => timeToMinutes(a.open_time) - timeToMinutes(b.open_time));

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (timeToMinutes(previous.close_time) > timeToMinutes(current.open_time)) {
        throw new Error(
          `Slots overlap on day ${dayOfWeek}. Adjust break-time slots so they do not overlap.`,
        );
      }
    }

    if (sorted.length > MAX_SLOTS_PER_DAY) {
      throw new Error(
        `Day ${dayOfWeek} has more than ${MAX_SLOTS_PER_DAY} slots. Reduce break splits.`,
      );
    }

    const orderedForStorage = orderIntervalsForSlotOrder(
      sorted.map((slot) => ({
        start: timeToMinutes(slot.open_time),
        end: timeToMinutes(slot.close_time),
      })),
    );

    orderedForStorage.forEach((slot, index) => {
      canonical.push({
        day_of_week: dayOfWeek,
        slot_order: index + 1,
        is_closed: false,
        open_time: minutesToTime(slot.start, false),
        close_time: minutesToTime(slot.end, true),
      });
    });
  }

  return canonical;
}

function mapGooglePeriodsToCanonicalSlots(rawPeriods: unknown[]) {
  if (!rawPeriods.length) {
    return {
      is24x7: false,
      slots: buildCanonicalManualSlots([], false),
    };
  }

  const dayIntervals = new Map<number, Array<{ start: number; end: number }>>();
  DAY_OF_WEEK_VALUES.forEach((day) => dayIntervals.set(day, []));

  for (const rawPeriod of rawPeriods) {
    if (!rawPeriod || typeof rawPeriod !== 'object') {
      continue;
    }

    const period = rawPeriod as GooglePlacePeriod;
    const open = normalizeGooglePeriodPoint(period.open);
    const close = normalizeGooglePeriodPoint(period.close);

    if (!open) {
      continue;
    }

    if (!close) {
      return { is24x7: true, slots: [] as CanonicalOpeningHourSlot[] };
    }

    if (
      open.day === close.day &&
      open.hour === 0 &&
      open.minute === 0 &&
      close.hour === 0 &&
      close.minute === 0
    ) {
      return { is24x7: true, slots: [] as CanonicalOpeningHourSlot[] };
    }

    appendGooglePeriod(dayIntervals, open, close);
  }

  const canonical: CanonicalOpeningHourSlot[] = [];

  for (const dayOfWeek of DAY_OF_WEEK_VALUES) {
    const intervals = dayIntervals.get(dayOfWeek) ?? [];
    const merged = mergeIntervals(intervals);

    if (!merged.length) {
      canonical.push({
        day_of_week: dayOfWeek,
        slot_order: 1,
        is_closed: true,
        open_time: null,
        close_time: null,
      });
      continue;
    }

    if (merged.length > MAX_SLOTS_PER_DAY) {
      throw new Error(
        `Google opening-hours sync produced more than ${MAX_SLOTS_PER_DAY} slots for day ${dayOfWeek}. Save manually for this restaurant.`,
      );
    }

    const orderedForStorage = orderIntervalsForSlotOrder(merged);

    orderedForStorage.forEach((interval, index) => {
      canonical.push({
        day_of_week: dayOfWeek,
        slot_order: index + 1,
        is_closed: false,
        open_time: minutesToTime(interval.start, false),
        close_time: minutesToTime(interval.end, true),
      });
    });
  }

  return {
    is24x7: false,
    slots: canonical,
  };
}

function appendGooglePeriod(
  dayIntervals: Map<number, Array<{ start: number; end: number }>>,
  open: { day: number; hour: number; minute: number },
  close: { day: number; hour: number; minute: number },
) {
  const openDay = mapGoogleDayToDb(open.day);
  const closeDay = mapGoogleDayToDb(close.day);
  if (!openDay || !closeDay) {
    return;
  }

  const openMinutes = open.hour * 60 + open.minute;
  const closeMinutes = close.hour * 60 + close.minute;

  if (openDay === closeDay && openMinutes < closeMinutes) {
    pushInterval(dayIntervals, openDay, openMinutes, closeMinutes);
    return;
  }

  pushInterval(dayIntervals, openDay, openMinutes, 1440);
  let pointerDay = nextDayOfWeek(openDay);
  while (pointerDay !== closeDay) {
    pushInterval(dayIntervals, pointerDay, 0, 1440);
    pointerDay = nextDayOfWeek(pointerDay);
  }

  if (closeMinutes > 0) {
    pushInterval(dayIntervals, closeDay, 0, closeMinutes);
  }
}

function pushInterval(
  dayIntervals: Map<number, Array<{ start: number; end: number }>>,
  dayOfWeek: number,
  start: number,
  end: number,
) {
  if (start < 0 || start > 1440 || end < 0 || end > 1440 || start >= end) {
    return;
  }

  const entry = dayIntervals.get(dayOfWeek) ?? [];
  entry.push({ start, end });
  dayIntervals.set(dayOfWeek, entry);
}

function mergeIntervals(intervals: Array<{ start: number; end: number }>) {
  if (!intervals.length) {
    return [];
  }

  const sorted = intervals.slice().sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];

  sorted.forEach((slot) => {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...slot });
      return;
    }

    if (slot.start <= previous.end) {
      previous.end = Math.max(previous.end, slot.end);
      return;
    }

    merged.push({ ...slot });
  });

  return merged;
}

function orderIntervalsForSlotOrder(intervals: Array<{ start: number; end: number }>) {
  if (intervals.length < 2) {
    return intervals;
  }

  // Keep business-readable order for overnight schedules:
  // e.g. 11:00-23:59:59 should be slot 1 and 00:00-02:00 should be slot 2.
  const hasMidnightCarry = intervals.some((slot) => slot.start === 0);
  const hasLateDaySegment = intervals.some((slot) => slot.end >= 1439);
  if (!hasMidnightCarry || !hasLateDaySegment) {
    return intervals;
  }

  const regularDaySegments = intervals.filter((slot) => slot.start !== 0);
  const carrySegments = intervals.filter((slot) => slot.start === 0);
  return [...regularDaySegments, ...carrySegments];
}

function normalizeGooglePeriodPoint(raw: GooglePlacePeriodPoint | undefined | null) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const day = normalizeGoogleDay(raw.day);
  const hour = normalizeHour(raw.hour);
  const minute = normalizeMinute(raw.minute);
  if (day == null || hour == null || minute == null) {
    return null;
  }

  return { day, hour, minute };
}

function extractGoogleOpeningPeriods(payload: GooglePlaceOpeningHoursResponse | null) {
  const periods = payload?.regularOpeningHours?.periods;
  return Array.isArray(periods) ? periods : [];
}

function getGoogleApiKey() {
  return (
    normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
    normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  );
}

function extractGoogleErrorMessage(payload: GooglePlaceOpeningHoursResponse | null) {
  const record =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;
  const direct = normalizeString(record?.message);
  if (direct) {
    return direct;
  }

  const errorValue = record?.error;
  if (!errorValue || typeof errorValue !== 'object') {
    return null;
  }

  const errorRecord = errorValue as Record<string, unknown>;
  return normalizeString(errorRecord.message) || normalizeString(errorRecord.status);
}

function normalizeOpeningHoursProfile(row: OpeningHoursProfileRow) {
  const openingHourId = normalizeString(row.opening_hour_id);
  const restaurantId = normalizeString(row.restaurant_id);
  const source = normalizeSource(row.source);
  const timezone = normalizeString(row.timezone);

  if (!openingHourId || !restaurantId || !source || !timezone) {
    return null;
  }

  return {
    opening_hour_id: openingHourId,
    restaurant_id: restaurantId,
    source,
    timezone,
    is_active: Boolean(row.is_active),
    is_24x7: Boolean(row.is_24x7),
    notes: normalizeNullableString(row.notes),
    synced_at: normalizeNullableString(row.synced_at),
    created_by_user_id: normalizeNullableString(row.created_by_user_id),
    is_deleted: Boolean(row.is_deleted),
    created_at: normalizeNullableString(row.created_at),
    updated_at: normalizeNullableString(row.updated_at),
  };
}

function normalizeOpeningHourSlot(row: OpeningHourSlotRow) {
  const openingHourSlotId = normalizeString(row.opening_hour_slot_id);
  const openingHourId = normalizeString(row.opening_hour_id);
  const dayOfWeek = normalizeDayOfWeek(row.day_of_week);
  const slotOrder = normalizePositiveInt(row.slot_order);

  if (!openingHourSlotId || !openingHourId || !dayOfWeek || !slotOrder) {
    return null;
  }

  return {
    opening_hour_slot_id: openingHourSlotId,
    opening_hour_id: openingHourId,
    day_of_week: dayOfWeek,
    slot_order: slotOrder,
    is_closed: Boolean(row.is_closed),
    open_time: normalizeNullableTimeValue(row.open_time),
    close_time: normalizeNullableTimeValue(row.close_time),
    is_deleted: Boolean(row.is_deleted),
    created_at: normalizeNullableString(row.created_at),
    updated_at: normalizeNullableString(row.updated_at),
  };
}

function normalizeSource(value: unknown) {
  const source = normalizeString(value)?.toLowerCase();
  if (source === 'google' || source === 'manual') {
    return source;
  }
  return null;
}

function normalizePlaceId(value: string) {
  const direct = extractPlaceIdCandidate(value);
  if (direct) {
    return direct;
  }

  try {
    const parsedUrl = new URL(value);
    const queryCandidates = [
      parsedUrl.searchParams.get('q'),
      parsedUrl.searchParams.get('query'),
      parsedUrl.searchParams.get('place_id'),
      parsedUrl.searchParams.get('placeid'),
    ]
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => Boolean(entry));

    for (const candidate of queryCandidates) {
      const extracted = extractPlaceIdCandidate(candidate);
      if (extracted) {
        return extracted;
      }
    }
  } catch {
    // Non-URL value, direct extraction already attempted.
  }

  return '';
}

function extractPlaceIdCandidate(value: string) {
  const direct = normalizeString(value);
  if (!direct) {
    return null;
  }

  const decoded = safeDecodeURIComponent(direct);
  const candidate = decoded.replace(/^\/+/, '').trim();
  if (!candidate) {
    return null;
  }

  const placeIdQueryMatch = candidate.match(/place_id:([^&#?/\s]+)/i);
  if (placeIdQueryMatch?.[1]) {
    return placeIdQueryMatch[1].trim();
  }

  const placeResourceMatch = candidate.match(/(?:^|\/)places\/([^/?#\s]+)/i);
  if (placeResourceMatch?.[1]) {
    return placeResourceMatch[1].trim();
  }

  const normalized = candidate
    .replace(/^place_id:/i, '')
    .replace(/^places\//i, '')
    .trim();

  if (!normalized || !/^[A-Za-z0-9._-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function minutesToTime(minutes: number, isCloseTime: boolean) {
  const bounded = Math.max(0, Math.min(1440, minutes));
  if (isCloseTime && bounded >= 1440) {
    return '23:59:59';
  }

  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function timeToMinutes(timeValue: string) {
  const match = timeValue.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) {
    return NaN;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeTimeValue(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}:00`;
}

function normalizeNullableTimeValue(value: unknown) {
  if (value == null) {
    return null;
  }
  return normalizeTimeValue(value);
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeDayOfWeek(value: unknown) {
  const normalized = normalizePositiveInt(value);
  if (!normalized || normalized < 1 || normalized > 7) {
    return null;
  }
  return normalized;
}

function normalizeGoogleDay(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }
  return null;
}

function normalizeHour(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23) {
    return value;
  }
  return null;
}

function normalizeMinute(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 59) {
    return value;
  }
  return null;
}

function mapGoogleDayToDb(googleDay: number) {
  if (googleDay < 0 || googleDay > 6) {
    return null;
  }
  return googleDay === 0 ? 7 : googleDay;
}

function nextDayOfWeek(dayOfWeek: number) {
  return dayOfWeek === 7 ? 1 : dayOfWeek + 1;
}
