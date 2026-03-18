'use client';

import { useEffect, useState } from 'react';
import { HeartIcon, PlusIcon, ShieldIcon, StarIcon } from '@/features/restaurant-menu/components/icons';
import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';
import { QuantityStepper } from '@/features/restaurant-menu/components/quantity-stepper';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type {
  AddCartItemInput,
  MenuAddOn,
  MenuItem,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface ItemDetailsModalProps {
  item: MenuItem | null;
  open: boolean;
  trustBanner: string;
  onClose: () => void;
  onAddToCart: (input: AddCartItemInput) => void;
}

export function ItemDetailsModal({
  item,
  open,
  trustBanner,
  onClose,
  onAddToCart,
}: ItemDetailsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  useEffect(() => {
    if (!item || !open) {
      return;
    }

    setQuantity(1);
    setNotes('');
    setSelectedAddOnIds(
      (item.addOns || [])
        .filter((addOn) => addOn.required)
        .map((addOn) => addOn.id),
    );
  }, [item, open]);

  if (!item) {
    return null;
  }

  const selectedAddOns = (item.addOns || []).filter((addOn) =>
    selectedAddOnIds.includes(addOn.id),
  );
  const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const totalPrice = (item.price + addOnTotal) * quantity;

  const toggleAddOn = (addOn: MenuAddOn) => {
    setSelectedAddOnIds((currentIds) => {
      const alreadySelected = currentIds.includes(addOn.id);

      if (alreadySelected && addOn.required) {
        return currentIds;
      }

      if (alreadySelected) {
        return currentIds.filter((id) => id !== addOn.id);
      }

      return [...currentIds, addOn.id];
    });
  };

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-4xl">
      <div className="flex max-h-[92vh] flex-col overflow-hidden">
        <div className="overflow-y-auto">
          <div className="overflow-hidden border-b border-black/5 bg-[#f4f1ec]">
            <img src={item.image} alt={item.name} className="h-72 w-full object-cover sm:h-96" />
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8">
            <div className="space-y-3">
              <h2 className="pr-12 text-3xl font-semibold tracking-tight text-slate-950">
                {item.name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="text-lg font-semibold text-slate-950">
                  {formatPrice(item.price)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <HeartIcon className="h-4 w-4" />
                  {item.likes}
                </span>
              </div>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                {item.description}
              </p>
            </div>

            <div className="rounded-2xl bg-[#d9d5d2] px-4 py-3 text-center text-sm font-semibold text-slate-950">
              <span className="inline-flex items-center gap-2">
                <StarIcon className="h-4 w-4 fill-current" />
                EARN {item.points} POINTS
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-900">
              <span className="inline-flex items-center gap-2">
                <ShieldIcon className="h-4 w-4" />
                {trustBanner}
              </span>
            </div>

            <div className="rounded-[24px] bg-[#f7f5f1] p-5">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                Special notes:
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                We'll try our best to accommodate requests, but can't make changes that affect pricing.
              </p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add special request"
                className="mt-4 min-h-[140px] w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-black/10"
              />
            </div>

            {item.addOns?.length ? (
              <div className="rounded-[24px] bg-[#f7f5f1] p-5">
                <div className="mb-4">
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Goes well with
                  </h3>
                  <p className="text-sm text-slate-500">
                    {item.addOns.some((addOn) => addOn.required) ? 'Required' : 'Optional pairings'}
                  </p>
                </div>
                <div className="space-y-3">
                  {item.addOns.map((addOn) => {
                    const isSelected = selectedAddOnIds.includes(addOn.id);

                    return (
                      <div
                        key={addOn.id}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={addOn.image}
                            alt={addOn.name}
                            className="h-12 w-12 rounded-2xl object-cover"
                          />
                          <div>
                            <p className="font-semibold text-slate-950">{addOn.name}</p>
                            <p className="text-sm text-slate-500">+ {formatPrice(addOn.price)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleAddOn(addOn)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                            isSelected
                              ? 'bg-black text-white'
                              : 'border border-black/10 bg-white text-slate-900 hover:border-black/20'
                          }`}
                          aria-pressed={isSelected}
                        >
                          <PlusIcon className={`h-4 w-4 transition ${isSelected ? 'rotate-45' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-black/5 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityStepper
              quantity={quantity}
              onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
              onIncrease={() => setQuantity((current) => current + 1)}
            />
            <button
              type="button"
              onClick={() => {
                onAddToCart({
                  item,
                  quantity,
                  notes,
                  selectedAddOns,
                });
                onClose();
              }}
              className="flex h-14 flex-1 items-center justify-between rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              <span>Add To Cart</span>
              <span>{formatPrice(totalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
