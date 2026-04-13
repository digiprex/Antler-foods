import type { NextRequest } from 'next/server';
import { RouteError } from '@/lib/server/api-auth';

export function normalizeDashboardReturnPath(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/dashboard/')) {
    return null;
  }

  return trimmed;
}

export function resolveRequestOrigin(request: NextRequest) {
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL,
  );
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'localhost:3005';
  const protocol =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https');

  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host;
  }

  return `${protocol}://${host}`;
}

export function normalizeOrigin(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

export function handleGoogleBusinessRouteError(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof RouteError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  const message =
    error instanceof Error ? mapSchemaErrorMessage(error.message) : fallbackMessage;

  return {
    status: 500,
    message: message || fallbackMessage,
  };
}

function mapSchemaErrorMessage(message: string) {
  if (
    message.includes('restaurant_google_business_connections') ||
    message.includes('google_business_connections')
  ) {
    return 'Google Business schema is not available yet. Apply the Google Business SQL script in Hasura first.';
  }

  return message;
}
