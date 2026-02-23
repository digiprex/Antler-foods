import type { User } from "@nhost/nhost-js";

export type AppRole = "admin" | "manager" | "owner" | "client" | "user";

const ALLOWED_ROLES = new Set<AppRole>(["admin", "manager", "owner", "client", "user"]);

function toRole(value: unknown): AppRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase().trim();
  return ALLOWED_ROLES.has(normalized as AppRole)
    ? (normalized as AppRole)
    : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function toRoleFromList(value: unknown): AppRole | null {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    const role = toRole(item);
    if (role) {
      return role;
    }
  }

  return null;
}

export function getRoleFromHasuraClaims(claimsInput: unknown): AppRole | null {
  const rawClaims = readRecord(claimsInput);
  if (!rawClaims) {
    return null;
  }

  const hasuraClaims =
    readRecord(rawClaims["https://hasura.io/jwt/claims"]) ?? rawClaims;

  const candidates: unknown[] = [
    hasuraClaims["x-hasura-default-role"],
    hasuraClaims["x-hasura-role"],
  ];

  for (const candidate of candidates) {
    const role = toRole(candidate);
    if (role) {
      return role;
    }
  }

  return toRoleFromList(hasuraClaims["x-hasura-allowed-roles"]);
}

export function getUserRole(user: User | null | undefined): AppRole {
  if (!user) {
    return "user";
  }

  const userRecord = readRecord(user);
  const metadata = readRecord(user.metadata);
  const roleFromUserClaims = getRoleFromHasuraClaims(
    userRecord?.claims ?? userRecord?.jwtClaims ?? userRecord?.customClaims,
  );
  if (roleFromUserClaims) {
    return roleFromUserClaims;
  }

  const metadataClaims = metadata?.claims ?? metadata?.jwtClaims;
  const roleFromMetadataClaims = getRoleFromHasuraClaims(metadataClaims);
  if (roleFromMetadataClaims) {
    return roleFromMetadataClaims;
  }

  const candidates: unknown[] = [
    metadata?.role,
    metadata?.userRole,
    metadata?.["x-hasura-default-role"],
    user.defaultRole,
    ...user.roles,
  ];

  for (const candidate of candidates) {
    const role = toRole(candidate);
    if (role) {
      return role;
    }
  }

  return "user";
}
