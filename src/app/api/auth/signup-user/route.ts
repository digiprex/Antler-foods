import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

type JsonRecord = Record<string, unknown>;

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const INSERT_USER_MUTATION = `
  mutation InsertCustomerUser(
    $email: citext!
    $passwordHash: String!
    $displayName: String!
    $metadata: jsonb!
  ) {
    insertUser(
      object: {
        email: $email
        passwordHash: $passwordHash
        locale: "en"
        displayName: $displayName
        emailVerified: true
        defaultRole: "user"
        metadata: $metadata
      }
    ) {
      id
      email
      displayName
      emailVerified
      defaultRole
    }
  }
`;

const ASSIGN_USER_ROLE_MUTATION = `
  mutation AssignUserRole($userId: uuid!) {
    insertAuthUserRole(object: { userId: $userId, role: "user" }) {
      id
      userId
      role
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as JsonRecord;
    const email = normalizeString(payload.email);
    const password = normalizeString(payload.password);
    const firstName = normalizeString(payload.firstName) || '';
    const lastName = normalizeString(payload.lastName) || '';
    const phoneNumber = normalizeString(payload.phoneNumber) || '';
    const displayName = `${firstName} ${lastName}`.trim() || email || '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    if (!firstName) {
      return NextResponse.json(
        { error: 'First name is required.' },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json(
        { error: 'Last name is required.' },
        { status: 400 },
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 },
      );
    }

    const { graphqlUrl, hasuraAdminSecret } = resolveServerConfig();
    const userId = await createCustomerUser({
      email,
      password,
      displayName,
      graphqlUrl,
      hasuraAdminSecret,
      metadata: {
        firstName,
        lastName,
        phoneNumber,
        role: 'user',
      },
    });

    return NextResponse.json({ userId, emailVerified: true });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : 'Failed to create user account.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createCustomerUser({
  email,
  password,
  displayName,
  graphqlUrl,
  hasuraAdminSecret,
  metadata,
}: {
  email: string;
  password: string;
  displayName: string;
  graphqlUrl: string;
  hasuraAdminSecret: string;
  metadata: JsonRecord;
}) {
  const passwordHash = bcrypt.hashSync(password, 10);

  const userData = await adminGraphqlRequest({
    graphqlUrl,
    hasuraAdminSecret,
    query: INSERT_USER_MUTATION,
    variables: {
      email,
      passwordHash,
      displayName,
      metadata,
    },
  });

  const insertedUser = (userData.insertUser || null) as JsonRecord | null;
  const userId = normalizeString(insertedUser?.id);
  if (!userId) {
    throw new Error('User creation failed: missing user id in response.');
  }

  await adminGraphqlRequest({
    graphqlUrl,
    hasuraAdminSecret,
    query: ASSIGN_USER_ROLE_MUTATION,
    variables: { userId },
  });

  return userId;
}

async function adminGraphqlRequest({
  graphqlUrl,
  hasuraAdminSecret,
  query,
  variables,
}: {
  graphqlUrl: string;
  hasuraAdminSecret: string;
  query: string;
  variables?: JsonRecord;
}) {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': hasuraAdminSecret,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const payload = (await safeParseJson(response)) as
    | { data?: JsonRecord; errors?: Array<{ message?: string }> }
    | null;

  if (!response.ok) {
    throw new Error(`Admin GraphQL HTTP ${response.status}`);
  }

  if (payload?.errors?.length) {
    const message = payload.errors
      .map((item) => item.message)
      .filter(Boolean)
      .join('; ');

    if (message.toLowerCase().includes('unique')) {
      throw new Error('An account with this email already exists.');
    }

    throw new Error(message || 'Admin GraphQL request failed.');
  }

  if (!payload?.data) {
    throw new Error('Admin GraphQL request returned no data.');
  }

  return payload.data;
}

function resolveServerConfig() {
  const backendUrl = normalizeBackendUrl(
    process.env.NEXT_PUBLIC_NHOST_BACKEND_URL,
  );
  const subdomain = normalizeString(process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN);
  const region = normalizeString(process.env.NEXT_PUBLIC_NHOST_REGION);

  const graphqlUrl =
    normalizeBackendUrl(process.env.HASURA_API_URL) ||
    normalizeBackendUrl(process.env.HASURA_GRAPHQL_URL) ||
    (backendUrl ? `${backendUrl}/v1/graphql` : null) ||
    (subdomain && region
      ? `https://${subdomain}.hasura.${region}.nhost.run/v1/graphql`
      : null);

  const hasuraAdminSecret = normalizeString(process.env.HASURA_ADMIN_SECRET);

  if (!graphqlUrl) {
    throw new Error('Hasura GraphQL URL is not configured on server.');
  }

  if (!hasuraAdminSecret) {
    throw new Error('HASURA_ADMIN_SECRET is not configured on server.');
  }

  return { graphqlUrl, hasuraAdminSecret };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeBackendUrl(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/+$/, '');
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}