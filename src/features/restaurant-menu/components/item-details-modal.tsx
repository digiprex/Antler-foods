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
  const isSingleSelect = group.isMultiSelect !== true;
  const minRequired = group.isRequired
    ? Math.max(group.minSelection ?? 1, 1)
    : Math.max(group.minSelection ?? 0, 0);
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

    return [group.items[0].id];
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
  onClose,
  onAddToCart,
}: ItemDetailsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const modifierGroups = item ? getDisplayModifierGroups(item) : [];
  const modifierOptions = modifierGroups.flatMap((group) => group.items);

  useEffect(() => {
    if (!item || !open) {
      return;
    }

    const nextModifierGroups = getDisplayModifierGroups(item);

    setQuantity(1);
    setNotes('');
    setSelectedAddOnIds(getDefaultSelectedAddOnIds(nextModifierGroups));
  }, [item, open]);

  if (!item) {
    return null;
  }

  const selectedAddOns = modifierOptions.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const totalPrice = (item.price + addOnTotal) * quantity;
  const invalidGroups = modifierGroups.filter((group) => {
    const selectedCount = getSelectedItemsForGroup(group, selectedAddOnIds).length;
    const { minRequired, maxAllowed } = getGroupConstraints(group);

    return selectedCount < minRequired || selectedCount > maxAllowed;
  });
  const canAddToCart = invalidGroups.length === 0;

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
      maxWidthClassName="max-w-3xl"
      panelClassName="border border-stone-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
    >
      <div className="flex max-h-[88vh] flex-col overflow-hidden bg-white">
        <div className="overflow-y-auto">
          <div className="overflow-hidden border-b border-stone-200 bg-stone-50">
            <div className="flex items-center justify-center px-4 py-4 sm:px-5 sm:py-5">
              <img
                src={item.image}
                alt={item.name}
                loading="eager"
                decoding="async"
                className="max-h-[220px] w-auto max-w-full object-contain sm:max-h-[280px]"
              />
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                {typeof item.likes === 'number' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 font-medium text-stone-700">
                    <HeartIcon className="h-3.5 w-3.5" />
                    {item.likes} likes
                  </span>
                ) : null}
                {typeof item.points === 'number' && item.points > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 font-medium text-stone-700">
                    <StarIcon className="h-3.5 w-3.5 fill-current" />
                    Earn {item.points} points
                  </span>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <h2 className="pr-10 text-2xl font-semibold tracking-tight text-stone-950 sm:text-[2rem]">
                  {item.name}
                </h2>
                <p className="text-base font-semibold text-stone-900">
                  {formatPrice(item.price)}
                </p>
                {item.description ? (
                  <p className="max-w-2xl text-sm leading-6 text-stone-600">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[18px] border border-stone-200 bg-stone-50 px-3.5 py-3 text-xs font-medium text-stone-700">
              <span className="inline-flex items-center gap-2">
                <ShieldIcon className="h-3.5 w-3.5" />
                {trustBanner}
              </span>
            </div>

            {modifierGroups.length ? (
              <div className="rounded-[20px] border border-stone-200 bg-white p-3.5 shadow-sm sm:p-4">
                <div className="mb-3.5 flex flex-col gap-2 border-b border-stone-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">
                      Customize your order
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      Required groups start with one option selected. Review each group before adding this item.
                    </p>
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
                        className="rounded-[16px] border border-stone-200 bg-white p-3 sm:p-3.5"
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
                              <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-700">
                                {isSingleSelect ? 'Single Select' : 'Multi Select'}
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

                        <p className={`mt-3 text-xs leading-5 ${isGroupValid ? 'text-stone-500' : 'font-medium text-rose-600'}`}>
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
                                className={`flex w-full items-center justify-between gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 sm:mr-auto sm:w-[88%] ${
                                  isSelected
                                    ? 'border-stone-900 bg-stone-50 shadow-sm'
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
            ) : null}


          </div>
        </div>

        <div className="border-t border-stone-200 bg-white px-3.5 py-2.5 sm:px-4">
          <div className="mb-2 min-h-[1rem] text-xs sm:text-sm">
            {invalidGroups.length ? (
              <p className="font-medium text-rose-600">
                {invalidGroups[0].name}: {getGroupInstruction(invalidGroups[0], getSelectedItemsForGroup(invalidGroups[0], selectedAddOnIds).length)}
              </p>
            ) : modifierGroups.length ? (
              <p className="text-stone-500">
                {selectedAddOns.length} modifier option{selectedAddOns.length === 1 ? '' : 's'} selected.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <QuantityStepper
              quantity={quantity}
              onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
              onIncrease={() => setQuantity((current) => current + 1)}
            />
            <button
              type="button"
              disabled={!canAddToCart}
              onClick={() => {
                if (!canAddToCart) {
                  return;
                }

                onAddToCart({
                  item,
                  quantity,
                  notes,
                  selectedAddOns,
                });
                onClose();
              }}
              className="flex h-10 w-full items-center justify-between rounded-[16px] bg-stone-900 px-4 text-sm font-semibold text-stone-50 shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none sm:w-auto sm:min-w-[240px]"
            >
              <span>Add to cart</span>
              <span>{formatPrice(totalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
