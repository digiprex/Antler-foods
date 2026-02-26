import { NextResponse } from 'next/server';
import {
  RouteError,
  adminGraphqlRequest,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';

type GoogleMediaRow = {
  id?: string | null;
  restaurant_id?: string | null;
  file_id?: string | null;
  source?: string | null;
  external_id?: string | null;
  type?: string | null;
  created_at?: string | null;
  is_hidden?: boolean | null;
};

interface ExistingGoogleMediaResponse {
  medias?: GoogleMediaRow[];
}

interface InsertGoogleMediaResponse {
  insert_medias_one?: GoogleMediaRow | null;
}

interface UpdateGoogleMediaResponse {
  update_medias_by_pk?: GoogleMediaRow | null;
}

type StorageUploadResponse = {
  id?: unknown;
  processedFiles?: Array<{
    id?: unknown;
  }>;
  error?: unknown;
  message?: unknown;
};

const GOOGLE_IMPORT_MAX_WIDTH = 1600;
const FALLBACK_GOOGLE_CONTENT_TYPE = 'image/jpeg';

const FIND_EXISTING_GOOGLE_MEDIA_V2 = `
  query FindExistingGoogleMedia($restaurant_id: uuid!, $external_id: String!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        source: { _eq: "google" }
        external_id: { _eq: $external_id }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const FIND_EXISTING_GOOGLE_MEDIA_V1 = `
  query FindExistingGoogleMediaWithoutHidden($restaurant_id: uuid!, $external_id: String!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        source: { _eq: "google" }
        external_id: { _eq: $external_id }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
    }
  }
`;

const FIND_DELETED_GOOGLE_MEDIA_V2 = `
  query FindDeletedGoogleMedia($restaurant_id: uuid!, $external_id: String!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        source: { _eq: "google" }
        external_id: { _eq: $external_id }
        is_deleted: { _eq: true }
      }
      limit: 1
    ) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const FIND_DELETED_GOOGLE_MEDIA_V1 = `
  query FindDeletedGoogleMediaWithoutHidden($restaurant_id: uuid!, $external_id: String!) {
    medias(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        source: { _eq: "google" }
        external_id: { _eq: $external_id }
        is_deleted: { _eq: true }
      }
      limit: 1
    ) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
    }
  }
`;

const INSERT_GOOGLE_MEDIA_V2 = `
  mutation InsertGoogleMedia($object: medias_insert_input!) {
    insert_medias_one(object: $object) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const INSERT_GOOGLE_MEDIA_V1 = `
  mutation InsertGoogleMediaWithoutHidden($object: medias_insert_input!) {
    insert_medias_one(object: $object) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
    }
  }
`;

const UPDATE_GOOGLE_MEDIA_V2 = `
  mutation UpdateGoogleMedia($media_id: uuid!, $changes: medias_set_input!) {
    update_medias_by_pk(pk_columns: { id: $media_id }, _set: $changes) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
      is_hidden
    }
  }
`;

const UPDATE_GOOGLE_MEDIA_V1 = `
  mutation UpdateGoogleMediaWithoutHidden($media_id: uuid!, $changes: medias_set_input!) {
    update_medias_by_pk(pk_columns: { id: $media_id }, _set: $changes) {
      id
      restaurant_id
      file_id
      source
      external_id
      type
      created_at
    }
  }
