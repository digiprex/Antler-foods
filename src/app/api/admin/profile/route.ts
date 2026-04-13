import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_USER_PROFILE = `
  query GetUserProfile($user_id: uuid!) {
    user(id: $user_id) {
      id
      displayName
      phoneNumber
    }
  }
`;

const UPDATE_USER_PROFILE = `
  mutation UpdateUserProfile($user_id: uuid!, $displayName: String!, $phoneNumber: String) {
    updateUser(pk_columns: { id: $user_id }, _set: { displayName: $displayName, phoneNumber: $phoneNumber }) {
      id
      displayName
      phoneNumber
    }
  }
`;

interface UserProfileResponse {
  user?: {
    id?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  } | null;
}

interface UpdateUserResponse {
  updateUser?: {
    id?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  } | null;
}

function extractUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return null;

  try {
    const payloadBase64 = accessToken.split('.')[1];
    if (payloadBase64) {
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const claims = payload['https://hasura.io/jwt/claims'] as Record<string, unknown> | undefined;
      return (claims?.['x-hasura-user-id'] as string) || null;
    }
  } catch {
    // JWT decode failed
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 },
      );
    }

    const data = await adminGraphqlRequest<UserProfileResponse>(
      GET_USER_PROFILE,
      { user_id: userId },
    );

    if (!data.user?.id) {
      return NextResponse.json(
        { success: false, error: 'User not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.user.id,
        displayName: data.user.displayName || '',
        phoneNumber: data.user.phoneNumber || '',
      },
    });
  } catch (error) {
    console.error('[Profile] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile.' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      displayName?: string;
      phoneNumber?: string;
    } | null;

    const displayName = body?.displayName?.trim();
    if (!displayName) {
      return NextResponse.json(
        { success: false, error: 'Display name is required.' },
        { status: 400 },
      );
    }

    const phoneNumber = body?.phoneNumber?.trim() || null;

    const data = await adminGraphqlRequest<UpdateUserResponse>(
      UPDATE_USER_PROFILE,
      { user_id: userId, displayName, phoneNumber },
    );

    if (!data.updateUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.updateUser.id,
        displayName: data.updateUser.displayName,
        phoneNumber: data.updateUser.phoneNumber || '',
      },
    });
  } catch (error) {
    console.error('[Profile] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile.' },
      { status: 500 },
    );
  }
}
