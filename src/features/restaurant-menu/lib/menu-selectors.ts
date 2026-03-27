import type {
  MenuCategory,
  MenuItem,
  RestaurantMenuData,
  ScheduleSelection,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

export function getAllMenuItems(categories: MenuCategory[]) {
  return categories.flatMap((category) => flattenMenuItems(category.items));
}

export function getPopularItems(data: RestaurantMenuData) {
  const itemsById = new Map(
    getAllMenuItems(data.categories).map((item) => [item.id, item]),
  );

  return data.popularItemIds
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is MenuItem => Boolean(item));
}

export function getRecommendedItems(categories: MenuCategory[]) {
  return getAllMenuItems(categories).filter((item) => item.isRecommended === true);
}

export function findMenuItemById(
  categories: MenuCategory[],
  itemId: string,
) {
  return getAllMenuItems(categories).find((item) => item.id === itemId) || null;
}

export function filterCategoriesByQuery(
  categories: MenuCategory[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return categories;
  }

  return categories
    .map((category) => {
      const matchesCategory = category.label.toLowerCase().includes(normalizedQuery);
      const items = category.items
        .map((item) => filterItemWithVariants(item, normalizedQuery))
        .filter((item): item is MenuItem => Boolean(item));

      if (matchesCategory) {
        return category;
      }

      return {
        ...category,
        items,
      };
    })
    .filter((category) => category.items.length > 0);
}

function flattenMenuItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => [item, ...flattenMenuItems(item.variants || [])]);
}

function filterItemWithVariants(item: MenuItem, query: string): MenuItem | null {
  const matchesItem =
    item.name.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query);
  const matchingVariants = (item.variants || [])
    .map((variant) => filterItemWithVariants(variant, query))
    .filter((variant): variant is MenuItem => Boolean(variant));

  if (!matchesItem && matchingVariants.length === 0) {
    return null;
  }

  if (matchesItem) {
    return item;
  }

  return {
    ...item,
    variants: matchingVariants,
  };
}

export function getScheduleSummary(
  days: RestaurantMenuData['scheduleDays'],
  selection: ScheduleSelection,
) {
  const day = days.find((candidate) => candidate.id === selection.dayId);

  if (!day) {
    return selection.time;
  }

  return `${day.label}, ${day.dateLabel} ${selection.time}`;
}
