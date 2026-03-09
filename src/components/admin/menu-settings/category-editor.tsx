'use client';

import { useEffect, useRef, useState } from 'react';
import type { MenuCategory, MenuConfig, MenuItem } from '@/types/menu.types';

type MenuLayoutValue = NonNullable<MenuConfig['layout']>;

export interface CategoryEditorCopy {
  sectionTitle: string;
  sectionDescription: string;
  addCategoryLabel: string;
  categoryLabel: string;
  removeCategoryLabel: string;
  categoryNameLabel: string;
  categoryNamePlaceholder: string;
  categoryIconLabel: string;
  categoryIconPlaceholder: string;
  categoryDescriptionLabel: string;
  categoryDescriptionPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  addFirstItemLabel: string;
}

interface CategoryDrivenLayoutEditorProps {
  currentLayout: MenuLayoutValue;
  activeLayoutName: string;
  categories: MenuCategory[];
  totalItems: number;
  totalItemImages: number;
  copy: CategoryEditorCopy;
  onAddCategory: () => void;
  onUpdateCategory: (index: number, updates: Partial<MenuCategory>) => void;
  onRemoveCategory: (index: number) => void;
  onAddItem: (categoryIndex: number) => void;
  onUpdateItem: (
    categoryIndex: number,
    itemIndex: number,
    updates: Partial<MenuItem>,
  ) => void;
  onRemoveItem: (categoryIndex: number, itemIndex: number) => void;
  onOpenItemImage: (categoryIndex: number, itemIndex: number) => void;
}

function getSectionHelperText(layout: MenuLayoutValue, layoutName: string) {
  if (layout === 'accordion') {
    return 'Each section becomes one accordion row in the live layout.';
  }

  if (layout === 'tabs') {
    return 'Each group becomes one tab with its own item panel.';
  }

  return `Categories are especially important for ${layoutName.toLowerCase()}.`;
}

function getItemSummary(item: MenuItem) {
  const parts = [item.description?.trim(), item.price?.trim()]
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.join(' · ');
  }

  return 'Add a short description, price, and image for a stronger preview.';
}

