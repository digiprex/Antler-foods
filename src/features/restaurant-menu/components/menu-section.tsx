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
      className={`scroll-mt-52 rounded-[32px] ${first ? '' : 'pt-1'}`}
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          {category.label}
        </h2>
        {category.description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-[15px]">
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