`;

export async function POST(
  request: Request,
  context: { params: { restaurantId: string } },
) {
  let uploadedFileIdForCleanup: string | null = null;
  let uploadedFileTypeForCleanup: string | null = null;

  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    const { restaurant } = await requireRestaurantAccess(request, restaurantId);
    if (!restaurant.googlePlaceId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant does not have a Google Place ID.' },
        { status: 400 },
      );
    }

    const payload = (await safeParseJson(request)) as
      | {
          photoId?: unknown;
          mediaId?: unknown;
        }
      | null;
    const mediaId = normalizePhotoId(payload?.mediaId ?? payload?.photoId);

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'mediaId is required.' },
        { status: 400 },
      );
    }

    const normalizedPlaceId = normalizePlaceId(restaurant.googlePlaceId);
    if (!normalizedPlaceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stored Google Place ID is invalid. Update Google profile settings.',
        },
        { status: 400 },
      );
    }
    const expectedPhotoPrefix = `places/${normalizedPlaceId}/photos/`;
    const expectedVideoPrefix = `places/${normalizedPlaceId}/videos/`;
    if (!mediaId.startsWith(expectedPhotoPrefix) && !mediaId.startsWith(expectedVideoPrefix)) {
      return NextResponse.json(
        {
          success: false,
          error: 'mediaId does not belong to the selected restaurant place.',
        },
        { status: 400 },
      );
    }

    const ensureImportedFile = async () => {
      if (uploadedFileIdForCleanup) {
        return {
          fileId: uploadedFileIdForCleanup,
          mediaType: uploadedFileTypeForCleanup || 'image/jpeg',
        };
      }

      const uploaded = await importGooglePhotoToStorage(mediaId);
      uploadedFileIdForCleanup = uploaded.fileId;
      uploadedFileTypeForCleanup = uploaded.mediaType;
      return uploaded;
    };

    const existing = await findGoogleMediaRow({
      restaurantId,
      photoId: mediaId,
      deleted: false,
      includeHiddenState: true,
    });

    if (existing?.id) {
      if (existing.is_hidden) {
        const updated = await updateGoogleMediaRow(existing.id, {
          is_hidden: false,
        });

        if (!updated?.id) {
          throw new Error('Failed to unhide existing Google media.');
        }

        return NextResponse.json({
          success: true,
          data: normalizeMedia(updated, normalizedPlaceId),
        });
      }

      return NextResponse.json({
        success: true,
        data: normalizeMedia(existing, normalizedPlaceId),
      });
    }

    const deleted = await findGoogleMediaRow({
      restaurantId,
      photoId: mediaId,
      deleted: true,
      includeHiddenState: true,
    });

    if (deleted?.id) {
      const deletedRowFileId =
        normalizeString(deleted.file_id) || (await ensureImportedFile()).fileId;
      const deletedRowType =
        normalizeString(deleted.type) || (await ensureImportedFile()).mediaType;

      const restored = await updateGoogleMediaRow(deleted.id, {
        is_deleted: false,
        is_hidden: false,
        source: 'manual',
        external_id: null,
        file_id: deletedRowFileId,
        type: deletedRowType,
      });

      if (!restored?.id) {
        throw new Error('Failed to restore existing Google media.');
      }

      uploadedFileIdForCleanup = null;
      uploadedFileTypeForCleanup = null;

      return NextResponse.json({
        success: true,
        data: normalizeMedia(restored, normalizedPlaceId),
      });
    }

    const uploaded = await ensureImportedFile();

    const inserted = await insertGoogleMediaRow({
      restaurant_id: restaurantId,
      source: 'manual',
      external_id: null,
      file_id: uploaded.fileId,
      type: uploaded.mediaType,
      is_hidden: false,
      is_deleted: false,
    });

    if (!inserted?.id) {
      throw new Error('Failed to import Google media.');
    }

    uploadedFileIdForCleanup = null;
    uploadedFileTypeForCleanup = null;

    return NextResponse.json({
      success: true,
      data: normalizeMedia(inserted, normalizedPlaceId),
    });
  } catch (caughtError) {
    if (uploadedFileIdForCleanup) {
      await deleteStorageFile(uploadedFileIdForCleanup);
    }

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
            : 'Failed to import Google media.',
      },
      { status: 500 },
    );
  }
}

async function findGoogleMediaRow({
  restaurantId,
  photoId,
  deleted,
  includeHiddenState,
}: {
  restaurantId: string;
  photoId: string;
  deleted: boolean;
  includeHiddenState: boolean;
}) {
  const primaryQuery = deleted
    ? includeHiddenState
      ? FIND_DELETED_GOOGLE_MEDIA_V2
      : FIND_DELETED_GOOGLE_MEDIA_V1
    : includeHiddenState
      ? FIND_EXISTING_GOOGLE_MEDIA_V2
      : FIND_EXISTING_GOOGLE_MEDIA_V1;

  const fallbackQuery = deleted
    ? FIND_DELETED_GOOGLE_MEDIA_V1
    : FIND_EXISTING_GOOGLE_MEDIA_V1;

  try {
    const data = await adminGraphqlRequest<ExistingGoogleMediaResponse>(primaryQuery, {
      restaurant_id: restaurantId,
      external_id: photoId,
    });

    return Array.isArray(data.medias) ? data.medias[0] || null : null;
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    if (!isSchemaColumnError(message) || primaryQuery === fallbackQuery) {
      throw caughtError;
    }

    const fallbackData = await adminGraphqlRequest<ExistingGoogleMediaResponse>(
      fallbackQuery,
      {
        restaurant_id: restaurantId,
        external_id: photoId,
      },
    );
    return Array.isArray(fallbackData.medias) ? fallbackData.medias[0] || null : null;
  }
}

async function updateGoogleMediaRow(
  mediaId: string,
  changes: Record<string, unknown>,
) {
  const mutableChanges = { ...changes };
  const maxAttempts = Math.max(12, Object.keys(mutableChanges).length * 4);
  let attempts = 0;
  let useFallbackMutation = false;

  while (attempts < maxAttempts) {
    attempts += 1;
    const mutation = useFallbackMutation ? UPDATE_GOOGLE_MEDIA_V1 : UPDATE_GOOGLE_MEDIA_V2;

    try {
      const data = await adminGraphqlRequest<UpdateGoogleMediaResponse>(mutation, {
        media_id: mediaId,
        changes: mutableChanges,
      });
      return data.update_medias_by_pk || null;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
      const removedSetFields = removeFieldsFromObject(
        mutableChanges,
        extractMissingFieldsByType(message, 'medias_set_input'),
      );
      if (removedSetFields.length) {
        continue;
      }

      if (!useFallbackMutation && isSchemaColumnError(message)) {
        useFallbackMutation = true;
        continue;
      }

      throw caughtError;
    }
  }

  return null;
}

async function insertGoogleMediaRow(object: Record<string, unknown>) {
  const mutableObject = { ...object };
  const maxAttempts = Math.max(12, Object.keys(mutableObject).length * 4);
  let attempts = 0;
  let useFallbackMutation = false;

  while (attempts < maxAttempts) {
    attempts += 1;
    const mutation = useFallbackMutation ? INSERT_GOOGLE_MEDIA_V1 : INSERT_GOOGLE_MEDIA_V2;

    try {
      const data = await adminGraphqlRequest<InsertGoogleMediaResponse>(mutation, {
        object: mutableObject,
      });
      return data.insert_medias_one || null;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
      const removedInsertFields = removeFieldsFromObject(
        mutableObject,
        extractMissingFieldsByType(message, 'medias_insert_input'),
      );
      if (removedInsertFields.length) {
        continue;
      }

      if (!useFallbackMutation && isSchemaColumnError(message)) {
        useFallbackMutation = true;
        continue;
      }

      throw caughtError;
    }
  }

  return null;
}

function removeFieldsFromObject(object: Record<string, unknown>, fields: string[]) {
  const removableFields = fields.filter((field) =>
    Object.prototype.hasOwnProperty.call(object, field),
  );

  removableFields.forEach((field) => {
    delete object[field];
  });

  return removableFields;
}

function normalizeMedia(row: GoogleMediaRow, placeId: string) {
  const id = normalizeString(row.id) || '';
  const restaurantId = normalizeString(row.restaurant_id) || '';
  const source = normalizeSource(row.source);
  const externalId = normalizeString(row.external_id);
  const fileId = normalizeString(row.file_id);

  return {
    id,
    restaurant_id: restaurantId,
    source,
    external_id: externalId,
    file_id: fileId,
    type: normalizeString(row.type) || 'gallery',
    created_at: normalizeString(row.created_at),
    is_hidden: Boolean(row.is_hidden),
    url:
      source === 'google' && externalId
        ? buildGooglePhotoProxyUrl(placeId, externalId, 1200)
        : fileId
          ? `/api/image-proxy?fileId=${encodeURIComponent(fileId)}`
          : null,
  };
}

function normalizeSource(value: unknown) {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized === 'google' ? 'google' : 'manual';
}

function buildGooglePhotoProxyUrl(placeId: string, photoId: string, maxWidth: number) {
  const params = new URLSearchParams();
  params.set('placeId', placeId);
  params.set('mediaId', photoId);
  params.set('maxWidth', String(maxWidth));
  return `/api/google/photo?${params.toString()}`;
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
    // Not a URL, direct parsing above already attempted.
  }

  return '';
}

function normalizePhotoId(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^\/+/, '');
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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

function extractMissingFieldsByType(message: string, typeName: string) {
  const typePattern = escapeRegExp(typeName);
  const regex = new RegExp(`field '([^']+)' not found in type: '${typePattern}'`, 'g');
  const matches = Array.from(message.matchAll(regex));

  return Array.from(
    new Set(
      matches
        .map((match) => match[1]?.trim())
        .filter((field): field is string => Boolean(field)),
    ),
  );
}

