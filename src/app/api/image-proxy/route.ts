export const dynamic = 'force-dynamic';

/**
 * Media Proxy API Route
 *
 * Serves Nhost storage files (images and videos) through our API to avoid CORS and authentication issues
 * Supports Range requests for video streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveHasuraAdminSecret,
  resolveStorageApiUrl,
} from '@/lib/server/nhost-config';

/**
 * GET endpoint to proxy files from Nhost storage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const storageApiUrl = resolveStorageApiUrl();
    const hasuraAdminSecret = resolveHasuraAdminSecret();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    if (!storageApiUrl || !hasuraAdminSecret) {
      return NextResponse.json(
        { error: 'Storage service is not configured on server' },
        { status: 500 },
      );
    }

    // Get Range header if present (for video streaming)
    const rangeHeader = request.headers.get('range');

    const fetchHeaders: HeadersInit = {
      'x-hasura-admin-secret': hasuraAdminSecret,
    };

    // Pass through Range header for video streaming
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // Fetch the file from Nhost storage with admin authentication
    const response = await fetch(`${storageApiUrl}/files/${fileId}`, {
      headers: fetchHeaders,
    });

    if (!response.ok) {
      console.error('Failed to fetch file from Nhost:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get the file data
    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    // Build response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    };

    // Add content length if available
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    // Add range-related headers for video streaming
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    } else if (contentType.startsWith('video/')) {
      // Enable range requests for videos
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    // Return 206 Partial Content for range requests, 200 otherwise
    const status = rangeHeader && contentRange ? 206 : 200;

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Media proxy error:', error);

    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
