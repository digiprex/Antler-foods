interface SidebarNavigationProps {
  categories: Array<{ id: string; label: string }>;
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export function SidebarNavigation({
  categories,
  activeCategoryId,
  onSelect,
  searchQuery,
  onSearchQueryChange,
}: SidebarNavigationProps) {
  return (
    <aside className="sticky top-[calc(var(--navbar-height,0px)+var(--announcement-bar-height,0px))] h-[calc(100vh-var(--navbar-height,0px)-var(--announcement-bar-height,0px))] w-64 overflow-y-auto border-r border-stone-200 bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="space-y-3 px-4 pb-3 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Browse Menu
        </p>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search category or item..."
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-0"
          aria-label="Search category or item"
        />
      </div>
      <nav className="space-y-1 p-3">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={`w-full rounded-2xl px-3.5 py-2.5 text-left text-[15px] font-semibold transition ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