function isSchemaColumnError(message: string) {
  return /(?:field|column)\s+['"](is_hidden|updated_at|source|external_id|file_id)['"]/i.test(
    message,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function importGooglePhotoToStorage(mediaId: string) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured on server.');
  }

  const googlePhotoEndpoint = new URL(`https://places.googleapis.com/v1/${mediaId}/media`);
  googlePhotoEndpoint.searchParams.set('maxWidthPx', String(GOOGLE_IMPORT_MAX_WIDTH));
  googlePhotoEndpoint.searchParams.set('key', apiKey);

  const googlePhotoResponse = await fetch(googlePhotoEndpoint.toString(), {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!googlePhotoResponse.ok) {
    throw new Error(
      `Google media download failed with HTTP ${googlePhotoResponse.status}.`,
    );
  }

  const photoBytes = await googlePhotoResponse.arrayBuffer();
  if (!photoBytes.byteLength) {
    throw new Error('Google media download returned an empty file.');
  }

  const contentType =
    normalizeString(googlePhotoResponse.headers.get('content-type')) ||
    FALLBACK_GOOGLE_CONTENT_TYPE;

  const storageApiUrl = resolveStorageApiUrl();
  if (!storageApiUrl) {
    throw new Error('Nhost storage URL is not configured on server.');
  }

  const hasuraAdminSecret =
    normalizeString(process.env.HASURA_ADMIN_SECRET) ||
    normalizeString(process.env.HASURA_GRAPHQL_ADMIN_SECRET);
  if (!hasuraAdminSecret) {
    throw new Error('HASURA_ADMIN_SECRET is not configured on server.');
  }

  const uploadBody = new FormData();
  const uploadBlob = new Blob([new Uint8Array(photoBytes)], { type: contentType });
  uploadBody.append(
    'file[]',
    uploadBlob,
    buildGoogleImportFileName(mediaId, contentType),
  );

  const uploadResponse = await fetch(`${storageApiUrl}/files`, {
    method: 'POST',
    headers: {
      'x-hasura-admin-secret': hasuraAdminSecret,
    },
    body: uploadBody,
    cache: 'no-store',
  });

  const uploadPayload = (await safeParseJson(uploadResponse)) as StorageUploadResponse | null;
  if (!uploadResponse.ok) {
    const storageError = extractStorageUploadError(uploadPayload);
    throw new Error(
      storageError || `Storage upload failed with HTTP ${uploadResponse.status}.`,
    );
  }

  const fileId = extractStorageFileId(uploadPayload);
  if (!fileId) {
    throw new Error('Storage upload succeeded but returned no file id.');
  }

  return {
    fileId,
    mediaType: resolveMediaTypeFromContentType(contentType),
  };
}

async function deleteStorageFile(fileId: string) {
  const storageApiUrl = resolveStorageApiUrl();
  const hasuraAdminSecret =
    normalizeString(process.env.HASURA_ADMIN_SECRET) ||
    normalizeString(process.env.HASURA_GRAPHQL_ADMIN_SECRET);

  if (!storageApiUrl || !hasuraAdminSecret) {
    return;
  }

  try {
    await fetch(`${storageApiUrl}/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        'x-hasura-admin-secret': hasuraAdminSecret,
      },
      cache: 'no-store',
    });
  } catch {
    // best-effort cleanup only
  }
}

function resolveStorageApiUrl() {
  const directStorageUrl =
    normalizeString(process.env.NHOST_STORAGE_URL) ||
    normalizeString(process.env.NEXT_PUBLIC_NHOST_STORAGE_URL);
  if (directStorageUrl) {
    return ensureStorageVersionPath(directStorageUrl);
  }

  const hasuraUrl =
    normalizeString(process.env.HASURA_API_URL) ||
    normalizeString(process.env.HASURA_GRAPHQL_URL);
  if (hasuraUrl) {
    try {
      const parsed = new URL(hasuraUrl);
      const storageHostname = parsed.hostname.replace('.hasura.', '.storage.');
      if (storageHostname !== parsed.hostname) {
        return `${parsed.protocol}//${storageHostname}/v1`;
      }
    } catch {
      return null;
    }
  }

  const subdomain = normalizeString(process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN);
  const region = normalizeString(process.env.NEXT_PUBLIC_NHOST_REGION);
  if (subdomain && region) {
    return `https://${subdomain}.storage.${region}.nhost.run/v1`;
  }

  return null;
}

