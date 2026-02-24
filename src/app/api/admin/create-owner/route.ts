import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getRoleFromHasuraClaims } from "@/lib/auth/roles";

type JsonRecord = Record<string, unknown>;

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const INSERT_OWNER_USER_MUTATION = `
  mutation InsertOwnerUser($email: citext!, $passwordHash: String!, $displayName: String!) {
    insertUser(
      object: {
        email: $email
        passwordHash: $passwordHash
        locale: "en"
        displayName: $displayName
        emailVerified: true
        defaultRole: "owner"
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

const ASSIGN_OWNER_ROLE_MUTATION = `
  mutation AssignOwnerRole($userId: uuid!) {
    insertAuthUserRole(object: { userId: $userId, role: "owner" }) {
      id
      userId
      role
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { authUrl, graphqlUrl, hasuraAdminSecret } = resolveServerConfig();
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const adminCheck = await verifyAdminAccess({ authUrl, accessToken });
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create owner users." },
        { status: 403 },
      );
    }

    const payload = (await request.json()) as JsonRecord;
    const email = normalizeString(payload.email);
    const password = normalizeString(payload.password);
    const displayName = normalizeString(payload.displayName) || "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const userId = await createOwnerUser({
      email,
      password,
      displayName,
      graphqlUrl,
      hasuraAdminSecret,
    });

    return NextResponse.json({ userId });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Failed to create owner user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createOwnerUser({
  email,
  password,
  displayName,
  graphqlUrl,
  hasuraAdminSecret,
}: {
  email: string;
  password: string;
  displayName: string;
  graphqlUrl: string;
  hasuraAdminSecret: string;
}) {
  const passwordHash = bcrypt.hashSync(password, 10);

  const userData = await adminGraphqlRequest({
    graphqlUrl,
    hasuraAdminSecret,
    query: INSERT_OWNER_USER_MUTATION,
    variables: {
      email,
      passwordHash,
      displayName,
    },
  });

  const insertedUser = (userData.insertUser || null) as JsonRecord | null;
  const userId = normalizeString(insertedUser?.id);
  if (!userId) {
    throw new Error("User creation failed: missing user id in response.");
  }

  await adminGraphqlRequest({
    graphqlUrl,
    hasuraAdminSecret,
    query: ASSIGN_OWNER_ROLE_MUTATION,
    variables: { userId },
  });

  return userId;
}

async function verifyAdminAccess({
  authUrl,
  accessToken,
}: {
  authUrl: string;
  accessToken: string;
}) {
  const response = await fetch(`${authUrl}/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { isAdmin: false as const };
  }

  const tokenClaims = decodeJwtClaims(accessToken);
  const roleFromClaims = getRoleFromHasuraClaims(tokenClaims);
  if (roleFromClaims === "admin") {
    return { isAdmin: true as const };
  }

  const userPayload = (await safeParseJson(response)) as JsonRecord | null;
  const userRoleCandidates = [
    normalizeString(userPayload?.defaultRole),
    ...readStringList(userPayload?.roles),
  ];

  const hasAdminRole = userRoleCandidates.some((role) => role === "admin");
  return { isAdmin: hasAdminRole };
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": hasuraAdminSecret,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
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
      .join("; ");
    throw new Error(message || "Admin GraphQL request failed.");
  }

  if (!payload?.data) {
    throw new Error("Admin GraphQL request returned no data.");
  }

  return payload.data;
}

function resolveServerConfig() {
  const backendUrl = normalizeBackendUrl(
    process.env.NEXT_PUBLIC_NHOST_BACKEND_URL,
  );
  const subdomain = normalizeString(process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN);
  const region = normalizeString(process.env.NEXT_PUBLIC_NHOST_REGION);

  const authUrl =
    normalizeBackendUrl(process.env.NHOST_AUTH_URL) ||
    (backendUrl ? `${backendUrl}/v1/auth` : null) ||
    (subdomain && region
      ? `https://${subdomain}.auth.${region}.nhost.run/v1`
      : null);

  const graphqlUrl =
    normalizeBackendUrl(process.env.HASURA_API_URL) ||
    normalizeBackendUrl(process.env.HASURA_GRAPHQL_URL) ||
    (backendUrl ? `${backendUrl}/v1/graphql` : null) ||
    (subdomain && region
      ? `https://${subdomain}.hasura.${region}.nhost.run/v1/graphql`
      : null);

  const hasuraAdminSecret = normalizeString(process.env.HASURA_ADMIN_SECRET);

  if (!authUrl) {
    throw new Error("Nhost auth URL is not configured on server.");
  }

  if (!graphqlUrl) {
    throw new Error("Hasura GraphQL URL is not configured on server.");
  }

  if (!hasuraAdminSecret) {
    throw new Error("HASURA_ADMIN_SECRET is not configured on server.");
  }

  return { authUrl, graphqlUrl, hasuraAdminSecret };
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function decodeJwtClaims(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(
      payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
      "=",
    );
    const payloadJson = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeBackendUrl(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/+$/, "");
}

function readStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
