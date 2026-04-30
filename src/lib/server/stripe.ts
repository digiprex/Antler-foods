import 'server-only';

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

export interface StripeTaxInput {
  lineItems: Array<{ amount: number; reference?: string }>;
  customerAddress: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingCost?: number;
}

export interface StripeTaxResult {
  taxAmountCents: number;
  taxAmount: number;
  error?: string;
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  canada: 'CA',
  mexico: 'MX',
  'united kingdom': 'GB',
  australia: 'AU',
  india: 'IN',
};

function normalizeCountryCode(value?: string | null): string {
  if (!value) return 'US';
  const trimmed = value.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()] || 'US';
}

export async function calculateStripeTax(
  input: StripeTaxInput,
): Promise<StripeTaxResult | null> {
  try {
    const stripe = getStripe();
    const countryCode = normalizeCountryCode(input.customerAddress.country);
    const calculation = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: input.lineItems.map((item) => ({
        amount: item.amount,
        reference: item.reference,
        tax_behavior: 'exclusive' as const,
        tax_code: 'txcd_40060003',
      })),
      customer_details: {
        address: {
          line1: input.customerAddress.line1 || '',
          line2: input.customerAddress.line2 || undefined,
          city: input.customerAddress.city || '',
          state: input.customerAddress.state || '',
          postal_code: input.customerAddress.postalCode || '',
          country: countryCode,
        },
        address_source: 'shipping',
      },
      ...(input.shippingCost && input.shippingCost > 0
        ? {
            shipping_cost: {
              amount: input.shippingCost,
              tax_behavior: 'exclusive' as const,
              tax_code: 'txcd_92010001',
            },
          }
        : {}),
    });

    return {
      taxAmountCents: calculation.tax_amount_exclusive,
      taxAmount: calculation.tax_amount_exclusive / 100,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Stripe Tax] Calculation failed:', msg);
    return { taxAmountCents: 0, taxAmount: 0, error: msg };
  }
}
