'use client';

import { useEffect, useState } from 'react';
import { HeartIcon, ShieldIcon, StarIcon } from '@/features/restaurant-menu/components/icons';
import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';
import { QuantityStepper } from '@/features/restaurant-menu/components/quantity-stepper';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type {
  AddCartItemInput,
  MenuAddOn,
  MenuItem,
  MenuModifierGroup,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface ItemDetailsModalProps {
  item: MenuItem | null;
  open: boolean;
  trustBanner: string;
  addToCartDisabled?: boolean;
  onClose: () => void;
  onAddToCart: (input: AddCartItemInput) => void;
}

function getDisplayModifierGroups(item: MenuItem): MenuModifierGroup[] {
  if (item.modifierGroups?.length) {
    return item.modifierGroups;
  }

  if (item.addOns?.length) {
    const hasRequiredOptions = item.addOns.some((addOn) => addOn.required);

    return [
      {
        id: 'default-modifiers',
        name: 'Available options',
        isRequired: hasRequiredOptions,
        isMultiSelect: true,
        minSelection: hasRequiredOptions ? 1 : undefined,
        maxSelection: item.addOns.length,
        items: item.addOns,
      },
    ];
  }

  return [];
}

function getGroupConstraints(group: MenuModifierGroup) {
  const minRequired = group.isRequired
    ? Math.max(group.minSelection ?? 1, 1)
    : Math.max(group.minSelection ?? 0, 0);
  // If minRequired > 1 the user must pick multiple, so treat as multi-select
  const isSingleSelect = minRequired <= 1 && group.isMultiSelect !== true;
  const resolvedMax = isSingleSelect ? 1 : group.maxSelection ?? group.items.length;
  const maxAllowed = Math.max(resolvedMax, minRequired || 1);

  return {
    isSingleSelect,
    minRequired,
    maxAllowed,
  };
}

function getDefaultSelectedAddOnIds(groups: MenuModifierGroup[]) {
  return groups.flatMap((group) => {
    if (!group.isRequired || group.items.length === 0) {
      return [];
    }

    const { minRequired } = getGroupConstraints(group);
    const count = Math.min(minRequired, group.items.length);
    return group.items.slice(0, count).map((item) => item.id);
  });
}

function getSelectedItemsForGroup(group: MenuModifierGroup, selectedIds: string[]) {
  return group.items.filter((item) => selectedIds.includes(item.id));
}

function getGroupSelectionLabel(group: MenuModifierGroup, selectedCount: number) {
  const { isSingleSelect, maxAllowed } = getGroupConstraints(group);

  if (isSingleSelect) {
    return selectedCount > 0 ? '1 selected' : 'No selection';
  }

  return `${selectedCount}/${maxAllowed} selected`;
}

function getGroupInstruction(group: MenuModifierGroup, selectedCount: number) {
  const { isSingleSelect, minRequired, maxAllowed } = getGroupConstraints(group);

  if (selectedCount < minRequired) {
    return `Select at least ${minRequired} option${minRequired === 1 ? '' : 's'}.`;
  }

  if (selectedCount > maxAllowed) {
    return `Select no more than ${maxAllowed} option${maxAllowed === 1 ? '' : 's'}.`;
  }

  if (isSingleSelect) {
    return group.isRequired
      ? 'One option is preselected. Choose another option if you prefer.'
      : 'Choose one option or leave this group unselected.';
  }

  if (group.isRequired) {
    return maxAllowed === minRequired
      ? `Choose ${minRequired} option${minRequired === 1 ? '' : 's'} in this group.`
      : `One option is preselected. Choose up to ${maxAllowed} options.`;
  }

  return maxAllowed === group.items.length
    ? 'Select any options you want from this group.'
    : `Choose up to ${maxAllowed} options.`;
}

export function ItemDetailsModal({
  item,
  open,
  trustBanner,
  addToCartDisabled = false,
  onClose,
  onAddToCart,
}: ItemDetailsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const variants = item?.variants || [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ||
    variants[0] ||
    null;
  const itemForCart = selectedVariant || item;
  const modifierGroups = itemForCart ? getDisplayModifierGroups(itemForCart) : [];
  const modifierOptions = modifierGroups.flatMap((group) => group.items);

  useEffect(() => {
    if (!item || !open) {
      return;
    }

    const defaultVariantId = item.variants?.[0]?.id || null;
    const defaultItem = item.variants?.[0] || item;
    const nextModifierGroups = getDisplayModifierGroups(defaultItem);

    setQuantity(1);
    setNotes('');
    setSelectedVariantId(defaultVariantId);
    setSelectedAddOnIds(getDefaultSelectedAddOnIds(nextModifierGroups));
  }, [item, open]);

  useEffect(() => {
    if (!itemForCart || !open) {
      return;
    }

    setSelectedAddOnIds(getDefaultSelectedAddOnIds(getDisplayModifierGroups(itemForCart)));
  }, [itemForCart, open]);

  if (!item) {
    return null;
  }

  const selectedAddOns = modifierOptions.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const totalPrice = ((itemForCart?.price || 0) + addOnTotal) * quantity;
  const invalidGroups = modifierGroups.filter((group) => {
    const selectedCount = getSelectedItemsForGroup(group, selectedAddOnIds).length;
    const { minRequired, maxAllowed } = getGroupConstraints(group);

    return selectedCount < minRequired || selectedCount > maxAllowed;
  });
  const canAddToCart = invalidGroups.length === 0;
  const addToCartBlocked = addToCartDisabled || !canAddToCart;

  const toggleAddOn = (group: MenuModifierGroup, addOn: MenuAddOn) => {
    setSelectedAddOnIds((currentIds) => {
      const currentSelectedItems = getSelectedItemsForGroup(group, currentIds);
      const currentSelectedIds = currentSelectedItems.map((item) => item.id);
      const { isSingleSelect, minRequired, maxAllowed } = getGroupConstraints(group);
      const alreadySelected = currentSelectedIds.includes(addOn.id);

      if (alreadySelected) {
        if (currentSelectedIds.length <= minRequired) {
          return currentIds;
        }

        return currentIds.filter((id) => id !== addOn.id);
      }

      if (isSingleSelect) {
        const groupItemIds = new Set(group.items.map((groupItem) => groupItem.id));
        return [...currentIds.filter((id) => !groupItemIds.has(id)), addOn.id];
      }

      if (currentSelectedIds.length >= maxAllowed) {
        return currentIds;
      }

      return [...currentIds, addOn.id];
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      panelClassName="border border-stone-200 bg-white shadow-[0_28px_72px_rgba(15,23,42,0.16)]"
      showTopGlow={false}
    >
      <div className="flex max-h-[88vh] flex-col overflow-hidden bg-white">
        <div className="overflow-y-auto">
          {(item.image || itemForCart?.image) ? (
            <div className="relative overflow-hidden border-b border-stone-200 bg-stone-100">
              <img
                src={item.image || itemForCart?.image}
                alt={itemForCart?.name || item.name}
                loading="eager"
                decoding="async"
                className="h-[200px] w-full object-cover sm:h-[260px]"
              />
            </div>
          ) : null}

          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                {typeof item.likes === 'number' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 font-medium text-stone-700">
                    <HeartIcon className="h-3.5 w-3.5" />
                    {item.likes} likes
                  </span>
                ) : null}
                {typeof item.points === 'number' && item.points > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 font-medium text-stone-700">
                    <StarIcon className="h-3.5 w-3.5 fill-current" />
                    Earn {item.points} points
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <h2 className="pr-10 text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">
                  {itemForCart?.name || item.name}
                </h2>
                <p className="text-sm font-semibold text-stone-900 sm:text-base">
                  {formatPrice(itemForCart?.price || item.price)}
                </p>
                {itemForCart?.description ? (
                  <p className="text-sm leading-6 text-stone-600">
                    {itemForCart.description}
                  </p>
                ) : null}
              </div>
            </div>

            {variants.length ? (
              <div className="rounded-[20px] border border-stone-200 bg-stone-50/70 p-3.5 shadow-sm sm:p-4">
                <div className="mb-3 border-b border-stone-200 pb-2.5">
                  <h3 className="text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">
                    Choose a variant
                  </h3>
                </div>
                <div className="space-y-2">
                  {variants.map((variant) => {
                    const isSelected = variant.id === (selectedVariant?.id || '');

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`flex w-full items-center justify-between rounded-[14px] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                          isSelected
                            ? 'border-stone-900/90 bg-white shadow-sm'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-stone-950">{variant.name}</p>
                          {variant.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{variant.description}</p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-stone-900">{formatPrice(variant.price)}</p>
                          {isSelected ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">Selected</p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {trustBanner.trim() ? (
              <div className="rounded-[18px] border border-stone-200 bg-stone-50 px-3.5 py-3 text-xs font-medium text-stone-700">
                <span className="inline-flex items-center gap-2">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  {trustBanner}
                </span>
              </div>
            ) : null}

            {modifierGroups.length ? (
              <div className="rounded-[20px] border border-stone-200 bg-stone-50/70 p-3.5 shadow-sm sm:p-4">
                <div className="mb-3.5 flex flex-col gap-2 border-b border-stone-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">
                      Customize your order
                    </h3>
                    {variants.length && itemForCart ? (
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-500">
                        Variant: {itemForCart.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold text-stone-700">
                    {selectedAddOns.length} option{selectedAddOns.length === 1 ? '' : 's'} selected
                  </div>
                </div>

                <div className="space-y-3">
                  {modifierGroups.map((group) => {
                    const { isSingleSelect, maxAllowed } = getGroupConstraints(group);
                    const selectedItems = getSelectedItemsForGroup(group, selectedAddOnIds);
                    const selectedCount = selectedItems.length;
                    const helperText = getGroupInstruction(group, selectedCount);
                    const isGroupValid = !invalidGroups.some((invalidGroup) => invalidGroup.id === group.id);

                    return (
                      <section
                        key={group.id}
                        className="rounded-[16px] border border-stone-200 bg-white p-3 shadow-sm sm:p-3.5"
                      >
                        <div className="flex flex-col gap-2 border-b border-stone-200 pb-2.5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-semibold text-stone-950 sm:text-lg">
                                {group.name}
                              </h4>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                                group.isRequired
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {group.isRequired ? 'Required' : 'Optional'}
                              </span>
                              <span className="menu-selection-chip">
                                {isSingleSelect ? 'Choose one' : 'Choose multiple'}
                              </span>
                            </div>
                            {group.description ? (
                              <p className="mt-1.5 text-xs leading-5 text-stone-500">
                                {group.description}
                              </p>
                            ) : null}
                          </div>
                          <span className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                            {getGroupSelectionLabel(group, selectedCount)}
                          </span>
                        </div>

                        <p className={`mt-3 rounded-[10px] px-2.5 py-1.5 text-xs leading-5 ${isGroupValid ? 'bg-stone-50 text-stone-500' : 'bg-rose-50 font-medium text-rose-600'}`}>
                          {helperText}
                        </p>

                        <div className="mt-2.5 space-y-2" role={isSingleSelect ? 'radiogroup' : 'group'} aria-label={group.name}>
                          {group.items.map((addOn) => {
                            const isSelected = selectedAddOnIds.includes(addOn.id);
                            const isDisabled = !isSingleSelect && !isSelected && selectedCount >= maxAllowed;

                            return (
                              <button
                                key={addOn.id}
                                type="button"
                                onClick={() => toggleAddOn(group, addOn)}
                                disabled={isDisabled}
                                role={isSingleSelect ? 'radio' : 'checkbox'}
                                aria-checked={isSelected}
                                className={`flex w-full items-center justify-between gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                                  isSelected
                                    ? 'border-stone-900/90 bg-stone-50 shadow-sm'
                                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                                } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <span
                                    className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                                      isSingleSelect ? 'rounded-full' : 'rounded-[5px]'
                                    } ${
                                      isSelected
                                        ? 'border-stone-900 bg-stone-900'
                                        : 'border-stone-300 bg-white'
                                    }`}
                                  >
                                    {isSelected ? (
                                      <span
                                        className={`${
                                          isSingleSelect ? 'h-1.5 w-1.5 rounded-full' : 'h-1.5 w-1.5 rounded-[2px]'
                                        } bg-white`}
                                      />
                                    ) : null}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-stone-950">
                                        {addOn.name}
                                      </p>
                                      {isSelected ? (
                                        <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-700">
                                          Selected
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1 text-xs text-stone-500">
                                      {addOn.price > 0 ? `+ ${formatPrice(addOn.price)}` : 'Included'}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : variants.length && itemForCart ? (
              <div className="rounded-[20px] border border-stone-200 bg-stone-50/70 p-3.5 shadow-sm sm:p-4">
                <h3 className="text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">
                  Customize your order
                </h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-500">
                  Variant: {itemForCart.name}
                </p>
                <p className="mt-3 text-sm text-stone-600">
                  No customization options available for this variant.
                </p>
              </div>
            ) : null}


          </div>
        </div>

        <div className="border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          {item.inStock === false ? (
            <div className="flex h-10 items-center justify-center rounded-[14px] bg-stone-200 text-sm font-semibold text-stone-500">
              Sold out
            </div>
          ) : (
            <>
              {(addToCartDisabled || invalidGroups.length > 0 || modifierGroups.length > 0) ? (
                <div className="mb-2.5 text-xs sm:text-sm">
                  {addToCartDisabled ? (
                    <p className="font-medium text-rose-600">
                      Ordering is currently unavailable for this restaurant.
                    </p>
                  ) : invalidGroups.length ? (
                    <p className="font-medium text-rose-600">
                      {invalidGroups[0].name}: {getGroupInstruction(invalidGroups[0], getSelectedItemsForGroup(invalidGroups[0], selectedAddOnIds).length)}
                    </p>
                  ) : (
                    <p className="text-stone-500">
                      {selectedAddOns.length} modifier option{selectedAddOns.length === 1 ? '' : 's'} selected.
                    </p>
                  )}
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <QuantityStepper
                  quantity={quantity}
                  onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
                  onIncrease={() => setQuantity((current) => current + 1)}
                />
                <button
                  type="button"
                  disabled={addToCartBlocked}
                  onClick={() => {
                    if (addToCartBlocked) {
                      return;
                    }

                    onAddToCart({
                      item: itemForCart || item,
                      parentName: selectedVariant && item.name !== selectedVariant.name ? item.name : undefined,
                      quantity,
                      notes,
                      selectedAddOns,
                    });
                    onClose();
                  }}
                  className="flex h-10 flex-1 items-center justify-between rounded-[14px] bg-stone-900 px-4 text-sm font-semibold text-stone-50 shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
                >
                  <span>Add to cart</span>
                  <span>{formatPrice(totalPrice)}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
