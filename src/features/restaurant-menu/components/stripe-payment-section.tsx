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
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

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
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <PaymentElement
          onChange={(event) => setIsPaymentComplete(event.complete)}
        />
      </div>
      <div className="shrink-0 border-t border-stone-200 px-6 py-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!stripe || !isPaymentComplete || isProcessing}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 active:scale-[0.98]"
        >
          {isProcessing ? 'Processing payment...' : `Pay ${formatPrice(total)}`}
        </button>
      </div>
    </>
  );
}
