import 'server-only';

import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createMenuCustomerProfile, type MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const MENU_CUSTOMER_SESSION_COOKIE = 'menu_customer_session';
const MENU_CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GET_CUSTOMER_BY_EMAIL = `
  query GetCustomerByEmail($restaurant_id: uuid!, $email: String!) {
    customers(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        email: { _eq: $email }
        is_deleted: { _eq: false }
      }
      order_by: [{ created_at: asc }]
      limit: 5
    ) {
      customer_id
      restaurant_id
      email
      phone
      display_name
      password_hash
      is_guest
      is_deleted
    }
  }
`;

const GET_CUSTOMER_BY_ID = `
  query GetCustomerById($customer_id: uuid!) {
    customers_by_pk(customer_id: $customer_id) {
      customer_id
      restaurant_id
      email
      phone
      display_name
      password_hash
      is_guest
      is_deleted
    }
  }
`;

const INSERT_CUSTOMER = `
  mutation InsertCustomer(
    $restaurant_id: uuid!
    $email: String!
    $phone: String
    $display_name: String!
    $password_hash: String
    $is_guest: Boolean!
  ) {
    insert_customers_one(
      object: {
        restaurant_id: $restaurant_id
        email: $email
        phone: $phone
        display_name: $display_name
        password_hash: $password_hash
        is_guest: $is_guest
        is_deleted: false
      }
    ) {
      customer_id
      restaurant_id
      email
      phone
      display_name
      password_hash
      is_guest
      is_deleted
    }
  }
`;

const UPDATE_CUSTOMER = `
  mutation UpdateCustomer(
    $customer_id: uuid!
    $email: String!
    $phone: String
    $display_name: String!
    $password_hash: String
    $is_guest: Boolean!
  ) {
    update_customers_by_pk(
      pk_columns: { customer_id: $customer_id }
      _set: {
        email: $email
        phone: $phone
        display_name: $display_name
        password_hash: $password_hash
        is_guest: $is_guest
      }
    ) {
      customer_id
      restaurant_id
      email
      phone
      display_name
      password_hash
      is_guest
      is_deleted
    }
  }
`;

interface CustomerRecord {
  customer_id?: string | null;
  restaurant_id?: string | null;
  email?: string | null;
  phone?: string | null;
  display_name?: string | null;
  password_hash?: string | null;
  is_guest?: boolean | null;
  is_deleted?: boolean | null;
}

interface GetCustomerByEmailResponse {
  customers?: CustomerRecord[];
}

interface GetCustomerByIdResponse {
  customers_by_pk?: CustomerRecord | null;
}

interface InsertCustomerResponse {
  insert_customers_one?: CustomerRecord | null;
}

interface UpdateCustomerResponse {
  update_customers_by_pk?: CustomerRecord | null;
}

interface MenuCustomerSessionPayload {
  v: 1;
  sub: string;
  rid: string;
  email: string;
  name: string;
  phone: string | null;
  isGuest: boolean;
  exp: number;
}

interface CustomerIdentityInput {
  restaurantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface MenuCustomerSession extends MenuCustomerProfile {
  customerId: string;
  restaurantId: string;
  isGuest: boolean;
}

export class MenuCustomerAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function signUpMenuCustomer(input: CustomerIdentityInput & { password: string }) {
  const restaurantId = requireRestaurantId(input.restaurantId);
  const email = requireEmail(input.email);
  const password = requirePassword(input.password);
  const phone = requirePhone(input.phone);
  const displayName = requireDisplayName(input.firstName, input.lastName, email);
  const existing = await findCustomerByEmail(restaurantId, email);

