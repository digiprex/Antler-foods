import { NextRequest, NextResponse } from 'next/server';
import { RouteError, requireRestaurantAccess } from '@/lib/server/api-auth';
import {
  buildOwnerStripeStatusSummary,
  syncRestaurantStripeAccountByRestaurantId,
  type RestaurantStripeAccountSnapshot,
} from '@/lib/server/restaurant-stripe-accounts';

export async function POST(
  request: NextRequest,
  context: { params: { restaurantId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    await requireRestaurantAccess(request, restaurantId);
    const account = await syncRestaurantStripeAccountByRestaurantId(restaurantId);

    return NextResponse.json({
      success: true,
      data: serializeStripeAccountPayload(account),
      message: account
        ? 'Stripe status refreshed successfully.'
        : 'Stripe is not connected for this restaurant yet.',
    });
  } catch (caughtError) {
    return handleRouteError(
      caughtError,
      'Failed to refresh Stripe account status.',
    );
  }
}

function serializeStripeAccountPayload(
  account: RestaurantStripeAccountSnapshot | null,
) {
  const summary = buildOwnerStripeStatusSummary(account);

  return {
    provider: 'stripe',
    status: summary.status,
    status_label: summary.statusLabel,
    message: summary.message,
    blocking_issue: summary.blockingIssue,
    can_connect_existing_account:
      summary.status === 'not_connected' &&
      Boolean(process.env.STRIPE_CONNECT_CLIENT_ID?.trim()),
    can_launch_onboarding:
      summary.status === 'not_connected' ||
      summary.status === 'setup_incomplete' ||
      summary.status === 'action_required',
    primary_action_label:
      summary.status === 'not_connected'
        ? 'Connect with Stripe'
        : summary.status === 'setup_incomplete'
          ? 'Complete Stripe setup'
          : summary.status === 'action_required'
            ? 'Update required details'
            : null,
    account: account
      ? {
          stripe_account_id: account.stripeAccountId,
          display_name: account.displayName,
          is_connected: account.isConnected,
          details_submitted: account.detailsSubmitted,
          charges_enabled: account.chargesEnabled,
          payouts_enabled: account.payoutsEnabled,
          country: account.country,
          email: account.email,
          default_currency: account.defaultCurrency,
          last_synced_at: account.lastSyncedAt,
          onboarding_status: account.onboardingStatus,
          connection_mode: account.connectionMode,
          requirements: {
            currently_due: account.requirementsCurrentlyDue,
            past_due: account.requirementsPastDue,
            pending_verification: account.requirementsPendingVerification,
            disabled_reason: account.requirementsDisabledReason,
            due_count: account.requirementsDueCount,
            pending_verification_count: account.pendingVerificationCount,
          },
        }
      : null,
  };
}

function handleRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof RouteError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? mapSchemaErrorMessage(error.message) : fallbackMessage;

  return NextResponse.json(
    { success: false, error: message || fallbackMessage },
    { status: 500 },
  );
}

function mapSchemaErrorMessage(message: string) {
  if (message.includes('restaurant_payment_accounts')) {
    return 'Stripe Connect schema is not available yet. Apply the Bank Accounts SQL script and track the table in Hasura first.';
  }

  return message;
}