export function CategoryDrivenLayoutEditor({
  currentLayout,
  activeLayoutName,
  categories,
  totalItems,
  totalItemImages,
  copy,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onOpenItemImage,
}: CategoryDrivenLayoutEditorProps) {
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(
    categories.length > 0 ? 0 : null,
  );
  const [openItemsByCategory, setOpenItemsByCategory] = useState<
    Record<number, number | null>
  >({});
  const previousCategoryCount = useRef(categories.length);

  useEffect(() => {
    if (categories.length > previousCategoryCount.current) {
      setOpenCategoryIndex(categories.length - 1);
    } else if (categories.length === 0) {
      setOpenCategoryIndex(null);
    } else if (
      openCategoryIndex === null ||
      openCategoryIndex >= categories.length
    ) {
      setOpenCategoryIndex(0);
    }

    previousCategoryCount.current = categories.length;
  }, [categories.length, openCategoryIndex]);

  useEffect(() => {
    setOpenItemsByCategory((previous) => {
      const next: Record<number, number | null> = {};

      categories.forEach((category, categoryIndex) => {
        const previousOpen = previous[categoryIndex];
        const itemCount = (category.items || []).length;

        if (itemCount === 0) {
          next[categoryIndex] = null;
          return;
        }

        if (
          typeof previousOpen === 'number' &&
          previousOpen >= 0 &&
          previousOpen < itemCount
        ) {
          next[categoryIndex] = previousOpen;
          return;
        }

        next[categoryIndex] =
          openCategoryIndex === categoryIndex || itemCount === 1 ? 0 : null;
      });

      return next;
    });
  }, [categories, openCategoryIndex]);

  const toggleCategory = (categoryIndex: number) => {
    setOpenCategoryIndex((previous) =>
      previous === categoryIndex ? null : categoryIndex,
    );
  };

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    setOpenItemsByCategory((previous) => ({
      ...previous,
      [categoryIndex]:
        previous[categoryIndex] === itemIndex ? null : itemIndex,
    }));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {copy.sectionTitle}
            </h2>
            <p className="text-sm text-gray-600">{copy.sectionDescription}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddCategory}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 sm:w-auto"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {copy.addCategoryLabel}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Categories', value: categories.length },
          { label: 'Items', value: totalItems },
          { label: 'Items With Images', value: totalItemImages },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              {stat.label}
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-gray-900">
            {copy.emptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            {copy.emptyDescription}
          </p>
          <button
            type="button"
            onClick={onAddCategory}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-purple-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            {copy.addCategoryLabel}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {categories.map((category, categoryIndex) => {
            const itemCount = (category.items || []).length;
            const imageCount = (category.items || []).filter((item) =>
              Boolean(item.image),
            ).length;
            const featuredCount = (category.items || []).filter((item) =>
              Boolean(item.featured),
            ).length;
            const isOpen = openCategoryIndex === categoryIndex;

            return (
              <div
                key={`${category.name}-${categoryIndex}`}
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <button
                      type="button"
                      onClick={() => toggleCategory(categoryIndex)}
                      className="flex-1 text-left"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                        {copy.categoryLabel} {categoryIndex + 1}
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {category.name?.trim() || `Untitled ${copy.categoryLabel}`}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-gray-500">
                            {category.description?.trim() ||
                              getSectionHelperText(
                                currentLayout,
                                activeLayoutName,
                              )}
                          </p>
                        </div>
                        <span className="inline-flex h-9 w-9 items-center justify-center self-start rounded-full border border-gray-200 bg-white text-base font-semibold text-gray-700 shadow-sm">
                          {isOpen ? '−' : '+'}
                        </span>
                      </div>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategory(categoryIndex)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        {isOpen ? 'Collapse' : 'Edit Section'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAddItem(categoryIndex);
                          setOpenCategoryIndex(categoryIndex);
                        }}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                      >
                        Add Item
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveCategory(categoryIndex)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        {copy.removeCategoryLabel}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      `${itemCount} item${itemCount === 1 ? '' : 's'}`,
                      `${imageCount} image${imageCount === 1 ? '' : 's'}`,
                      `${featuredCount} featured`,
                    ].map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-6 px-4 py-5 sm:px-5">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {copy.categoryNameLabel}
                        </label>
                        <input
                          type="text"
                          value={category.name || ''}
                          onChange={(event) =>
                            onUpdateCategory(categoryIndex, {
                              name: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={copy.categoryNamePlaceholder}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {copy.categoryIconLabel}
                        </label>
                        <input
                          type="text"
                          value={category.icon || ''}
                          onChange={(event) =>
                            onUpdateCategory(categoryIndex, {
                              icon: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={copy.categoryIconPlaceholder}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {copy.categoryDescriptionLabel}
                        </label>
                        <textarea
                          value={category.description || ''}
                          onChange={(event) =>
                            onUpdateCategory(categoryIndex, {
                              description: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={copy.categoryDescriptionPlaceholder}
                          rows={4}
                        />
                      </div>
                    </div>

                    {itemCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-purple-200 bg-gradient-to-r from-purple-50 to-white px-5 py-6">
                        <h4 className="text-sm font-semibold text-gray-900">
                          No items in this {copy.categoryLabel.toLowerCase()} yet
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Click <span className="font-medium text-purple-700">Add Item</span>{' '}
                          to create the real content for this layout.
                        </p>
                        <button
                          type="button"
                          onClick={() => onAddItem(categoryIndex)}
                          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 sm:w-auto"
                        >
                          {copy.addFirstItemLabel}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(category.items || []).map((item, itemIndex) => {
                          const isItemOpen =
                            openItemsByCategory[categoryIndex] === itemIndex;

                          return (
                            <div
                              key={`${item.name}-${itemIndex}`}
                              className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70"
                            >
                              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                <button
                                  type="button"
                                  onClick={() => toggleItem(categoryIndex, itemIndex)}
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={`${item.name || 'Menu item'} preview`}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                        IMG
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                      Item {itemIndex + 1}
                                    </div>
                                    <div className="truncate text-base font-semibold text-gray-900">
                                      {item.name?.trim() || 'Untitled Item'}
                                    </div>
                                    <div className="mt-1 truncate text-sm text-gray-500">
                                      {getItemSummary(item)}
                                    </div>
                                  </div>
                                </button>

                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  {item.featured ? (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                      Featured
                                    </span>
                                  ) : null}
                                  {item.image ? (
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                                      Image added
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => toggleItem(categoryIndex, itemIndex)}
                                    className="inline-flex min-h-[40px] items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    {isItemOpen ? 'Collapse' : 'Edit Item'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRemoveItem(categoryIndex, itemIndex)}
                                    className="inline-flex min-h-[40px] items-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              {isItemOpen ? (
                                <div className="border-t border-gray-200 bg-white px-4 py-5 sm:px-5">
                                  <div className="grid gap-4 xl:grid-cols-2">
                                    <div>
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Item Name
                                      </label>
                                      <input
                                        type="text"
                                        value={item.name || ''}
                                        onChange={(event) =>
                                          onUpdateItem(categoryIndex, itemIndex, {
                                            name: event.target.value,
                                          })
                                        }
                                        className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                        placeholder="Chicken Biryani"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Price
                                      </label>
                                      <input
                                        type="text"
                                        value={item.price || ''}
                                        onChange={(event) =>
                                          onUpdateItem(categoryIndex, itemIndex, {
                                            price: event.target.value,
                                          })
                                        }
                                        className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                        placeholder="12.99"
                                      />
                                    </div>
                                    <div className="xl:col-span-2">
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Description
                                      </label>
                                      <textarea
                                        value={item.description || ''}
                                        onChange={(event) =>
                                          onUpdateItem(categoryIndex, itemIndex, {
                                            description: event.target.value,
                                          })
                                        }
                                        className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                        placeholder="Describe the dish briefly"
                                        rows={3}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Item Button Label
                                      </label>
                                      <input
                                        type="text"
                                        value={item.ctaLabel || ''}
                                        onChange={(event) =>
                                          onUpdateItem(categoryIndex, itemIndex, {
                                            ctaLabel: event.target.value,
                                          })
                                        }
                                        className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                        placeholder="Menu"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Item Button Link
                                      </label>
                                      <input
                                        type="text"
                                        value={item.ctaLink || ''}
                                        onChange={(event) =>
                                          onUpdateItem(categoryIndex, itemIndex, {
                                            ctaLink: event.target.value,
                                          })
                                        }
                                        className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                        placeholder="#menu"
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900">
                                          Item Image
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-500">
                                          This image appears inside the visual layout cards.
                                        </p>
                                      </div>
                                      <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(item.featured)}
                                          onChange={(event) =>
                                            onUpdateItem(categoryIndex, itemIndex, {
                                              featured: event.target.checked,
                                            })
                                          }
                                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        Featured Item
                                      </label>
                                    </div>

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white">
                                      {item.image ? (
                                        <img
                                          src={item.image}
                                          alt={`${item.name || 'Menu item'} preview`}
                                          className="h-40 w-full object-cover sm:h-48"
                                        />
                                      ) : (
                                        <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-gray-500 sm:h-48">
                                          No item image selected yet.
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onOpenItemImage(categoryIndex, itemIndex)
                                        }
                                        className="inline-flex w-full items-center justify-center rounded-lg border border-purple-200 bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 sm:w-auto"
                                      >
                                        {item.image
                                          ? 'Change Item Image'
                                          : 'Choose Item Image'}
                                      </button>
                                      {item.image ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onUpdateItem(categoryIndex, itemIndex, {
                                              image: undefined,
                                            })
                                          }
                                          className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
                                        >
                                          Remove
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddItem(categoryIndex)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 sm:w-auto"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                      Add Item
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
