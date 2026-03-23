import type { User } from '@nhost/nhost-js';

export interface MenuCustomerProfile {
  name: string;
  email: string;
  phone: string | null;
  initials: string;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getInitials(name: string, email: string) {
  const nameParts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (nameParts.length) {
    return nameParts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function getMenuCustomerProfile(user: User | null | undefined): MenuCustomerProfile | null {
  if (!user) {
    return null;
  }

  const metadata = readRecord(user.metadata);
  const firstName = readString(metadata?.firstName) || readString(metadata?.givenName);
  const lastName = readString(metadata?.lastName) || readString(metadata?.familyName);
  const email = readString(user.email) || '';
  const displayName = readString(user.displayName);
  const phone =
    readString(metadata?.phoneNumber) ||
    readString(metadata?.phone) ||
    readString((readRecord(user) ?? {}).phoneNumber);
  const derivedName = `${firstName || ''} ${lastName || ''}`.trim();
  const name =
    derivedName ||
    displayName ||
    email.split('@')[0] ||
    'Customer';

  return {
    name,
    email,
    phone,
    initials: getInitials(name, email || 'CU'),
  };
}