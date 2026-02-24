/**
 * Image Proxy API Route
 * 
 * Serves Nhost storage images through our API to avoid CORS and authentication issues
 */

import { NextRequest, NextResponse } from 'next/server';

const NHOST_STORAGE_URL = process.env.NHOST_STORAGE_URL || 'https://pycfacumenjefxtblime.storage.us-east-1.nhost.run/v1';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

/**
 * GET endpoint to proxy images from Nhost storage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Fetch the file from Nhost storage with admin authentication
    const response = await fetch(`${NHOST_STORAGE_URL}/files/${fileId}`, {
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
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

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}