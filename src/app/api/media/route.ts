/**
 * Media API Route
 *
 * Fetches media files from the medias table
 * Supports filtering by restaurant_id and type
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { resolveStorageApiUrl } from '@/lib/server/nhost-config';

interface MediaFile {
  id: string;
  file_id: string;
  type: string;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

interface MediasResponse {
  medias: MediaFile[];
}

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  bucketId: string;
  size: number;
}

interface FilesResponse {
  files: FileInfo[];
}

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: T; errors?: any[] }> {
  try {
    const data = await adminGraphqlRequest<T>(query, variables);
    return { data };
  } catch (error: any) {
    return {
      errors: error.errors || [{ message: error.message || 'GraphQL request failed' }]
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const type = searchParams.get('type');

    console.log('[Media API] Request params:', { restaurantId, type });

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    // Fetch media files from medias table
    const query = type ? `
      query GetMediaFiles($restaurantId: uuid!, $isDeleted: Boolean!, $type: String!) {
        medias(
          where: {
            restaurant_id: { _eq: $restaurantId }
            is_deleted: { _eq: $isDeleted }
            type: { _eq: $type }
          }
          order_by: { created_at: desc }
        ) {
          id
          file_id
          type
          restaurant_id
          created_at
          updated_at
        }
      }
    ` : `
      query GetMediaFiles($restaurantId: uuid!, $isDeleted: Boolean!) {
        medias(
          where: {
            restaurant_id: { _eq: $restaurantId }
            is_deleted: { _eq: $isDeleted }
          }
          order_by: { created_at: desc }
        ) {
          id
          file_id
          type
          restaurant_id
          created_at
          updated_at
        }
      }
    `;

    const variables: any = {
      restaurantId,
      isDeleted: false
    };

    if (type) {
      variables.type = type;
    }

    const result = await graphqlRequest<MediasResponse>(query, variables);

    if (result.errors) {
      console.error('[Media API] GraphQL errors:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch media files', details: result.errors },
        { status: 500 }
      );
    }

    // For each media file, we need to get the file URL from the files table
    const mediaFiles = result.data?.medias || [];
    console.log('[Media API] Found media files:', mediaFiles.length);

    // Fetch file details for all media files
    if (mediaFiles.length > 0) {
      const fileIds = mediaFiles.map((m: any) => m.file_id);

      const filesQuery = `
        query GetFiles($fileIds: [uuid!]!) {
          files(where: { id: { _in: $fileIds } }) {
            id
            name
            mimeType
            bucketId
            size
          }
        }
      `;

      const filesResult = await graphqlRequest<FilesResponse>(filesQuery, { fileIds });

      if (filesResult.errors) {
        console.error('[Media API] GraphQL errors fetching files:', filesResult.errors);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch file details', details: filesResult.errors },
          { status: 500 }
        );
      }

      const files = filesResult.data?.files || [];
      console.log('[Media API] Found files:', files.length);
      const fileMap = new Map<string, any>(files.map((f: any) => [f.id, f]));

      // Combine media and file data
      const storageApiUrl = resolveStorageApiUrl();

      console.log('[Media API] Storage URL:', storageApiUrl || 'NOT SET');

      const enrichedMedia = mediaFiles.map((media: any) => {
        const file: any = fileMap.get(media.file_id);
        
        // Use image proxy for better compatibility and CORS handling
        let fileUrl = '';
        let directUrl = '';
        let urlWithAuth = '';
        
        if (file) {
          // Primary URL - use image proxy
          fileUrl = `/api/image-proxy?fileId=${file.id}`;
          
          // Fallback URLs
          if (storageApiUrl) {
            directUrl = `${storageApiUrl}/files/${file.id}`;
            urlWithAuth = directUrl;
          }
          
          console.log('[Media API] Generated URLs for file:', {
            id: file.id,
            name: file.name,
            proxyUrl: fileUrl,
            directUrl: directUrl,
            mimeType: file.mimeType
          });
        } else {
          fileUrl = '/api/image-proxy?fileId=unknown';
        }

        return {
          ...media,
          file: file ? {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            url: fileUrl, // Use proxy as primary URL
            directUrl: directUrl,
            urlWithAuth: urlWithAuth,
            size: file.size,
          } : null,
        };
      });

      console.log('[Media API] Returning enriched media:', enrichedMedia.length);

      return NextResponse.json({
        success: true,
        data: enrichedMedia,
      });
    }

    console.log('[Media API] No media files found, returning empty array');
    return NextResponse.json({
      success: true,
      data: [],
    });

  } catch (error) {
    console.error('Media API error:', error);
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
