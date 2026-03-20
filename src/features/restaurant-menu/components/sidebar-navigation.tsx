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
    <aside className="sticky top-[calc(var(--navbar-height,0px)+var(--announcement-bar-height,0px))] h-[calc(100vh-var(--navbar-height,0px)-var(--announcement-bar-height,0px))] w-72 overflow-y-auto border-r border-stone-200 bg-gradient-to-b from-stone-50 to-white">
      <div className="space-y-3 px-5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Browse Menu
        </p>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search category or item..."
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          aria-label="Search category or item"
        />
      </div>
      <nav className="space-y-1.5 p-4">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={`w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
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
