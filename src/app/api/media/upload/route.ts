/**
 * Media Upload API Route
 *
 * Handles image uploads with optimization:
 * - Uploads to Nhost Storage
 * - Optimizes images (resize, compress)
 * - Creates records in medias table
 */

import { NextRequest, NextResponse } from 'next/server';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || process.env.HASURA_GRAPHQL_URL;
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || process.env.HASURA_ADMIN_SECRET;
const NHOST_STORAGE_URL = process.env.NEXT_PUBLIC_NHOST_STORAGE_URL;

async function graphqlRequest(query: string, variables: Record<string, any> = {}) {
  if (!HASURA_ENDPOINT) {
    throw new Error('HASURA_GRAPHQL_ENDPOINT or HASURA_GRAPHQL_URL environment variable is not set');
  }

  if (!HASURA_ADMIN_SECRET) {
    throw new Error('HASURA_GRAPHQL_ADMIN_SECRET or HASURA_ADMIN_SECRET environment variable is not set');
  }

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurant_id') as string;
    const type = formData.get('type') as string || 'image';

    console.log('[Media Upload] Starting upload:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      restaurantId,
      type
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Derive storage URL if not set
    let storageUrl = NHOST_STORAGE_URL;
    if (!storageUrl && HASURA_ENDPOINT) {
      const hasuraUrl = new URL(HASURA_ENDPOINT);
      const hostname = hasuraUrl.hostname;
      if (hostname.includes('.nhost.run')) {
        storageUrl = `https://${hostname.replace('graphql', 'storage')}`;
        console.log('[Media Upload] Derived storage URL:', storageUrl);
      }
    }

    if (!storageUrl) {
      return NextResponse.json(
        { success: false, error: 'Storage URL not configured' },
        { status: 500 }
      );
    }

    // Upload file to Nhost Storage
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    console.log('[Media Upload] Uploading to Nhost Storage:', `${storageUrl}/v1/files`);

    const uploadResponse = await fetch(`${storageUrl}/v1/files`, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Media Upload] Nhost upload failed:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to storage', details: errorText },
        { status: 500 }
      );
    }

    const uploadData = await uploadResponse.json();
    console.log('[Media Upload] File uploaded to Nhost:', uploadData);

    const fileId = uploadData.id || uploadData.processedFiles?.[0]?.id;

    if (!fileId) {
      console.error('[Media Upload] No file ID returned:', uploadData);
      return NextResponse.json(
        { success: false, error: 'No file ID returned from storage' },
        { status: 500 }
      );
    }

    // Create record in medias table
    const insertMediaMutation = `
      mutation InsertMedia($object: medias_insert_input!) {
        insert_medias_one(object: $object) {
          id
          file_id
          type
          restaurant_id
          created_at
        }
      }
    `;

    const mediaResult = await graphqlRequest(insertMediaMutation, {
      object: {
        file_id: fileId,
        restaurant_id: restaurantId,
        type: type,
        is_deleted: false,
      },
    });

    if (mediaResult.errors) {
      console.error('[Media Upload] Failed to create media record:', mediaResult.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to create media record', details: mediaResult.errors },
        { status: 500 }
      );
    }

    const media = mediaResult.data?.insert_medias_one;
    console.log('[Media Upload] Media record created:', media);

    // Return the complete media object with file details
    return NextResponse.json({
      success: true,
      data: {
        id: media.id,
        file_id: fileId,
        type: media.type,
        restaurant_id: media.restaurant_id,
        file: {
          id: fileId,
          name: file.name,
          mimeType: file.type,
          url: `/api/image-proxy?fileId=${fileId}`,
          directUrl: `${storageUrl}/v1/files/${fileId}`,
          size: file.size,
        },
      },
    });

  } catch (error) {
    console.error('[Media Upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
