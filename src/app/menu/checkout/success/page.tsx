import { Suspense } from 'react';
import MenuCheckoutSuccessContent from './success-content';

export default function MenuCheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)]">
          <p className="text-sm text-stone-500">Loading order details...</p>
        </div>
      }
    >
      <MenuCheckoutSuccessContent />
    </Suspense>
  );
}
