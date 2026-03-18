import { SearchIcon } from '@/features/restaurant-menu/components/icons';

interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MenuSearch({ value, onChange }: MenuSearchProps) {
  return (
    <label className="relative block">
      <span className="sr-only">Search menu items</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search"
        className="h-14 w-full rounded-2xl border border-black/10 bg-white pl-5 pr-14 text-base text-slate-900 shadow-sm outline-none transition focus:border-black/20 focus:ring-2 focus:ring-black/10"
      />
      <SearchIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}
