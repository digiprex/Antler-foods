import 'server-only';

import type Stripe from 'stripe';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { getStripe } from '@/lib/server/stripe';

export type OwnerStripeStatus =
  | 'not_connected'
  | 'setup_incomplete'
  | 'active'
  | 'action_required';

export type StripeConnectionMode =
  | 'hosted_onboarding'
  | 'existing_account_oauth';

type RestaurantPaymentAccountRow = {
  restaurant_payment_account_id?: string | null;
  restaurant_id?: string | null;
  provider?: string | null;
  stripe_account_id?: string | null;
  connection_mode?: string | null;
  is_connected?: boolean | null;
  details_submitted?: boolean | null;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  requirements_currently_due?: unknown;
  requirements_past_due?: unknown;
  requirements_pending_verification?: unknown;
  requirements_disabled_reason?: string | null;
  requirements_due_count?: number | null;
  pending_verification_count?: number | null;
  onboarding_status?: string | null;
  country?: string | null;
  email?: string | null;
  default_currency?: string | null;
  livemode?: boolean | null;
  last_synced_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: unknown;
};

interface RestaurantPaymentAccountsQueryResponse {
  restaurant_payment_accounts?: RestaurantPaymentAccountRow[];
}

interface InsertRestaurantPaymentAccountResponse {
  insert_restaurant_payment_accounts_one?: RestaurantPaymentAccountRow | null;
}

interface UpdateRestaurantPaymentAccountResponse {
  update_restaurant_payment_accounts_by_pk?: RestaurantPaymentAccountRow | null;
}

