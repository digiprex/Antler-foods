/**
 * Legacy Media Upload API Route
 *
 * This endpoint is kept for backward compatibility.
 * It now delegates to the optimized upload pipeline so all uploads
 * are optimized before being sent to Nhost.
 */

import { NextRequest } from 'next/server';
import { POST as uploadOptimizedMedia } from '@/app/api/upload-optimized-media/route';

export async function POST(request: NextRequest) {
  return uploadOptimizedMedia(request);
}

