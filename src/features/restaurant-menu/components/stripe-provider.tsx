'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface StripePaymentProviderProps {
  clientSecret: string;
  children: React.ReactNode;
}

export function StripePaymentProvider({
  clientSecret,
  children,
}: StripePaymentProviderProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      {children}
    </Elements>
  );
}