  if (existing && existing.is_guest !== true) {
    throw new MenuCustomerAuthError(409, 'An account with this email already exists for this restaurant.');
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  if (existing) {
    return toMenuCustomerSession(
      await updateCustomer(existing.customer_id || '', {
        email,
        phone,
        displayName,
        passwordHash,
        isGuest: false,
      }),
    );
  }

  return toMenuCustomerSession(
    await insertCustomer({
      restaurantId,
      email,
      phone,
      displayName,
      passwordHash,
      isGuest: false,
    }),
  );
}

export async function signInMenuCustomer({
  restaurantId,
  email,
  password,
}: {
  restaurantId: string;
  email: string;
  password: string;
}) {
  const normalizedRestaurantId = requireRestaurantId(restaurantId);
  const normalizedEmail = requireEmail(email);
  const normalizedPassword = requirePassword(password, false);
  const customer = await findCustomerByEmail(normalizedRestaurantId, normalizedEmail);

  if (!customer || customer.is_guest === true || !text(customer.password_hash)) {
    throw new MenuCustomerAuthError(401, 'Invalid email or password.');
  }

  const passwordMatches = bcrypt.compareSync(normalizedPassword, customer.password_hash || '');
  if (!passwordMatches) {
    throw new MenuCustomerAuthError(401, 'Invalid email or password.');
  }

  return toMenuCustomerSession(customer);
}

export async function continueAsGuestMenuCustomer(input: CustomerIdentityInput) {
  const restaurantId = requireRestaurantId(input.restaurantId);
  const email = requireEmail(input.email);
  const phone = requirePhone(input.phone);
  const displayName = requireDisplayName(input.firstName, input.lastName, email);
  const existing = await findCustomerByEmail(restaurantId, email);

  if (existing && existing.is_guest !== true) {
    throw new MenuCustomerAuthError(409, 'This email already has an account for this restaurant. Please sign in.');
  }

  if (existing) {
    return toMenuCustomerSession(
      await updateCustomer(existing.customer_id || '', {
        email,
        phone,
        displayName,
        passwordHash: null,
        isGuest: true,
      }),
    );
  }

  return toMenuCustomerSession(
    await insertCustomer({
      restaurantId,
      email,
      phone,
      displayName,
      passwordHash: null,
      isGuest: true,
    }),
  );
}

export async function readMenuCustomerSession(
  cookieValue: string | null | undefined,
  restaurantId?: string | null,
): Promise<MenuCustomerSession | null> {
  if (!cookieValue) {
    return null;
  }

  const payload = verifySignedPayload(cookieValue);
  if (!payload) {
    return null;
  }

  if (payload.exp <= Date.now()) {
    return null;
  }

  if (restaurantId && payload.rid !== restaurantId) {
    return null;
  }

  const current = await findCustomerById(payload.sub);
  if (!current || current.is_deleted === true) {
    return null;
  }

  if (current.restaurant_id !== payload.rid) {
    return null;
  }

  return toMenuCustomerSession(current);
}

export function attachMenuCustomerSession(response: NextResponse, session: MenuCustomerSession) {
  response.cookies.set({
    name: MENU_CUSTOMER_SESSION_COOKIE,
    value: signPayload(session),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MENU_CUSTOMER_SESSION_MAX_AGE,
  });
}

export function clearMenuCustomerSession(response: NextResponse) {
  response.cookies.set({
    name: MENU_CUSTOMER_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function getMenuCustomerSessionCookieName() {
  return MENU_CUSTOMER_SESSION_COOKIE;
}

async function findCustomerByEmail(restaurantId: string, email: string) {
  const data = await adminGraphqlRequest<GetCustomerByEmailResponse>(GET_CUSTOMER_BY_EMAIL, {
    restaurant_id: restaurantId,
    email,
  });

  const candidates = Array.isArray(data.customers) ? data.customers : [];
  return candidates.find((candidate) => candidate?.is_deleted !== true) || null;
}

async function findCustomerById(customerId: string) {
  const data = await adminGraphqlRequest<GetCustomerByIdResponse>(GET_CUSTOMER_BY_ID, {
    customer_id: customerId,
  });

  return data.customers_by_pk && data.customers_by_pk.is_deleted !== true
    ? data.customers_by_pk
    : null;
}

async function insertCustomer({
  restaurantId,
  email,
  phone,
  displayName,
  passwordHash,
  isGuest,
}: {
  restaurantId: string;
  email: string;
  phone: string;
  displayName: string;
  passwordHash: string | null;
  isGuest: boolean;
}) {
  try {
    const data = await adminGraphqlRequest<InsertCustomerResponse>(INSERT_CUSTOMER, {
      restaurant_id: restaurantId,
      email,
      phone,
      display_name: displayName,
      password_hash: passwordHash,
      is_guest: isGuest,
    });

    if (!data.insert_customers_one) {
      throw new Error('Customer insert returned no row.');
    }

    return data.insert_customers_one;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create customer.';
    if (message.toLowerCase().includes('unique')) {
      throw new MenuCustomerAuthError(409, 'An account with this email already exists for this restaurant.');
    }
    throw error;
  }
}

async function updateCustomer(
  customerId: string,
  {
    email,
    phone,
    displayName,
    passwordHash,
    isGuest,
  }: {
    email: string;
    phone: string;
    displayName: string;
    passwordHash: string | null;
    isGuest: boolean;
  },
) {
  if (!UUID_REGEX.test(customerId)) {
    throw new MenuCustomerAuthError(400, 'Invalid customer id.');
  }

  const data = await adminGraphqlRequest<UpdateCustomerResponse>(UPDATE_CUSTOMER, {
    customer_id: customerId,
    email,
    phone,
    display_name: displayName,
    password_hash: passwordHash,
    is_guest: isGuest,
  });

  if (!data.update_customers_by_pk) {
    throw new MenuCustomerAuthError(404, 'Customer was not found.');
  }

  return data.update_customers_by_pk;
}

function toMenuCustomerSession(record: CustomerRecord): MenuCustomerSession {
  const customerId = text(record.customer_id);
  const restaurantId = text(record.restaurant_id);
  const email = text(record.email);

  if (!customerId || !restaurantId || !email) {
    throw new Error('Customer record is missing required fields.');
  }

  return {
    ...createMenuCustomerProfile({
      customerId,
      restaurantId,
      name: text(record.display_name),
      email,
      phone: text(record.phone),
      isGuest: record.is_guest === true,
    }),
    customerId,
    restaurantId,
    isGuest: record.is_guest === true,
  };
}

function signPayload(session: MenuCustomerSession) {
  const payload: MenuCustomerSessionPayload = {
    v: 1,
    sub: session.customerId,
    rid: session.restaurantId,
    email: session.email,
    name: session.name,
    phone: session.phone,
    isGuest: session.isGuest === true,
    exp: Date.now() + MENU_CUSTOMER_SESSION_MAX_AGE * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', resolveSessionSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifySignedPayload(token: string): MenuCustomerSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = createHmac('sha256', resolveSessionSecret())
    .update(encodedPayload)
    .digest('base64url');

  const providedBuffer = Buffer.from(providedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<MenuCustomerSessionPayload>;

    if (
      parsed.v !== 1 ||
      !text(parsed.sub) ||
      !text(parsed.rid) ||
      !text(parsed.email) ||
      !text(parsed.name) ||
      typeof parsed.isGuest !== 'boolean' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    return {
      v: 1,
      sub: parsed.sub as string,
      rid: parsed.rid as string,
      email: parsed.email as string,
      name: parsed.name as string,
      phone: text(parsed.phone),
      isGuest: parsed.isGuest,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

function resolveSessionSecret() {
  const secret =
    text(process.env.MENU_CUSTOMER_SESSION_SECRET) ||
    text(process.env.HASURA_ADMIN_SECRET) ||
    text(process.env.HASURA_GRAPHQL_ADMIN_SECRET);

  if (!secret) {
    throw new Error('MENU_CUSTOMER_SESSION_SECRET is not configured on server.');
  }

  return secret;
}

function requireRestaurantId(value: string) {
  const normalized = text(value);
  if (!normalized || !UUID_REGEX.test(normalized)) {
    throw new MenuCustomerAuthError(400, 'A valid restaurant id is required.');
  }
  return normalized;
}

function requireEmail(value: string) {
  const normalized = text(value)?.toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    throw new MenuCustomerAuthError(400, 'Enter a valid email address.');
  }
  return normalized;
}

function requirePhone(value: string) {
  const normalized = text(value);
  if (!normalized || !PHONE_REGEX.test(normalized)) {
    throw new MenuCustomerAuthError(400, 'Enter a valid phone number.');
  }
  return normalized;
}

function requirePassword(value: string, enforceLength = true) {
  const normalized = text(value);
  if (!normalized) {
    throw new MenuCustomerAuthError(400, 'Password is required.');
  }
  if (enforceLength && normalized.length < 8) {
    throw new MenuCustomerAuthError(400, 'Password must be at least 8 characters long.');
  }
  return normalized;
}

function requireDisplayName(firstName: string, lastName: string, email: string) {
  const normalizedFirstName = text(firstName);
  const normalizedLastName = text(lastName);

  if (!normalizedFirstName) {
    throw new MenuCustomerAuthError(400, 'First name is required.');
  }

  if (!normalizedLastName) {
    throw new MenuCustomerAuthError(400, 'Last name is required.');
  }

  return `${normalizedFirstName} ${normalizedLastName}`.trim() || email;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

