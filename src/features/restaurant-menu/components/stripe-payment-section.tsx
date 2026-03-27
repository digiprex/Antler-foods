'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';

interface StripePaymentSectionProps {
  total: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export function StripePaymentSection({
  total,
  onSuccess,
  onError,
  onProcessingChange,
}: StripePaymentSectionProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const updateProcessing = (value: boolean) => {
    setIsProcessing(value);
    onProcessingChange?.(value);
  };

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    updateProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/menu/checkout/success',
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment failed. Please try again.');
      updateProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
        Payment
      </h2>
      <PaymentElement />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || isProcessing}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-black text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:h-12 sm:max-w-[280px]"
      >
        {isProcessing ? 'Processing payment...' : `Pay ${formatPrice(total)}`}
      </button>
    </section>
  );
}