export interface RestaurantStripeAccountSnapshot {
  id: string;
  restaurantId: string;
  provider: 'stripe';
  stripeAccountId: string | null;
  displayName: string | null;
  connectionMode: StripeConnectionMode | null;
  isConnected: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
  requirementsPendingVerification: string[];
  requirementsDisabledReason: string | null;
  requirementsDueCount: number;
  pendingVerificationCount: number;
  onboardingStatus: OwnerStripeStatus;
  country: string | null;
  email: string | null;
  defaultCurrency: string | null;
  livemode: boolean;
  lastSyncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SyncStripeAccountOptions {
  restaurantId: string;
  stripeAccountId: string;
  connectionMode?: StripeConnectionMode | null;
  createdByUserId?: string | null;
}

const GET_RESTAURANT_PAYMENT_ACCOUNT_BY_RESTAURANT_ID = `
  query GetRestaurantPaymentAccountByRestaurantId($restaurant_id: uuid!, $provider: String!) {
    restaurant_payment_accounts(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        provider: { _eq: $provider }
      }
      limit: 1
    ) {
      restaurant_payment_account_id
      restaurant_id
      provider
      stripe_account_id
      connection_mode
      is_connected
      details_submitted
      charges_enabled
      payouts_enabled
      requirements_currently_due
      requirements_past_due
      requirements_pending_verification
      requirements_disabled_reason
      requirements_due_count
      pending_verification_count
      onboarding_status
      country
      email
      default_currency
      livemode
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

const GET_RESTAURANT_PAYMENT_ACCOUNT_BY_STRIPE_ACCOUNT_ID = `
  query GetRestaurantPaymentAccountByStripeAccountId($stripe_account_id: String!, $provider: String!) {
    restaurant_payment_accounts(
      where: {
        stripe_account_id: { _eq: $stripe_account_id }
        provider: { _eq: $provider }
      }
      limit: 1
    ) {
      restaurant_payment_account_id
      restaurant_id
      provider
      stripe_account_id
      connection_mode
      is_connected
      details_submitted
      charges_enabled
      payouts_enabled
      requirements_currently_due
      requirements_past_due
      requirements_pending_verification
      requirements_disabled_reason
      requirements_due_count
      pending_verification_count
      onboarding_status
      country
      email
      default_currency
      livemode
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

const INSERT_RESTAURANT_PAYMENT_ACCOUNT = `
  mutation InsertRestaurantPaymentAccount($object: restaurant_payment_accounts_insert_input!) {
    insert_restaurant_payment_accounts_one(object: $object) {
      restaurant_payment_account_id
      restaurant_id
      provider
      stripe_account_id
      connection_mode
      is_connected
      details_submitted
      charges_enabled
      payouts_enabled
      requirements_currently_due
      requirements_past_due
      requirements_pending_verification
      requirements_disabled_reason
      requirements_due_count
      pending_verification_count
      onboarding_status
      country
      email
      default_currency
      livemode
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

const UPDATE_RESTAURANT_PAYMENT_ACCOUNT = `
  mutation UpdateRestaurantPaymentAccount(
    $restaurant_payment_account_id: uuid!
    $changes: restaurant_payment_accounts_set_input!
  ) {
    update_restaurant_payment_accounts_by_pk(
      pk_columns: { restaurant_payment_account_id: $restaurant_payment_account_id }
      _set: $changes
    ) {
      restaurant_payment_account_id
      restaurant_id
      provider
      stripe_account_id
      connection_mode
      is_connected
      details_submitted
      charges_enabled
      payouts_enabled
      requirements_currently_due
      requirements_past_due
      requirements_pending_verification
      requirements_disabled_reason
      requirements_due_count
      pending_verification_count
      onboarding_status
      country
      email
      default_currency
      livemode
      last_synced_at
      created_at
      updated_at
      metadata
    }
  }
`;

// V1 deliberately keeps one connected account per restaurant for speed.
// TODO: lift this to a payout-entity mapping table if multiple restaurants
// should share one legal/payout Stripe account in a future phase.
export async function getRestaurantStripeAccountByRestaurantId(
  restaurantId: string,
) {
  const data = await adminGraphqlRequest<RestaurantPaymentAccountsQueryResponse>(
    GET_RESTAURANT_PAYMENT_ACCOUNT_BY_RESTAURANT_ID,
    {
      restaurant_id: restaurantId,
      provider: 'stripe',
    },
  );

  const row = Array.isArray(data.restaurant_payment_accounts)
    ? data.restaurant_payment_accounts[0]
    : null;

  return normalizeRestaurantStripeAccountRow(row);
}

export async function getRestaurantStripeAccountByStripeAccountId(
  stripeAccountId: string,
) {
  const data = await adminGraphqlRequest<RestaurantPaymentAccountsQueryResponse>(
    GET_RESTAURANT_PAYMENT_ACCOUNT_BY_STRIPE_ACCOUNT_ID,
    {
      stripe_account_id: stripeAccountId,
      provider: 'stripe',
    },
  );

  const row = Array.isArray(data.restaurant_payment_accounts)
    ? data.restaurant_payment_accounts[0]
    : null;

  return normalizeRestaurantStripeAccountRow(row);
}

export async function syncRestaurantStripeAccountByRestaurantId(
  restaurantId: string,
) {
  const existing = await getRestaurantStripeAccountByRestaurantId(restaurantId);
  if (!existing?.stripeAccountId) {
    return null;
  }

  return syncRestaurantStripeAccount({
    restaurantId,
    stripeAccountId: existing.stripeAccountId,
    connectionMode: existing.connectionMode,
  });
}

export async function syncRestaurantStripeAccountByStripeAccountId(
  stripeAccountId: string,
) {
  const existing = await getRestaurantStripeAccountByStripeAccountId(
    stripeAccountId,
  );
  if (!existing?.restaurantId || !existing.stripeAccountId) {
    return null;
  }

  return syncRestaurantStripeAccount({
    restaurantId: existing.restaurantId,
    stripeAccountId: existing.stripeAccountId,
    connectionMode: existing.connectionMode,
  });
}

export async function syncRestaurantStripeAccount({
  restaurantId,
  stripeAccountId,
  connectionMode = 'hosted_onboarding',
  createdByUserId = null,
}: SyncStripeAccountOptions) {
  const account = await getStripe().accounts.retrieve(stripeAccountId);
  return persistStripeAccount({
    restaurantId,
    account,
    connectionMode,
    createdByUserId,
  });
}

export async function persistStripeAccount({
  restaurantId,
  account,
  connectionMode = 'hosted_onboarding',
  createdByUserId = null,
}: {
  restaurantId: string;
  account: Stripe.Account;
  connectionMode?: StripeConnectionMode | null;
  createdByUserId?: string | null;
}) {
  const existing = await getRestaurantStripeAccountByRestaurantId(restaurantId);
  const payload = buildStripeAccountMutationPayload({
    restaurantId,
    account,
    connectionMode,
    createdByUserId,
    existingMetadata: existing?.metadata ?? null,
  });

  if (!existing) {
    const inserted = await adminGraphqlRequest<InsertRestaurantPaymentAccountResponse>(
      INSERT_RESTAURANT_PAYMENT_ACCOUNT,
      {
        object: payload,
      },
    );

    return normalizeRestaurantStripeAccountRow(
      inserted.insert_restaurant_payment_accounts_one,
    );
  }

  const updated = await adminGraphqlRequest<UpdateRestaurantPaymentAccountResponse>(
    UPDATE_RESTAURANT_PAYMENT_ACCOUNT,
    {
      restaurant_payment_account_id: existing.id,
      changes: payload,
    },
  );

  return normalizeRestaurantStripeAccountRow(
    updated.update_restaurant_payment_accounts_by_pk,
  );
}

export function mapOwnerStripeStatus(input: {
  stripeAccountId?: string | null;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsPastDue?: string[];
  requirementsPendingVerification?: string[];
  requirementsDisabledReason?: string | null;
}) {
  const stripeAccountId = normalizeString(input.stripeAccountId);
  const detailsSubmitted = Boolean(input.detailsSubmitted);
  const chargesEnabled = Boolean(input.chargesEnabled);
  const payoutsEnabled = Boolean(input.payoutsEnabled);
  const currentlyDue = input.requirementsCurrentlyDue ?? [];
  const pastDue = input.requirementsPastDue ?? [];
  const pendingVerification = input.requirementsPendingVerification ?? [];
  const disabledReason = normalizeString(input.requirementsDisabledReason);

  if (!stripeAccountId) {
    return 'not_connected' satisfies OwnerStripeStatus;
  }

  if (
    chargesEnabled &&
    payoutsEnabled &&
    !disabledReason &&
    currentlyDue.length === 0 &&
    pastDue.length === 0 &&
    pendingVerification.length === 0
  ) {
    return 'active' satisfies OwnerStripeStatus;
  }

  if (!detailsSubmitted) {
    return 'setup_incomplete' satisfies OwnerStripeStatus;
  }

  return 'action_required' satisfies OwnerStripeStatus;
}

export function buildOwnerStripeStatusSummary(
  account: RestaurantStripeAccountSnapshot | null,
) {
  if (!account) {
    return {
      status: 'not_connected' as OwnerStripeStatus,
      statusLabel: 'Not connected',
      message:
        'Connect with Stripe to start verification and prepare this restaurant for future payouts.',
      requirements: [] as string[],
      blockingIssue: null as string | null,
    };
  }

  const requirements = [
    ...account.requirementsCurrentlyDue,
    ...account.requirementsPastDue,
    ...account.requirementsPendingVerification,
  ];
  const disabledReason = normalizeString(account.requirementsDisabledReason);

  switch (account.onboardingStatus) {
    case 'active':
      return {
        status: 'active' as OwnerStripeStatus,
        statusLabel: 'Active',
        message:
          'Stripe setup is complete for this restaurant. Antler Foods admin manages payout controls separately.',
        requirements,
        blockingIssue: null,
      };
    case 'setup_incomplete':
      return {
        status: 'setup_incomplete' as OwnerStripeStatus,
        statusLabel: 'Setup incomplete',
        message:
          'Finish Stripe setup so verification can continue and the account can be reviewed for payout readiness.',
        requirements,
        blockingIssue: null,
      };
    case 'action_required':
      return {
        status: 'action_required' as OwnerStripeStatus,
        statusLabel: 'Action required',
        message:
          disabledReason ||
          'Stripe needs updated details before this account can be treated as ready.',
        requirements,
        blockingIssue: disabledReason,
      };
    default:
      return {
        status: 'not_connected' as OwnerStripeStatus,
        statusLabel: 'Not connected',
        message:
          'Connect with Stripe to start verification and prepare this restaurant for future payouts.',
        requirements: [] as string[],
        blockingIssue: null,
      };
  }
}

export async function disconnectRestaurantStripeAccountByStripeAccountId(
  stripeAccountId: string,
  options?: {
    reason?: string | null;
  },
) {
  const existing = await getRestaurantStripeAccountByStripeAccountId(
    stripeAccountId,
  );
  if (!existing) {
    return null;
  }

  const metadata = {
    ...(existing.metadata ?? {}),
    last_disconnect_reason: normalizeNullableString(options?.reason) || null,
    last_disconnected_at: new Date().toISOString(),
  };

  const updated = await adminGraphqlRequest<UpdateRestaurantPaymentAccountResponse>(
    UPDATE_RESTAURANT_PAYMENT_ACCOUNT,
    {
      restaurant_payment_account_id: existing.id,
      changes: {
        stripe_account_id: null,
        connection_mode: null,
        is_connected: false,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
        requirements_currently_due: [],
        requirements_past_due: [],
        requirements_pending_verification: [],
        requirements_disabled_reason: null,
        requirements_due_count: 0,
        pending_verification_count: 0,
        onboarding_status: 'not_connected',
        email: null,
        country: null,
        default_currency: null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata,
      },
    },
  );

  return normalizeRestaurantStripeAccountRow(
    updated.update_restaurant_payment_accounts_by_pk,
  );
}

function buildStripeAccountMutationPayload({
  restaurantId,
  account,
  connectionMode,
  createdByUserId,
  existingMetadata,
}: {
  restaurantId: string;
  account: Stripe.Account;
  connectionMode: StripeConnectionMode | null;
  createdByUserId: string | null;
  existingMetadata: Record<string, unknown> | null;
}) {
  const requirementsCurrentlyDue = normalizeStringArray(
    account.requirements?.currently_due ?? [],
  );
  const requirementsPastDue = normalizeStringArray(
    account.requirements?.past_due ?? [],
  );
  const requirementsPendingVerification = normalizeStringArray(
    account.requirements?.pending_verification ?? [],
  );
  const onboardingStatus = mapOwnerStripeStatus({
    stripeAccountId: account.id,
    detailsSubmitted: account.details_submitted ?? false,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    requirementsCurrentlyDue,
    requirementsPastDue,
    requirementsPendingVerification,
    requirementsDisabledReason: account.requirements?.disabled_reason ?? null,
  });
  const displayName =
    resolveStripeAccountDisplayName(account) ||
    normalizeMetadataString(existingMetadata, 'display_name');
  const contactEmail =
    resolveStripeAccountContactEmail(account) ||
    normalizeMetadataString(existingMetadata, 'support_email') ||
    normalizeMetadataString(existingMetadata, 'account_email');

  return {
    restaurant_id: restaurantId,
    provider: 'stripe',
    stripe_account_id: account.id,
    connection_mode: connectionMode,
    is_connected: true,
    details_submitted: Boolean(account.details_submitted),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    requirements_currently_due: requirementsCurrentlyDue,
    requirements_past_due: requirementsPastDue,
    requirements_pending_verification: requirementsPendingVerification,
    requirements_disabled_reason: normalizeNullableString(
      account.requirements?.disabled_reason,
    ),
    requirements_due_count:
      requirementsCurrentlyDue.length + requirementsPastDue.length,
    pending_verification_count: requirementsPendingVerification.length,
    onboarding_status: onboardingStatus,
    country: normalizeNullableString(account.country),
    email: contactEmail,
    default_currency: normalizeNullableString(account.default_currency),
    livemode: isLiveStripeMode(),
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...(existingMetadata ?? {}),
      display_name: displayName,
      account_email: normalizeNullableString(account.email),
      support_email: normalizeNullableString(account.business_profile?.support_email),
      legal_name: normalizeNullableString(account.company?.name),
      individual_name: resolveStripeIndividualName(account),
      account_type: account.type ?? null,
      dashboard_type:
        account.controller?.stripe_dashboard?.type ??
        existingMetadata?.dashboard_type ??
        null,
    },
    ...(normalizeNullableString(createdByUserId)
      ? { created_by_user_id: normalizeNullableString(createdByUserId) }
      : {}),
  };
}

function normalizeRestaurantStripeAccountRow(
  row: RestaurantPaymentAccountRow | null | undefined,
): RestaurantStripeAccountSnapshot | null {
  const id = normalizeString(row?.restaurant_payment_account_id);
  const restaurantId = normalizeString(row?.restaurant_id);
  const provider = normalizeString(row?.provider);
  if (!id || !restaurantId || provider !== 'stripe') {
    return null;
  }

  const stripeAccountId = normalizeString(row?.stripe_account_id);
  const requirementsCurrentlyDue = normalizeStringArray(
    row?.requirements_currently_due,
  );
  const requirementsPastDue = normalizeStringArray(row?.requirements_past_due);
  const requirementsPendingVerification = normalizeStringArray(
    row?.requirements_pending_verification,
  );
  const metadata = normalizeRecord(row?.metadata);

  return {
    id,
    restaurantId,
    provider: 'stripe',
    stripeAccountId,
    displayName: normalizeMetadataString(metadata, 'display_name'),
    connectionMode:
      normalizeConnectionMode(row?.connection_mode),
    isConnected: Boolean(row?.is_connected) && Boolean(stripeAccountId),
    detailsSubmitted: Boolean(row?.details_submitted),
    chargesEnabled: Boolean(row?.charges_enabled),
    payoutsEnabled: Boolean(row?.payouts_enabled),
    requirementsCurrentlyDue,
    requirementsPastDue,
    requirementsPendingVerification,
    requirementsDisabledReason: normalizeNullableString(
      row?.requirements_disabled_reason,
    ),
    requirementsDueCount: normalizeCount(
      row?.requirements_due_count,
      requirementsCurrentlyDue.length + requirementsPastDue.length,
    ),
    pendingVerificationCount: normalizeCount(
      row?.pending_verification_count,
      requirementsPendingVerification.length,
    ),
    onboardingStatus: normalizeOwnerStripeStatus(
      row?.onboarding_status,
      mapOwnerStripeStatus({
        stripeAccountId,
        detailsSubmitted: Boolean(row?.details_submitted),
        chargesEnabled: Boolean(row?.charges_enabled),
        payoutsEnabled: Boolean(row?.payouts_enabled),
        requirementsCurrentlyDue,
        requirementsPastDue,
        requirementsPendingVerification,
        requirementsDisabledReason: normalizeNullableString(
          row?.requirements_disabled_reason,
        ),
      }),
    ),
    country: normalizeNullableString(row?.country),
    email: normalizeNullableString(row?.email),
    defaultCurrency: normalizeNullableString(row?.default_currency),
    livemode: Boolean(row?.livemode),
    lastSyncedAt: normalizeNullableString(row?.last_synced_at),
    createdAt: normalizeNullableString(row?.created_at),
    updatedAt: normalizeNullableString(row?.updated_at),
    metadata,
  };
}

function resolveStripeAccountDisplayName(account: Stripe.Account) {
  return (
    normalizeNullableString(account.business_profile?.name) ||
    normalizeNullableString(account.company?.name) ||
    resolveStripeIndividualName(account)
  );
}

function resolveStripeAccountContactEmail(account: Stripe.Account) {
  return (
    normalizeNullableString(account.email) ||
    normalizeNullableString(account.business_profile?.support_email) ||
    normalizeNullableString(account.individual?.email)
  );
}

function resolveStripeIndividualName(account: Stripe.Account) {
  const firstName = normalizeNullableString(account.individual?.first_name);
  const lastName = normalizeNullableString(account.individual?.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || null;
}

function normalizeOwnerStripeStatus(
  value: unknown,
  fallback: OwnerStripeStatus,
): OwnerStripeStatus {
  switch (normalizeString(value)) {
    case 'not_connected':
    case 'setup_incomplete':
    case 'active':
    case 'action_required':
      return normalizeString(value) as OwnerStripeStatus;
    default:
      return fallback;
  }
}

function normalizeConnectionMode(value: unknown): StripeConnectionMode | null {
  switch (normalizeString(value)) {
    case 'hosted_onboarding':
    case 'existing_account_oauth':
      return normalizeString(value) as StripeConnectionMode;
    default:
      return null;
  }
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  return normalizeNullableString(metadata?.[key]);
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNullableString(value: unknown) {
  return normalizeString(value) || null;
}

function normalizeCount(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  return fallback;
}

function isLiveStripeMode() {
  return (process.env.STRIPE_SECRET_KEY || '').trim().startsWith('sk_live_');
}
