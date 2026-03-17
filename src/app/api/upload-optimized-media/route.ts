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
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  resolveHasuraAdminSecret,
  resolveStorageApiUrl,
} from '@/lib/server/nhost-config';

type MediaKind = 'image' | 'video' | 'audio' | 'unsupported';

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'bmp',
]);

const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'webm',
  'm4v',
  'mkv',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'flac',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/mp4',
  mkv: 'video/x-matroska',
};

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

interface InsertMediaResponse {
  insert_medias_one?: {
    id?: string | null;
    file_id?: string | null;
    type?: string | null;
  } | null;
}

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
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
  const info = detectFileInfo(file);

  if (info.kind === 'audio') {
    return 'Audio files are not supported. Upload video files (MP4, MOV, WEBM, M4V, MKV).';
  }

  if (info.kind === 'unsupported') {
    return 'Unsupported file format. Use images (JPG, JPEG, PNG, WEBP, GIF, AVIF, BMP) or videos (MP4, MOV, WEBM, M4V, MKV).';
  }

  if (
    info.kind === 'image' &&
    info.extension &&
    !SUPPORTED_IMAGE_EXTENSIONS.has(info.extension)
  ) {
    return 'Unsupported image format. Supported: JPG, JPEG, PNG, WEBP, GIF, AVIF, BMP.';
  }

  if (
    info.kind === 'video' &&
    info.extension &&
    !SUPPORTED_VIDEO_EXTENSIONS.has(info.extension)
  ) {
    return 'Unsupported video format. Supported: MP4, MOV, WEBM, M4V, MKV.';
  }

  // Size limits: 50MB for images, 500MB for videos (before optimization)
  const maxSize = info.kind === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
  
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
    const storageApiUrl = resolveStorageApiUrl();
    const hasuraAdminSecret = resolveHasuraAdminSecret();

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

    if (!storageApiUrl || !hasuraAdminSecret) {
      return NextResponse.json(
        { success: false, error: 'Storage service is not configured on server.' },
        { status: 500 },
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

    const fileInfo = detectFileInfo(file);

    // Optimize file based on type
    let optimizedFile: { buffer: Buffer; filename: string; mimeType: string };
    let optimizationWarning: string | null = null;
    
    if (fileInfo.kind === 'image') {
      optimizedFile = await optimizeImage(file);
    } else if (fileInfo.kind === 'video') {
      try {
        optimizedFile = await optimizeVideo(file);
      } catch (caughtError) {
        console.error('[Upload Optimized Media] Video optimization failed:', caughtError);
        return NextResponse.json(
          {
            success: false,
            error:
              'Video optimization failed on server. Upload was not completed. Please try again or use MP4/H.264 input.',
          },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unsupported file type. Use images (JPG, JPEG, PNG, WEBP, GIF, AVIF, BMP) or videos (MP4, MOV, WEBM, M4V, MKV).',
        },
        { status: 400 },
      );
    }

    // Create FormData for optimized file
    const optimizedFormData = new FormData();
    const optimizedBlob = new Blob([new Uint8Array(optimizedFile.buffer)], { type: optimizedFile.mimeType });
    optimizedFormData.append('file[]', optimizedBlob, optimizedFile.filename);
    
    // Upload optimized file to Nhost storage
    const uploadResponse = await fetch(`${storageApiUrl}/files?public=true`, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': hasuraAdminSecret,
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
    const mediaData = await graphqlRequest<InsertMediaResponse>(INSERT_MEDIA, {
      restaurant_id: restaurantId,
      file_id: fileMetadata.id,
      type: optimizedFile.mimeType,
    });

    if (!mediaData.insert_medias_one) {
      // If database insert fails, try to delete the uploaded file
      try {
        await fetch(`${storageApiUrl}/files/${fileMetadata.id}`, {
          method: 'DELETE',
          headers: {
            'x-hasura-admin-secret': hasuraAdminSecret,
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
    const wasOptimized = !optimizationWarning;

    // Return proxy URL for reliable access
    const publicUrl = `/api/image-proxy?fileId=${fileMetadata.id}`;
    const directUrl = `${storageApiUrl}/files/${fileMetadata.id}`;

    return NextResponse.json({
      success: true,
      data: {
        id: media.id,
        file_id: media.file_id,
        url: publicUrl,
        file: {
          id: fileMetadata.id,
          name: optimizedFile.filename,
          mimeType: optimizedFile.mimeType,
          url: publicUrl,
          directUrl,
          size: optimizedFile.buffer.length,
        },
        name: optimizedFile.filename,
        type: optimizedFile.mimeType,
        size: optimizedFile.buffer.length,
        optimized: wasOptimized,
        originalSize: file.size,
        compressionRatio: ((file.size - optimizedFile.buffer.length) / file.size * 100).toFixed(1)
      },
      warning: optimizationWarning || undefined,
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

function detectFileInfo(file: File): {
  kind: MediaKind;
  extension: string | null;
  mimeType: string | null;
} {
  const rawType = file.type?.trim().toLowerCase() || '';
  const extension = getFileExtension(file.name);

  if (rawType.startsWith('audio/')) {
    return { kind: 'audio', extension, mimeType: rawType || null };
  }

  if (rawType.startsWith('image/')) {
    return { kind: 'image', extension, mimeType: rawType };
  }

  if (rawType.startsWith('video/')) {
    return { kind: 'video', extension, mimeType: rawType };
  }

  if (extension && SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return {
      kind: 'image',
      extension,
      mimeType: EXTENSION_TO_MIME[extension] || 'image/jpeg',
    };
  }

  if (extension && SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
    return {
      kind: 'video',
      extension,
      mimeType: EXTENSION_TO_MIME[extension] || 'video/mp4',
    };
  }

  if (extension && AUDIO_EXTENSIONS.has(extension)) {
    return {
      kind: 'audio',
      extension,
      mimeType: rawType || null,
    };
  }

  return {
    kind: 'unsupported',
    extension,
    mimeType: rawType || null,
  };
}

function getFileExtension(fileName: string) {
  const cleanName = fileName.trim().toLowerCase();
  if (!cleanName.includes('.')) {
    return null;
  }

  const extension = cleanName.split('.').pop()?.trim() || '';
  return extension || null;
}

