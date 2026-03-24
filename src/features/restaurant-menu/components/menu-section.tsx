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
      className={`scroll-mt-32 ${first ? '' : 'pt-10'}`}
    >
      <div className="mb-6 space-y-2 border-b border-stone-200 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">
          {category.label}
        </h2>
        {category.description ? (
          <p className="max-w-3xl text-sm text-stone-600">
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
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-600 shadow-sm">
          No items found
        </div>
      )}
    </section>
  );
}