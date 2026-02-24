/**
 * Optimized Media Upload API Route
 * 
 * Handles file uploads with optimization:
 * - Images: Compressed using Sharp (WebP format, multiple sizes)
 * - Videos: Compressed using FFmpeg (optimized for web)
 * - Saves optimized files to Nhost storage and metadata to medias table
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";
const NHOST_STORAGE_URL = process.env.NHOST_STORAGE_URL || 'https://pycfacumenjefxtblime.storage.us-east-1.nhost.run/v1';

/**
 * GraphQL mutation to insert media record
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
 * Optimize image using Sharp
 */
async function optimizeImage(file: File): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const originalName = file.name.split('.')[0];
  
  // Create optimized WebP version
  const optimizedBuffer = await sharp(buffer)
    .resize(1920, 1080, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .webp({ 
      quality: 85,
      effort: 6 
    })
    .toBuffer();

  return {
    buffer: optimizedBuffer,
    filename: `${originalName}_optimized.webp`,
    mimeType: 'image/webp'
  };
}

/**
 * Optimize video using FFmpeg
 */
async function optimizeVideo(file: File): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input_${Date.now()}_${file.name}`);
  const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);
  
  try {
    // Write input file to temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, buffer);

    // Optimize video with FFmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-crf 28',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-vf scale=1280:720:force_original_aspect_ratio=decrease'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Read optimized file
    const optimizedBuffer = await fs.readFile(outputPath);
    const originalName = file.name.split('.')[0];

    // Cleanup temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return {
      buffer: optimizedBuffer,
      filename: `${originalName}_optimized.mp4`,
      mimeType: 'video/mp4'
    };
  } catch (error) {
    // Cleanup on error
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
    throw error;
  }
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

  // Size limits: 50MB for images, 500MB for videos (before optimization)
  const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
  
  if (file.size > maxSize) {
    return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
  }

  return null;
}

/**
 * POST endpoint to upload and optimize media files
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

    // Optimize file based on type
    let optimizedFile: { buffer: Buffer; filename: string; mimeType: string };
    
    if (file.type.startsWith('image/')) {
      optimizedFile = await optimizeImage(file);
    } else if (file.type.startsWith('video/')) {
      optimizedFile = await optimizeVideo(file);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Create FormData for optimized file
    const optimizedFormData = new FormData();
    const optimizedBlob = new Blob([new Uint8Array(optimizedFile.buffer)], { type: optimizedFile.mimeType });
    optimizedFormData.append('file[]', optimizedBlob, optimizedFile.filename);
    
    // Upload optimized file to Nhost storage
    const uploadResponse = await fetch(`${NHOST_STORAGE_URL}/files?public=true`, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: optimizedFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Nhost upload error:', uploadResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: `Failed to upload optimized file: ${uploadResponse.statusText}` },
        { status: 500 }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log('Nhost upload result:', uploadResult);
    
    // Handle Nhost response format: {processedFiles: [...]}
    let fileMetadata;
    if (uploadResult.processedFiles && Array.isArray(uploadResult.processedFiles) && uploadResult.processedFiles.length > 0) {
      fileMetadata = uploadResult.processedFiles[0];
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

    // Save media metadata to database
    const mediaData = await graphqlRequest(INSERT_MEDIA, {
      restaurant_id: restaurantId,
      file_id: fileMetadata.id,
      type: optimizedFile.mimeType,
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

    // Return proxy URL for reliable access
    const publicUrl = `/api/image-proxy?fileId=${fileMetadata.id}`;

    return NextResponse.json({
      success: true,
      data: {
        id: media.id,
        file_id: media.file_id,
        url: publicUrl,
        name: optimizedFile.filename,
        type: optimizedFile.mimeType,
        size: optimizedFile.buffer.length,
        optimized: true,
        originalSize: file.size,
        compressionRatio: ((file.size - optimizedFile.buffer.length) / file.size * 100).toFixed(1)
      },
    });

  } catch (error) {
    console.error('Optimized media upload error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}