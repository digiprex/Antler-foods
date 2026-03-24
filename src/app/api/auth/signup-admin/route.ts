import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_LOGIN_ROUTE } from "@/lib/auth/routes";

type JsonRecord = Record<string, unknown>;

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const AUTH_REDIRECT_BASE_URL_ENV_KEYS = [
  "AUTH_REDIRECT_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
] as const;

const INSERT_ADMIN_USER_MUTATION = `
  mutation InsertAdminUser(
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
        emailVerified: false
        defaultRole: "admin"
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

const ASSIGN_ADMIN_ROLE_MUTATION = `
  mutation AssignAdminRole($userId: uuid!) {
    insertAuthUserRole(object: { userId: $userId, role: "admin" }) {
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
    const firstName = normalizeString(payload.firstName) || "";
    const lastName = normalizeString(payload.lastName) || "";
    const phoneNumber = normalizeString(payload.phoneNumber) || "";
    const displayName = `${firstName} ${lastName}`.trim() || email || "";

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

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json(
        { error: "Last name is required." },
        { status: 400 },
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 },
      );
    }

    const { authUrl, graphqlUrl, hasuraAdminSecret } = resolveServerConfig();
    const userId = await createAdminUser({
      email,
      password,
      displayName,
      graphqlUrl,
      hasuraAdminSecret,
      metadata: {
        firstName,
        lastName,
        phoneNumber,
        role: "admin",
      },
    });

    const verificationRedirectUrl = buildAppRedirectUrl(request, ADMIN_LOGIN_ROUTE);

    const verificationEmailResult = await sendVerificationEmail({
      authUrl,
      email,
      redirectTo: verificationRedirectUrl,
    });

    return NextResponse.json({
      userId,
      warning: verificationEmailResult.warning,
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Failed to create admin user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createAdminUser({
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
    query: INSERT_ADMIN_USER_MUTATION,
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
    throw new Error("User creation failed: missing user id in response.");
  }

  await adminGraphqlRequest({
    graphqlUrl,
    hasuraAdminSecret,
    query: ASSIGN_ADMIN_ROLE_MUTATION,
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

    if (message.toLowerCase().includes("unique")) {
      throw new Error("An account with this email already exists.");
    }

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

function normalizeAbsoluteUrl(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function resolvePublicAppBaseUrl(request: NextRequest) {
  for (const key of AUTH_REDIRECT_BASE_URL_ENV_KEYS) {
    const configuredUrl = normalizeAbsoluteUrl(process.env[key]);
    if (configuredUrl) {
      return configuredUrl;
    }
  }

  return request.nextUrl.origin;
}

function buildAppRedirectUrl(request: NextRequest, path: string) {
  const baseUrl = new URL(resolvePublicAppBaseUrl(request));
  const normalizedPath = path.replace(/^\/+/, "");
  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;

  return new URL(normalizedPath, `${baseUrl.origin}${basePath}`).toString();
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function sendVerificationEmail({
  authUrl,
  email,
  redirectTo,
}: {
  authUrl: string;
  email: string;
  redirectTo: string;
}) {
  const firstAttempt = await requestVerificationEmail({
    authUrl,
    email,
    redirectTo,
  });

  if (firstAttempt.ok) {
    return { warning: null };
  }

  const firstReason = firstAttempt.reason;
  const isRedirectRejected = firstReason?.toLowerCase().includes("redirectto");

  if (isRedirectRejected) {
    const fallbackAttempt = await requestVerificationEmail({
      authUrl,
      email,
    });

    if (fallbackAttempt.ok) {
      return {
        warning:
          "Verification email was sent using the default auth redirect because the custom signup redirect is not allowed in the current Nhost configuration.",
      };
    }
  }

  const redirectGuidance = isRedirectRejected
    ? ` Rejected redirect URL: ${redirectTo}. Add this exact URL to the Nhost allowed redirect URLs list, or set AUTH_REDIRECT_BASE_URL/NEXT_PUBLIC_APP_URL to an allowed origin.`
    : "";
  throw new Error(
    firstReason
      ? `Account was created, but verification email could not be sent: ${firstReason}${redirectGuidance}`
      : "Account was created, but verification email could not be sent.",
  );
}

async function requestVerificationEmail({
  authUrl,
  email,
  redirectTo,
}: {
  authUrl: string;
  email: string;
  redirectTo?: string;
}) {
  const response = await fetch(`${authUrl}/user/email/send-verification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      ...(redirectTo
        ? {
            options: {
              redirectTo,
            },
          }
        : {}),
    }),
    cache: "no-store",
  });

  if (response.ok) {
    return { ok: true as const, reason: null };
  }

  const payload = (await safeParseJson(response)) as
    | { message?: string; error?: string }
    | null;

  return {
    ok: false as const,
    reason: payload?.message || payload?.error || null,
  };
}
