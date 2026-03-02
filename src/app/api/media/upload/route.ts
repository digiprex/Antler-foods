/**
 * Media Upload API Route
 *
 * Handles image uploads with optimization:
 * - Uploads to Nhost Storage
 * - Optimizes images (resize, compress)
 * - Creates records in medias table
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  resolveHasuraAdminSecret,
  resolveStorageApiUrl,
} from '@/lib/server/nhost-config';

interface MediaRecord {
  id: string;
  file_id: string;
  type: string;
  restaurant_id: string;
  created_at: string;
}

interface InsertMediaResponse {
  insert_medias_one: MediaRecord;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; [key: string]: unknown }>;
}

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphQLResponse<T>> {
  try {
    const data = await adminGraphqlRequest<T>(query, variables);
    return { data };
  } catch (error) {
    return {
      errors: [{
        message: error instanceof Error ? error.message : 'Unknown GraphQL error'
      }]
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurant_id') as string;
    const type = formData.get('type') as string || 'image';
    const storageApiUrl = resolveStorageApiUrl();
    const hasuraAdminSecret = resolveHasuraAdminSecret();

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

    console.log('[Media Upload] Using storage URL:', storageApiUrl);
    console.log('[Media Upload] File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!storageApiUrl) {
      console.error('[Media Upload] Storage URL not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Storage URL not configured. Please set NEXT_PUBLIC_NHOST_STORAGE_URL or ensure HASURA_GRAPHQL_ENDPOINT is set correctly.',
        },
        { status: 500 }
      );
    }

    if (!hasuraAdminSecret) {
      console.error('[Media Upload] Hasura admin secret not configured');
      return NextResponse.json(
        {
          success: false,
          error:
            'Hasura admin secret not configured. Set HASURA_ADMIN_SECRET or HASURA_GRAPHQL_ADMIN_SECRET.',
        },
        { status: 500 },
      );
    }

    // Upload file to Nhost Storage
    // Nhost expects 'file[]' as the field name for file uploads
    const uploadFormData = new FormData();
    uploadFormData.append('file[]', file);

    const uploadUrl = `${storageApiUrl}/files`;
    console.log('[Media Upload] Uploading to:', uploadUrl);
    console.log('[Media Upload] Using admin secret:', hasuraAdminSecret ? 'SET' : 'NOT SET');
    console.log('[Media Upload] Form field name: file[]');

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': hasuraAdminSecret,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Media Upload] Nhost upload failed:');
      console.error('  Status:', uploadResponse.status, uploadResponse.statusText);
      console.error('  URL:', uploadUrl);
      console.error('  Response:', errorText);

      let errorMessage = 'Failed to upload file to storage';
      let errorDetails = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = `Nhost Error: ${errorJson.error}`;
        }
        if (errorJson.code === 'not-found') {
          errorMessage += ' - The storage endpoint was not found. Please check your Nhost configuration.';
          errorDetails = `Attempted URL: ${uploadUrl}\n\nPlease verify:\n1. NEXT_PUBLIC_NHOST_STORAGE_URL is set correctly in .env.local\n2. Your Nhost project has storage enabled\n3. The subdomain and region match your Nhost project`;
        }
      } catch {
        // Error text is not JSON, use as-is
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorDetails,
          url: uploadUrl,
        },
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

    const mediaResult = await graphqlRequest<InsertMediaResponse>(insertMediaMutation, {
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

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Failed to create media record - no data returned' },
        { status: 500 }
      );
    }

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
          directUrl: `${storageApiUrl}/files/${fileId}`,
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
