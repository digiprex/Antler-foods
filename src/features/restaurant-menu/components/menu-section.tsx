import { MenuItemCard } from '@/features/restaurant-menu/components/menu-item-card';
import type { MenuCategory, MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuSectionProps {
  category: MenuCategory;
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  registerRef: (element: HTMLElement | null) => void;
  first?: boolean;
}

export function MenuSection({
  category,
  onOpenItem,
  onQuickAdd,
  registerRef,
  first = false,
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

      <div className="grid gap-4">
        {category.items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onOpen={onOpenItem}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>
    </section>
  );
}
