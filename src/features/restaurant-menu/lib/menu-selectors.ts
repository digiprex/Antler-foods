import type {
  MenuCategory,
  MenuItem,
  RestaurantMenuData,
  ScheduleSelection,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

export function getAllMenuItems(categories: MenuCategory[]) {
  return categories.flatMap((category) => category.items);
}

export function getPopularItems(data: RestaurantMenuData) {
  const itemsById = new Map(
    getAllMenuItems(data.categories).map((item) => [item.id, item]),
  );

  return data.popularItemIds
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is MenuItem => Boolean(item));
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
      const items = category.items.filter((item) => {
        return (
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery)
        );
      });

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
