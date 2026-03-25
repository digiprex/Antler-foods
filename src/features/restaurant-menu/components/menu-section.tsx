import { MenuItemCard } from '@/features/restaurant-menu/components/menu-item-card';
import type { MenuCategory, MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuSectionProps {
  category: MenuCategory;
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  registerRef: (element: HTMLElement | null) => void;
  first?: boolean;
  getItemQuantity?: (itemId: string) => number;
}

function toHeadingCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (trimmed !== trimmed.toUpperCase()) {
    return value;
  }

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function MenuSection({
  category,
  onOpenItem,
  onQuickAdd,
  registerRef,
  first = false,
  getItemQuantity,
}: MenuSectionProps) {
  return (
    <section
      id={`menu-section-${category.id}`}
      ref={registerRef}
      className={`scroll-mt-28 ${first ? '' : 'pt-6 sm:pt-7'}`}
    >
      <div className="mb-4">
        <h2 className="mt-1 normal-case text-xl font-semibold tracking-tight text-stone-950 sm:text-[1.7rem]">
          {toHeadingCase(category.label)}
        </h2>
        {category.description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-stone-600">
            {category.description}
          </p>
        ) : null}
      </div>

      {category.items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {category.items.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              quantityInCart={getItemQuantity ? getItemQuantity(item.id) : 0}
              onOpen={onOpenItem}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-600 shadow-sm">
          No items found
        </div>
      )}
    </section>
  );
}