function ensureStorageVersionPath(value: string) {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function getGoogleApiKey() {
  return (
    normalizeString(process.env.GOOGLE_MAPS_API_KEY) ||
    normalizeString(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  );
}

function buildGoogleImportFileName(mediaId: string, contentType: string) {
  const tail = mediaId.split('/').pop() || '';
  const normalizedTail = tail.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'photo';
  const extension = detectExtensionFromContentType(contentType);
  return `google-${normalizedTail}.${extension}`;
}

function detectExtensionFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes('video/mp4')) {
    return 'mp4';
  }
  if (normalized.includes('video/webm')) {
    return 'webm';
  }
  if (normalized.includes('video/quicktime')) {
    return 'mov';
  }
  if (normalized.includes('image/png')) {
    return 'png';
  }
  if (normalized.includes('image/webp')) {
    return 'webp';
  }
  if (normalized.includes('image/avif')) {
    return 'avif';
  }
  if (normalized.includes('image/gif')) {
    return 'gif';
  }

  return 'jpg';
}

function resolveMediaTypeFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.startsWith('video/')) {
    return normalized;
  }

  return normalized.startsWith('image/') ? normalized : 'image/jpeg';
}

function extractStorageFileId(payload: StorageUploadResponse | null) {
  const directId = normalizeString(payload?.id);
  if (directId) {
    return directId;
  }

  const processedFiles = Array.isArray(payload?.processedFiles)
    ? payload?.processedFiles
    : [];

  for (const entry of processedFiles) {
    const id = normalizeString(entry?.id);
    if (id) {
      return id;
    }
  }

  return null;
}

function extractStorageUploadError(payload: StorageUploadResponse | null) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return normalizeString(payload.message) || normalizeString(payload.error);
}
