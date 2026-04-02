import 'server-only';

import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import {
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_RESET_PASSWORD_ROUTE,
} from '@/lib/auth/routes';
import { resolveCustomerNextPath } from '@/features/restaurant-menu/lib/customer-auth';
import {
  createMenuCustomerProfile,
  type MenuCustomerProfile,
} from '@/features/restaurant-menu/lib/customer-profile';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendMenuPasswordResetEmail } from '@/lib/server/email';

const MENU_CUSTOMER_SESSION_COOKIE = 'menu_customer_session';
const MENU_CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const MENU_PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
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

const GET_RESTAURANT_BY_ID = `
  query GetRestaurantById($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      name
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

const UPDATE_CUSTOMER_PASSWORD = `
  mutation UpdateCustomerPassword(
    $customer_id: uuid!
    $password_hash: String!
  ) {
    update_customers_by_pk(
      pk_columns: { customer_id: $customer_id }
      _set: {
        password_hash: $password_hash
        is_guest: false
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

const INSERT_USER_PASSWORD_RESET_TOKEN = `
  mutation InsertUserPasswordResetToken(
    $customer_id: uuid!
    $restaurant_id: uuid!
    $token_hash: String!
    $expires_at: timestamptz!
  ) {
    insert_user_password_reset_tokens_one(
      object: {
        customer_id: $customer_id
        restaurant_id: $restaurant_id
        token_hash: $token_hash
        expires_at: $expires_at
      }
    ) {
      id
      customer_id
      restaurant_id
      token_hash
      expires_at
      used_at
      created_at
    }
  }
`;

const GET_USER_PASSWORD_RESET_TOKEN_BY_HASH = `
  query GetUserPasswordResetTokenByHash($token_hash: String!) {
    user_password_reset_tokens(
      where: { token_hash: { _eq: $token_hash } }
      order_by: [{ created_at: desc }]
      limit: 1
    ) {
      id
      customer_id
      restaurant_id
      token_hash
      expires_at
      used_at
      created_at
    }
  }
`;

const INVALIDATE_USER_PASSWORD_RESET_TOKENS = `
  mutation InvalidateUserPasswordResetTokens(
    $customer_id: uuid!
    $used_at: timestamptz!
  ) {
    update_user_password_reset_tokens(
      where: {
        customer_id: { _eq: $customer_id }
        used_at: { _is_null: true }
      }
      _set: { used_at: $used_at }
    ) {
      affected_rows
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

interface RestaurantRecord {
  restaurant_id?: string | null;
  name?: string | null;
}

interface PasswordResetTokenRecord {
  id?: string | null;
  customer_id?: string | null;
  restaurant_id?: string | null;
  token_hash?: string | null;
  expires_at?: string | null;
  used_at?: string | null;
  created_at?: string | null;
}

interface GetCustomerByEmailResponse {
  customers?: CustomerRecord[];
}

interface GetCustomerByIdResponse {
  customers_by_pk?: CustomerRecord | null;
}

interface GetRestaurantByIdResponse {
  restaurants_by_pk?: RestaurantRecord | null;
}

interface InsertCustomerResponse {
  insert_customers_one?: CustomerRecord | null;
}

interface UpdateCustomerResponse {
  update_customers_by_pk?: CustomerRecord | null;
}

interface InsertUserPasswordResetTokenResponse {
  insert_user_password_reset_tokens_one?: PasswordResetTokenRecord | null;
}

interface GetUserPasswordResetTokenByHashResponse {
  user_password_reset_tokens?: PasswordResetTokenRecord[];
}

interface InvalidateUserPasswordResetTokensResponse {
  update_user_password_reset_tokens?: {
    affected_rows?: number | null;
  } | null;
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

interface PasswordResetContext {
  tokenRecordId: string;
  customerId: string;
  restaurantId: string;
  email: string;
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

export async function signUpMenuCustomer(
  input: CustomerIdentityInput & { password: string },
) {
  const restaurantId = requireRestaurantId(input.restaurantId);
  const email = requireEmail(input.email);
  const password = requirePassword(input.password);
  const phone = requirePhone(input.phone);
  const displayName = requireDisplayName(input.firstName, input.lastName, email);
  const existing = await findCustomerByEmail(restaurantId, email);

  if (existing && existing.is_guest !== true) {
    throw new MenuCustomerAuthError(
      409,
      'An account with this email already exists for this restaurant.',
    );
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

  const passwordMatches = bcrypt.compareSync(
    normalizedPassword,
    customer.password_hash || '',
  );
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

  if (existing) {
    const session = toMenuCustomerSession(
      await updateCustomer(existing.customer_id || '', {
        email,
        phone,
        displayName,
        passwordHash: existing.is_guest ? null : (existing.password_hash || null),
        isGuest: existing.is_guest ?? true,
      }),
    );
    session.isGuest = true;
    return session;
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

export async function updateMenuCustomerProfile({
  customerId,
  restaurantId,
  firstName,
  lastName,
  phone,
}: {
  customerId: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  if (!UUID_REGEX.test(customerId)) {
    throw new MenuCustomerAuthError(400, 'Invalid customer id.');
  }

  const normalizedPhone = requirePhone(phone);
  const displayName = requireDisplayName(firstName, lastName, '');

  const customer = await findCustomerById(customerId);
  if (!customer || customer.is_deleted === true) {
    throw new MenuCustomerAuthError(404, 'Customer account not found.');
  }

  if (customer.restaurant_id !== restaurantId) {
    throw new MenuCustomerAuthError(403, 'Not authorized to update this profile.');
  }

  const updated = await updateCustomer(customerId, {
    email: text(customer.email) || '',
    phone: normalizedPhone,
    displayName,
    passwordHash: text(customer.password_hash),
    isGuest: customer.is_guest === true,
  });

  return toMenuCustomerSession(updated);
}

export async function changeMenuCustomerPassword({
  customerId,
  restaurantId,
  currentPassword,
  newPassword,
}: {
  customerId: string;
  restaurantId: string;
  currentPassword: string;
  newPassword: string;
}) {
  if (!UUID_REGEX.test(customerId)) {
    throw new MenuCustomerAuthError(400, 'Invalid customer id.');
  }

  const normalizedNewPassword = requirePassword(newPassword);

  const customer = await findCustomerById(customerId);
  if (!customer || customer.is_deleted === true) {
    throw new MenuCustomerAuthError(404, 'Customer account not found.');
  }

  if (customer.restaurant_id !== restaurantId) {
    throw new MenuCustomerAuthError(403, 'Not authorized.');
  }

  if (customer.is_guest === true || !text(customer.password_hash)) {
    throw new MenuCustomerAuthError(400, 'Guest accounts cannot change their password.');
  }

  const currentMatches = bcrypt.compareSync(
    currentPassword,
    customer.password_hash || '',
  );
  if (!currentMatches) {
    throw new MenuCustomerAuthError(401, 'Current password is incorrect.');
  }

  const newHash = bcrypt.hashSync(normalizedNewPassword, 10);
  const updated = await updateCustomerPassword(customerId, newHash);

  return toMenuCustomerSession(updated);
}

export async function requestMenuCustomerPasswordReset({
  restaurantId,
  email,
  appOrigin,
  nextPath,
}: {
  restaurantId: string;
  email: string;
  appOrigin: string;
  nextPath?: string | null;
}) {
  const normalizedRestaurantId = requireRestaurantId(restaurantId);
  const normalizedEmail = requireEmail(email);
  const normalizedOrigin = requireAppOrigin(appOrigin);
  const resolvedNextPath = resolveCustomerNextPath(nextPath);
  const customer = await findCustomerByEmail(normalizedRestaurantId, normalizedEmail);

  if (!customer || customer.is_guest === true || !text(customer.password_hash)) {
    return;
  }

  const customerId = text(customer.customer_id);
  if (!customerId) {
    return;
  }

  await invalidatePasswordResetTokens(customerId);

  const rawToken = createPasswordResetToken();
  const expiresAt = new Date(
    Date.now() + MENU_PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  await insertPasswordResetToken({
    customerId,
    restaurantId: normalizedRestaurantId,
    tokenHash: hashPasswordResetToken(rawToken),
    expiresAt,
  });

  const restaurantName = await findRestaurantName(normalizedRestaurantId);
  const displayName = text(customer.display_name) || normalizedEmail;
  const resetUrl = buildPasswordResetUrl({
    appOrigin: normalizedOrigin,
    token: rawToken,
    restaurantId: normalizedRestaurantId,
    nextPath: resolvedNextPath,
  });

  try {
    await sendMenuPasswordResetEmail(normalizedEmail, {
      customerName: displayName,
      restaurantName,
      resetUrl,
      expiresInMinutes: MENU_PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    await invalidatePasswordResetTokens(customerId);
    throw error;
  }
}

export async function getMenuCustomerPasswordResetContext(token: string) {
  const validatedToken = requirePasswordResetToken(token);
  const record = await findPasswordResetTokenByToken(validatedToken);

  if (!record) {
    throw new MenuCustomerAuthError(400, 'This reset link is invalid. Request a new password reset email.');
  }

  if (text(record.used_at)) {
    throw new MenuCustomerAuthError(410, 'This reset link has already been used. Request a new password reset email.');
  }

  const expiresAt = parseIsoDate(record.expires_at);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw new MenuCustomerAuthError(410, 'This reset link has expired. Request a new password reset email.');
  }

  const customerId = text(record.customer_id);
  const restaurantId = text(record.restaurant_id);
  const tokenRecordId = text(record.id);

  if (!customerId || !restaurantId || !tokenRecordId) {
    throw new MenuCustomerAuthError(400, 'This reset link is invalid. Request a new password reset email.');
  }

  const customer = await findCustomerById(customerId);
  if (!customer || customer.is_deleted === true) {
    throw new MenuCustomerAuthError(404, 'This customer account could not be found.');
  }

  const email = text(customer.email);
  if (!email || customer.restaurant_id !== restaurantId) {
    throw new MenuCustomerAuthError(400, 'This reset link is invalid. Request a new password reset email.');
  }

  return {
    tokenRecordId,
    customerId,
    restaurantId,
    email,
  } satisfies PasswordResetContext;
}

export async function resetMenuCustomerPassword({
  token,
  password,
}: {
  token: string;
  password: string;
}) {
  const context = await getMenuCustomerPasswordResetContext(token);
  const normalizedPassword = requirePassword(password);
  const passwordHash = bcrypt.hashSync(normalizedPassword, 10);

  const updatedCustomer = await updateCustomerPassword(context.customerId, passwordHash);
  await invalidatePasswordResetTokens(context.customerId);

  return toMenuCustomerSession(updatedCustomer);
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

export function attachMenuCustomerSession(
  response: NextResponse,
  session: MenuCustomerSession,
) {
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
  const data = await adminGraphqlRequest<GetCustomerByEmailResponse>(
    GET_CUSTOMER_BY_EMAIL,
    {
      restaurant_id: restaurantId,
      email,
    },
  );

  const candidates = Array.isArray(data.customers) ? data.customers : [];
  return candidates.find((candidate) => candidate?.is_deleted !== true) || null;
}

async function findCustomerById(customerId: string) {
  const data = await adminGraphqlRequest<GetCustomerByIdResponse>(
    GET_CUSTOMER_BY_ID,
    {
      customer_id: customerId,
    },
  );

  return data.customers_by_pk && data.customers_by_pk.is_deleted !== true
    ? data.customers_by_pk
    : null;
}

async function findRestaurantName(restaurantId: string) {
  const data = await adminGraphqlRequest<GetRestaurantByIdResponse>(
    GET_RESTAURANT_BY_ID,
    {
      restaurant_id: restaurantId,
    },
  );

  return text(data.restaurants_by_pk?.name) || null;
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
    const data = await adminGraphqlRequest<InsertCustomerResponse>(
      INSERT_CUSTOMER,
      {
        restaurant_id: restaurantId,
        email,
        phone,
        display_name: displayName,
        password_hash: passwordHash,
        is_guest: isGuest,
      },
    );

    if (!data.insert_customers_one) {
      throw new Error('Customer insert returned no row.');
    }

    return data.insert_customers_one;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create customer.';
    if (message.toLowerCase().includes('unique')) {
      throw new MenuCustomerAuthError(
        409,
        'An account with this email already exists for this restaurant.',
      );
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

  const data = await adminGraphqlRequest<UpdateCustomerResponse>(
    UPDATE_CUSTOMER,
    {
      customer_id: customerId,
      email,
      phone,
      display_name: displayName,
      password_hash: passwordHash,
      is_guest: isGuest,
    },
  );

  if (!data.update_customers_by_pk) {
    throw new MenuCustomerAuthError(404, 'Customer was not found.');
  }

  return data.update_customers_by_pk;
}

async function updateCustomerPassword(customerId: string, passwordHash: string) {
  if (!UUID_REGEX.test(customerId)) {
    throw new MenuCustomerAuthError(400, 'Invalid customer id.');
  }

  const data = await adminGraphqlRequest<UpdateCustomerResponse>(
    UPDATE_CUSTOMER_PASSWORD,
    {
      customer_id: customerId,
      password_hash: passwordHash,
    },
  );

  if (!data.update_customers_by_pk) {
    throw new MenuCustomerAuthError(404, 'Customer was not found.');
  }

  return data.update_customers_by_pk;
}

async function insertPasswordResetToken({
  customerId,
  restaurantId,
  tokenHash,
  expiresAt,
}: {
  customerId: string;
  restaurantId: string;
  tokenHash: string;
  expiresAt: string;
}) {
  const data = await adminGraphqlRequest<InsertUserPasswordResetTokenResponse>(
    INSERT_USER_PASSWORD_RESET_TOKEN,
    {
      customer_id: customerId,
      restaurant_id: restaurantId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  );

  if (!data.insert_user_password_reset_tokens_one) {
    throw new Error('Password reset token insert returned no row.');
  }

  return data.insert_user_password_reset_tokens_one;
}

async function findPasswordResetTokenByToken(token: string) {
  const data = await adminGraphqlRequest<GetUserPasswordResetTokenByHashResponse>(
    GET_USER_PASSWORD_RESET_TOKEN_BY_HASH,
    {
      token_hash: hashPasswordResetToken(token),
    },
  );

  const records = Array.isArray(data.user_password_reset_tokens)
    ? data.user_password_reset_tokens
    : [];
  return records[0] || null;
}

async function invalidatePasswordResetTokens(customerId: string) {
  if (!UUID_REGEX.test(customerId)) {
    throw new MenuCustomerAuthError(400, 'Invalid customer id.');
  }

  await adminGraphqlRequest<InvalidateUserPasswordResetTokensResponse>(
    INVALIDATE_USER_PASSWORD_RESET_TOKENS,
    {
      customer_id: customerId,
      used_at: new Date().toISOString(),
    },
  );
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

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    'utf8',
  ).toString('base64url');
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


function buildPasswordResetUrl({
  appOrigin,
  token,
  restaurantId,
  nextPath,
}: {
  appOrigin: string;
  token: string;
  restaurantId: string;
  nextPath?: string | null;
}) {
  const url = new URL(CUSTOMER_RESET_PASSWORD_ROUTE, appOrigin);
  url.searchParams.set('token', token);
  url.searchParams.set('restaurantId', restaurantId);

  if (nextPath && nextPath !== CUSTOMER_DEFAULT_AUTH_REDIRECT) {
    url.searchParams.set('next', nextPath);
  }

  return url.toString();
}

function createPasswordResetToken() {
  return randomBytes(32).toString('hex');
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256')
    .update(`${resolvePasswordResetSecret()}:${token}`)
    .digest('hex');
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

function resolvePasswordResetSecret() {
  return (
    text(process.env.MENU_CUSTOMER_PASSWORD_RESET_SECRET) ||
    resolveSessionSecret()
  );
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
    throw new MenuCustomerAuthError(
      400,
      'Password must be at least 8 characters long.',
    );
  }
  return normalized;
}

function requirePasswordResetToken(value: string) {
  const normalized = text(value);
  if (!normalized || normalized.length < 32) {
    throw new MenuCustomerAuthError(
      400,
      'This reset link is invalid. Request a new password reset email.',
    );
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

function requireAppOrigin(value: string) {
  const normalized = text(value);
  if (!normalized) {
    throw new MenuCustomerAuthError(500, 'Application origin is not configured.');
  }

  try {
    const url = new URL(normalized);
    return url.origin;
  } catch {
    throw new MenuCustomerAuthError(500, 'Application origin is invalid.');
  }
}

function parseIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
