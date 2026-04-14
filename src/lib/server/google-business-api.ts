import 'server-only';

type JsonRecord = Record<string, unknown>;

type GoogleBusinessApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
  message?: string;
};

export interface GoogleBusinessAccountOption {
  name: string;
  accountName: string;
  type: string | null;
}

export interface GoogleBusinessLocationOption {
  name: string;
  title: string | null;
  accountName: string;
  accountDisplayName: string | null;
  placeId: string | null;
  languageCode: string | null;
  storeCode: string | null;
}

export interface GoogleBusinessActionLink {
  name: string;
  placeActionType: string | null;
  uri: string | null;
  isPreferred: boolean;
}

export interface GoogleBusinessLocationProfile {
  name: string;
  title: string | null;
  storeCode: string | null;
  languageCode: string | null;
  websiteUri: string | null;
  primaryPhone: string | null;
  additionalPhones: string[];
  description: string | null;
  addressLines: string[];
  locality: string | null;
  administrativeArea: string | null;
  postalCode: string | null;
  regionCode: string | null;
  openState: string | null;
  placeId: string | null;
  primaryCategory: string | null;
  additionalCategories: string[];
  regularHours: string[];
  actionLinks: {
    menuUrl: string | null;
    takeoutUrl: string | null;
    deliveryUrl: string | null;
    otherLinks: Array<{
      type: string | null;
      url: string | null;
    }>;
  };
  attributes: Array<{
    attributeId: string | null;
    displayName: string | null;
    value: string | null;
  }>;
}

export interface GoogleBusinessReview {
  name: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  reviewerProfilePhotoUrl: string | null;
  reviewerGoogleMapsUri: string | null;
  createTime: string | null;
  updateTime: string | null;
  reviewReply: {
    comment: string | null;
    updateTime: string | null;
  } | null;
}

const GOOGLE_ACCOUNT_FIELDS = ['name', 'accountName', 'type'].join(',');
const GOOGLE_LOCATION_LIST_MASK = [
  'name',
  'title',
  'storeCode',
  'languageCode',
  'metadata',
].join(',');
const GOOGLE_LOCATION_PROFILE_MASK = [
  'name',
  'title',
  'storeCode',
  'languageCode',
  'phoneNumbers',
  'websiteUri',
  'storefrontAddress',
  'openInfo',
  'profile',
  'categories',
  'metadata',
  'regularHours',
].join(',');

export async function listGoogleBusinessAccounts(
  accessToken: string,
): Promise<GoogleBusinessAccountOption[]> {
  const payload = await googleBusinessRequest<{
    accounts?: unknown[];
  }>({
    accessToken,
    url: `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20`,
  });

  return Array.isArray(payload.accounts)
    ? payload.accounts
        .map((entry) => normalizeGoogleBusinessAccount(entry))
        .filter(
          (entry): entry is GoogleBusinessAccountOption => Boolean(entry),
        )
    : [];
}

export async function listGoogleBusinessLocationsForAccount(
  accessToken: string,
  account: GoogleBusinessAccountOption,
): Promise<GoogleBusinessLocationOption[]> {
  const params = new URLSearchParams({
    readMask: GOOGLE_LOCATION_LIST_MASK,
    pageSize: '100',
  });

  const payload = await googleBusinessRequest<{
    locations?: unknown[];
  }>({
    accessToken,
    url: `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${params.toString()}`,
  });

  return Array.isArray(payload.locations)
    ? payload.locations
        .map((entry) => normalizeGoogleBusinessLocation(entry, account))
        .filter(
          (entry): entry is GoogleBusinessLocationOption => Boolean(entry),
        )
    : [];
}

