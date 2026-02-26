function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function ensureStorageVersionPath(value: string) {
  const trimmed = value.replace(/\/+$/, '');
  if (trimmed.endsWith('/v1')) {
    return trimmed;
  }

  if (trimmed.endsWith('/v1/files')) {
    return trimmed.slice(0, -('/files'.length));
  }

  return `${trimmed}/v1`;
}

function resolveStorageUrlFromServiceUrl(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname;
    const candidates = [
      hostname.replace('.hasura.', '.storage.'),
      hostname.replace('.graphql.', '.storage.'),
      hostname.replace('.backend.', '.storage.'),
      hostname.replace('graphql', 'storage'),
    ];

    for (const candidate of candidates) {
      if (candidate && candidate !== hostname) {
        return `${parsed.protocol}//${candidate}/v1`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveHasuraAdminSecret() {
  return (
    normalizeString(process.env.HASURA_ADMIN_SECRET) ||
    normalizeString(process.env.HASURA_GRAPHQL_ADMIN_SECRET)
  );
}

export function resolveStorageApiUrl() {
  const explicitStorageUrl =
    normalizeString(process.env.NHOST_STORAGE_URL) ||
    normalizeString(process.env.NEXT_PUBLIC_NHOST_STORAGE_URL);
  if (explicitStorageUrl) {
    return ensureStorageVersionPath(explicitStorageUrl);
  }

  const hasuraUrl =
    normalizeString(process.env.HASURA_API_URL) ||
    normalizeString(process.env.HASURA_GRAPHQL_URL) ||
    normalizeString(process.env.HASURA_GRAPHQL_ENDPOINT);
  if (hasuraUrl) {
    const resolved = resolveStorageUrlFromServiceUrl(hasuraUrl);
    if (resolved) {
      return resolved;
    }
  }

  const backendUrl = normalizeString(process.env.NEXT_PUBLIC_NHOST_BACKEND_URL);
  if (backendUrl) {
    const resolved = resolveStorageUrlFromServiceUrl(backendUrl);
    if (resolved) {
      return resolved;
    }
  }

  const subdomain = normalizeString(process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN);
  const region = normalizeString(process.env.NEXT_PUBLIC_NHOST_REGION);
  if (subdomain && region) {
    return `https://${subdomain}.storage.${region}.nhost.run/v1`;
  }

  return null;
}
