import { ChevronRightIcon, MenuDotsIcon } from '@/features/restaurant-menu/components/icons';

interface CategoryTabsProps {
  categories: Array<{ id: string; label: string }>;
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onSelect,
}: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-[28px] border border-black/5 bg-white px-3 py-3 shadow-sm">
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-slate-500 transition hover:border-black/20 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        aria-label="Browse categories"
      >
        <MenuDotsIcon className="h-5 w-5" />
      </button>
      <div className="flex flex-1 gap-3 overflow-x-auto pb-1">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                isActive
                  ? 'border-black bg-white text-slate-950 shadow-sm'
                  : 'border-transparent bg-[#f2efe9] text-slate-600 hover:border-black/10 hover:text-slate-900'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
      <div className="hidden h-11 w-11 items-center justify-center rounded-full border border-black/10 text-slate-500 lg:flex">
        <ChevronRightIcon className="h-5 w-5" />
      </div>
    </div>
  );
}