export async function getGoogleBusinessLocationProfile(
  accessToken: string,
  locationName: string,
) {
  const params = new URLSearchParams({
    readMask: GOOGLE_LOCATION_PROFILE_MASK,
  });

  const [locationPayload, actionLinksPayload, attributesPayload] = await Promise.all([
    googleBusinessRequest<JsonRecord>({
      accessToken,
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?${params.toString()}`,
    }),
    googleBusinessRequest<{ placeActionLinks?: unknown[] }>({
      accessToken,
      url: `https://mybusinessplaceactions.googleapis.com/v1/${locationName}/placeActionLinks`,
      allowNotFound: true,
    }),
    googleBusinessRequest<JsonRecord>({
      accessToken,
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}/attributes`,
      allowNotFound: true,
    }),
  ]);

  return normalizeGoogleBusinessLocationProfile(
    locationPayload,
    Array.isArray(actionLinksPayload.placeActionLinks)
      ? actionLinksPayload.placeActionLinks
      : [],
    attributesPayload,
  );
}

export async function patchGoogleBusinessLocationProfile(input: {
  accessToken: string;
  locationName: string;
  title?: string | null;
  primaryPhone?: string | null;
  websiteUri?: string | null;
  description?: string | null;
  address?: {
    addressLines?: string[];
    locality?: string | null;
    administrativeArea?: string | null;
    postalCode?: string | null;
    regionCode?: string | null;
  } | null;
}) {
  const updateMask = new Set<string>();
  const location: JsonRecord = {
    name: input.locationName,
  };

  if (typeof input.title === 'string') {
    location.title = input.title.trim();
    updateMask.add('title');
  }

  if (typeof input.websiteUri === 'string') {
    location.websiteUri = input.websiteUri.trim();
    updateMask.add('websiteUri');
  }

  if (typeof input.primaryPhone === 'string') {
    location.phoneNumbers = {
      primaryPhone: input.primaryPhone.trim(),
    };
    updateMask.add('phoneNumbers.primaryPhone');
  }

  if (typeof input.description === 'string') {
    location.profile = {
      description: input.description.trim(),
    };
    updateMask.add('profile.description');
  }

  if (input.address) {
    const storefrontAddress = {
      addressLines: input.address.addressLines ?? [],
      locality: input.address.locality ?? '',
      administrativeArea: input.address.administrativeArea ?? '',
      postalCode: input.address.postalCode ?? '',
      regionCode: input.address.regionCode ?? '',
    };

    location.storefrontAddress = storefrontAddress;
    updateMask.add('storefrontAddress.addressLines');
    updateMask.add('storefrontAddress.locality');
    updateMask.add('storefrontAddress.administrativeArea');
    updateMask.add('storefrontAddress.postalCode');
    updateMask.add('storefrontAddress.regionCode');
  }

  if (!updateMask.size) {
    throw new Error('No Google Business profile fields were provided to update.');
  }

  const params = new URLSearchParams({
    updateMask: Array.from(updateMask).join(','),
  });

  await googleBusinessRequest({
    accessToken: input.accessToken,
    url: `https://mybusinessbusinessinformation.googleapis.com/v1/${input.locationName}?${params.toString()}`,
    method: 'PATCH',
    body: location,
  });
}

export async function upsertGoogleBusinessActionLinks(input: {
  accessToken: string;
  locationName: string;
  menuUrl?: string | null;
  takeoutUrl?: string | null;
  deliveryUrl?: string | null;
}) {
  const existingPayload = await googleBusinessRequest<{
    placeActionLinks?: unknown[];
  }>({
    accessToken: input.accessToken,
    url: `https://mybusinessplaceactions.googleapis.com/v1/${input.locationName}/placeActionLinks`,
    allowNotFound: true,
  });

  const existingLinks = Array.isArray(existingPayload.placeActionLinks)
    ? existingPayload.placeActionLinks
        .map((entry) => normalizeGoogleBusinessActionLink(entry))
        .filter((entry): entry is GoogleBusinessActionLink => Boolean(entry))
    : [];

  const linkTargets = [
    {
      type: 'FOOD_ORDERING',
      url: normalizeNullableUrl(input.menuUrl),
    },
    {
      type: 'FOOD_TAKEOUT',
      url: normalizeNullableUrl(input.takeoutUrl),
    },
    {
      type: 'FOOD_DELIVERY',
      url: normalizeNullableUrl(input.deliveryUrl),
    },
  ];

  for (const target of linkTargets) {
    const existing = existingLinks.find(
      (entry) => entry.placeActionType === target.type,
    );

    if (!target.url) {
      if (existing?.name) {
        await googleBusinessRequest({
          accessToken: input.accessToken,
          url: `https://mybusinessplaceactions.googleapis.com/v1/${existing.name}`,
          method: 'DELETE',
        });
      }
      continue;
    }

    if (existing?.name) {
      const params = new URLSearchParams({
        updateMask: 'uri,isPreferred',
      });

      await googleBusinessRequest({
        accessToken: input.accessToken,
        url: `https://mybusinessplaceactions.googleapis.com/v1/${existing.name}?${params.toString()}`,
        method: 'PATCH',
        body: {
          name: existing.name,
          uri: target.url,
          isPreferred: true,
          placeActionType: target.type,
        },
      });
      continue;
    }

    await googleBusinessRequest({
      accessToken: input.accessToken,
      url: `https://mybusinessplaceactions.googleapis.com/v1/${input.locationName}/placeActionLinks`,
      method: 'POST',
      body: {
        uri: target.url,
        placeActionType: target.type,
        isPreferred: true,
      },
    });
  }
}

export async function listGoogleBusinessReviews(input: {
  accessToken: string;
  accountName: string;
  locationName: string;
}) {
  const locationId = extractResourceId(input.locationName);
  if (!locationId) {
    throw new Error('Google Business location id is invalid.');
  }

  const payload = await googleBusinessRequest<{
    reviews?: unknown[];
  }>({
    accessToken: input.accessToken,
    url: `https://mybusiness.googleapis.com/v4/${input.accountName}/locations/${locationId}/reviews`,
  });

  return Array.isArray(payload.reviews)
    ? payload.reviews.map(normalizeGoogleBusinessReview).filter(Boolean)
    : [];
}

export async function upsertGoogleBusinessReviewReply(input: {
  accessToken: string;
  reviewName: string;
  comment: string;
}) {
  await googleBusinessRequest({
    accessToken: input.accessToken,
    url: `https://mybusiness.googleapis.com/v4/${input.reviewName}/reply`,
    method: 'PUT',
    body: {
      comment: input.comment.trim(),
    },
  });
}

async function googleBusinessRequest<T = JsonRecord>(input: {
  accessToken: string;
  url: string;
  method?: string;
  body?: unknown;
  allowNotFound?: boolean;
}) {
  const response = await fetch(input.url, {
    method: input.method || 'GET',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      ...(input.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    cache: 'no-store',
  });

  const payload =
    (await safeParseJson(response)) as (T & GoogleBusinessApiErrorPayload) | null;

  if (input.allowNotFound && response.status === 404) {
    return ({} as T);
  }

  if (!response.ok) {
    throw new Error(
      extractGoogleBusinessApiErrorMessage(payload) ||
        `Google Business API request failed with HTTP ${response.status}.`,
    );
  }

  return (payload ?? {}) as T;
}

function normalizeGoogleBusinessAccount(
  value: unknown,
): GoogleBusinessAccountOption | null {
  const record = readRecord(value);
  const name = normalizeString(record?.name);
  if (!name) {
    return null;
  }

  return {
    name,
    accountName:
      normalizeString(record?.accountName) ||
      normalizeString(record?.account_name) ||
      name,
    type: normalizeString(record?.type),
  } satisfies GoogleBusinessAccountOption;
}

function normalizeGoogleBusinessLocation(
  value: unknown,
  account: GoogleBusinessAccountOption,
): GoogleBusinessLocationOption | null {
  const record = readRecord(value);
  const name = normalizeString(record?.name);
  if (!name) {
    return null;
  }

  const metadata = readRecord(record?.metadata);
  const locationKey = readRecord(metadata?.locationKey);

  return {
    name,
    title: normalizeNullableString(record?.title),
    accountName: account.name,
    accountDisplayName: account.accountName || null,
    placeId:
      normalizeNullableString(metadata?.placeId) ||
      normalizeNullableString(locationKey?.placeId),
    languageCode: normalizeNullableString(record?.languageCode),
    storeCode: normalizeNullableString(record?.storeCode),
  } satisfies GoogleBusinessLocationOption;
}

function normalizeGoogleBusinessLocationProfile(
  location: JsonRecord,
  rawActionLinks: unknown[],
  rawAttributes: JsonRecord,
) {
  const phoneNumbers = readRecord(location.phoneNumbers);
  const storefrontAddress = readRecord(location.storefrontAddress);
  const categories = readRecord(location.categories);
  const profile = readRecord(location.profile);
  const metadata = readRecord(location.metadata);
  const locationKey = readRecord(metadata?.locationKey);
  const openInfo = readRecord(location.openInfo);
  const regularHours = readRecord(location.regularHours);
  const hoursDescriptions = Array.isArray(regularHours?.weekdayDescriptions)
    ? regularHours.weekdayDescriptions
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];

  const actionLinks = rawActionLinks
    .map((entry) => normalizeGoogleBusinessActionLink(entry))
    .filter((entry): entry is GoogleBusinessActionLink => Boolean(entry));

  const attributesRecord = readRecord(rawAttributes.attributes)
    ? readRecord(rawAttributes.attributes)
    : rawAttributes;
  const attributeItems = Array.isArray(attributesRecord?.attributes)
    ? attributesRecord.attributes
    : Array.isArray(rawAttributes.attributes)
      ? rawAttributes.attributes
      : [];

  return {
    name: normalizeString(location.name) || '',
    title: normalizeNullableString(location.title),
    storeCode: normalizeNullableString(location.storeCode),
    languageCode: normalizeNullableString(location.languageCode),
    websiteUri: normalizeNullableString(location.websiteUri),
    primaryPhone: normalizeNullableString(phoneNumbers?.primaryPhone),
    additionalPhones: Array.isArray(phoneNumbers?.additionalPhones)
      ? phoneNumbers.additionalPhones
          .map((entry) => normalizeString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
    description: normalizeNullableString(profile?.description),
    addressLines: Array.isArray(storefrontAddress?.addressLines)
      ? storefrontAddress.addressLines
          .map((entry) => normalizeString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
    locality: normalizeNullableString(storefrontAddress?.locality),
    administrativeArea: normalizeNullableString(
      storefrontAddress?.administrativeArea,
    ),
    postalCode: normalizeNullableString(storefrontAddress?.postalCode),
    regionCode: normalizeNullableString(storefrontAddress?.regionCode),
    openState: normalizeNullableString(openInfo?.status),
    placeId:
      normalizeNullableString(metadata?.placeId) ||
      normalizeNullableString(locationKey?.placeId),
    primaryCategory: normalizeNullableString(
      readRecord(categories?.primaryCategory)?.displayName,
    ),
    additionalCategories: Array.isArray(categories?.additionalCategories)
      ? categories.additionalCategories
          .map((entry) =>
            normalizeNullableString(readRecord(entry)?.displayName),
          )
          .filter((entry): entry is string => Boolean(entry))
      : [],
    regularHours: hoursDescriptions,
    actionLinks: {
      menuUrl:
        actionLinks.find((entry) => entry.placeActionType === 'FOOD_ORDERING')
          ?.uri || null,
      takeoutUrl:
        actionLinks.find((entry) => entry.placeActionType === 'FOOD_TAKEOUT')
          ?.uri || null,
      deliveryUrl:
        actionLinks.find((entry) => entry.placeActionType === 'FOOD_DELIVERY')
          ?.uri || null,
      otherLinks: actionLinks
        .filter(
          (entry) =>
            !['FOOD_ORDERING', 'FOOD_TAKEOUT', 'FOOD_DELIVERY'].includes(
              entry.placeActionType || '',
            ),
        )
        .map((entry) => ({
          type: entry.placeActionType,
          url: entry.uri,
        })),
    },
    attributes: attributeItems
      .map((entry) => normalizeGoogleBusinessAttribute(entry))
      .filter((entry): entry is { attributeId: string | null; displayName: string | null; value: string | null } => Boolean(entry)),
  } satisfies GoogleBusinessLocationProfile;
}

function normalizeGoogleBusinessActionLink(value: unknown) {
  const record = readRecord(value);
  const name = normalizeString(record?.name);
  if (!name) {
    return null;
  }

  return {
    name,
    placeActionType: normalizeNullableString(record?.placeActionType),
    uri: normalizeNullableString(record?.uri),
    isPreferred: Boolean(record?.isPreferred),
  } satisfies GoogleBusinessActionLink;
}

function normalizeGoogleBusinessReview(value: unknown) {
  const record = readRecord(value);
  const name = normalizeString(record?.name);
  if (!name) {
    return null;
  }

  const reviewer = readRecord(record?.reviewer);
  const reviewReply = readRecord(record?.reviewReply);
  const rating = typeof record?.starRating === 'string'
    ? normalizeStarRating(record.starRating)
    : typeof record?.rating === 'number'
      ? Math.max(1, Math.min(5, Math.round(record.rating)))
      : 5;

  return {
    name,
    rating,
    comment:
      normalizeNullableString(record?.comment) ||
      normalizeNullableString(readRecord(record?.comment)?.text),
    reviewerName: normalizeNullableString(reviewer?.displayName),
    reviewerProfilePhotoUrl: normalizeNullableString(reviewer?.profilePhotoUrl),
    reviewerGoogleMapsUri: normalizeNullableString(reviewer?.googleMapsUri),
    createTime: normalizeNullableString(record?.createTime),
    updateTime: normalizeNullableString(record?.updateTime),
    reviewReply: reviewReply
      ? {
          comment: normalizeNullableString(reviewReply.comment),
          updateTime: normalizeNullableString(reviewReply.updateTime),
        }
      : null,
  } satisfies GoogleBusinessReview;
}

function normalizeGoogleBusinessAttribute(value: unknown) {
  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const displayName =
    normalizeNullableString(record.displayName) ||
    normalizeNullableString(record.attributeDisplayName) ||
    normalizeNullableString(record.name);
  const attributeId =
    normalizeNullableString(record.attributeId) ||
    normalizeNullableString(record.name);

  const repeatedValues = Array.isArray(record.repeatedEnumValue)
    ? record.repeatedEnumValue
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];
  const uriValues = Array.isArray(record.uriValues)
    ? record.uriValues
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];

  const valueLabel =
    normalizeNullableString(record.value) ||
    normalizeNullableString(record.valueDisplayName) ||
    normalizeNullableString(record.stringValue) ||
    normalizeNullableString(record.uriValue) ||
    (typeof record.boolValue === 'boolean'
      ? record.boolValue
        ? 'Yes'
        : 'No'
      : null) ||
    (repeatedValues.length ? repeatedValues.join(', ') : null) ||
    (uriValues.length ? uriValues.join(', ') : null);

  if (!displayName && !attributeId) {
    return null;
  }

  return {
    attributeId,
    displayName,
    value: valueLabel,
  };
}

function normalizeStarRating(value: string) {
  switch (value.trim().toUpperCase()) {
    case 'ONE':
    case 'ONE_STAR':
      return 1;
    case 'TWO':
    case 'TWO_STAR':
      return 2;
    case 'THREE':
    case 'THREE_STAR':
      return 3;
    case 'FOUR':
    case 'FOUR_STAR':
      return 4;
    case 'FIVE':
    case 'FIVE_STAR':
      return 5;
    default:
      return 5;
  }
}

function extractGoogleBusinessApiErrorMessage(
  payload: GoogleBusinessApiErrorPayload | null,
) {
  const direct = normalizeNullableString(payload?.message);
  if (direct) {
    return direct;
  }

  return (
    normalizeNullableString(payload?.error?.message) ||
    normalizeNullableString(payload?.error?.status)
  );
}

function extractResourceId(resourceName: string) {
  return resourceName.split('/').filter(Boolean).at(-1)?.trim() || null;
}

function normalizeNullableUrl(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as JsonRecord)
    : null;
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
