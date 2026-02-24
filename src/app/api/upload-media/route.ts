/**
 * Media Upload API Route
 * 
 * Handles file uploads to Nhost storage and saves metadata to medias table
 * Supports images and videos with proper validation and error handling
 */

import { NextRequest, NextResponse } from 'next/server';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";
const NHOST_STORAGE_URL = process.env.NHOST_STORAGE_URL || 'https://pycfacumenjefxtblime.storage.us-east-1.nhost.run/v1';
const NHOST_PUBLIC_URL = process.env.NHOST_PUBLIC_URL || 'https://pycfacumenjefxtblime.storage.us-east-1.nhost.run/v1/files';

/**
 * GraphQL mutation to insert media record
 * Note: Includes required type field for medias table
 */
const INSERT_MEDIA = `
  mutation InsertMedia($restaurant_id: uuid!, $file_id: uuid!, $type: String!) {
    insert_medias_one(
      object: {
        restaurant_id: $restaurant_id,
        file_id: $file_id,
        type: $type,
        is_deleted: false
      }
    ) {
      id
      restaurant_id
      file_id
      type
      created_at
      updated_at
      is_deleted
    }
  }
`;

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest(query: string, variables?: any) {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

/**
 * Validate file type and size
 */
function validateFile(file: File): string | null {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    return 'Only image and video files are allowed';
  }

  // Size limits: 10MB for images, 100MB for videos
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  
  if (file.size > maxSize) {
    return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
  }

  // Check specific image formats
  if (isImage) {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      return 'Only JPG, PNG, WebP, and GIF images are allowed';
    }
  }

  // Check specific video formats
  if (isVideo) {
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedVideoTypes.includes(file.type)) {
      return 'Only MP4, WebM, MOV, and AVI videos are allowed';
    }
  }

  return null;
}

/**
 * POST endpoint to upload media files
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurant_id') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Upload file to Nhost storage using direct HTTP request with public access
    const uploadFormData = new FormData();
    uploadFormData.append('file[]', file);
    
    const uploadResponse = await fetch(`${NHOST_STORAGE_URL}/files?public=true`, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Nhost upload error:', uploadResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: `Failed to upload file to storage: ${uploadResponse.statusText}` },
        { status: 500 }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log('Nhost upload result:', uploadResult);
    
    // Handle Nhost response format: {processedFiles: [...]}
    let fileMetadata;
    if (uploadResult.processedFiles && Array.isArray(uploadResult.processedFiles) && uploadResult.processedFiles.length > 0) {
      fileMetadata = uploadResult.processedFiles[0];
    } else if (Array.isArray(uploadResult) && uploadResult.length > 0) {
      fileMetadata = uploadResult[0];
    } else if (uploadResult.id) {
      fileMetadata = uploadResult;
    } else {
      console.error('Unexpected Nhost response format:', uploadResult);
      return NextResponse.json(
        { success: false, error: 'Invalid upload response from storage' },
        { status: 500 }
      );
    }

    if (!fileMetadata || !fileMetadata.id) {
      console.error('No file ID in response:', fileMetadata);
      return NextResponse.json(
        { success: false, error: 'No file ID in upload response' },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded file using our proxy
    // This avoids CORS and authentication issues
    const publicUrl = `/api/image-proxy?fileId=${fileMetadata.id}`;

    // Save media metadata to database
    const mediaData = await graphqlRequest(INSERT_MEDIA, {
      restaurant_id: restaurantId,
      file_id: fileMetadata.id,
      type: fileMetadata.mimeType || file.type,
    });

    if (!mediaData.insert_medias_one) {
      // If database insert fails, try to delete the uploaded file
      try {
        await fetch(`${NHOST_STORAGE_URL}/files/${fileMetadata.id}`, {
          method: 'DELETE',
          headers: {
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
          },
        });
      } catch (deleteError) {
        console.error('Failed to cleanup uploaded file:', deleteError);
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to save media metadata' },
        { status: 500 }
      );
    }

    const media = mediaData.insert_medias_one;

    return NextResponse.json({
      success: true,
      data: {
        id: media.id,
        file_id: media.file_id,
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      },
    });

  } catch (error) {
    console.error('Media upload error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve media files for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const type = searchParams.get('type'); // 'image' or 'video' to filter

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Build GraphQL query
    let whereClause = `restaurant_id: {_eq: "${restaurantId}"}, is_deleted: {_eq: false}`;
    
    if (type === 'image') {
      whereClause += `, type: {_like: "image/%"}`;
    } else if (type === 'video') {
      whereClause += `, type: {_like: "video/%"}`;
    }

    const GET_MEDIAS = `
      query GetMedias {
        medias(
          where: {${whereClause}},
          order_by: {created_at: desc}
        ) {
          id
          file_id
          name
          type
          size
          url
          created_at
          updated_at
        }
      }
    `;

    const data = await graphqlRequest(GET_MEDIAS);

    return NextResponse.json({
      success: true,
      data: data.medias || [],
    });

  } catch (error) {
    console.error('Media fetch error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch media',
      },
      { status: 500 }
    );
  }
}