
import 'server-only';
import { unstable_cache } from 'next/cache';

import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { loadActiveMenuOffers } from '@/features/restaurant-menu/lib/server/menu-offers';
import type {
  MenuAddOn,
  MenuCategory,
  MenuModifierGroup,
  RestaurantMenuData,
  ScheduleDay,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

const DAYS = [
  { dbDay: 1, longLabel: 'Monday', shortLabel: 'Mon' },
  { dbDay: 2, longLabel: 'Tuesday', shortLabel: 'Tue' },
  { dbDay: 3, longLabel: 'Wednesday', shortLabel: 'Wed' },
  { dbDay: 4, longLabel: 'Thursday', shortLabel: 'Thu' },
  { dbDay: 5, longLabel: 'Friday', shortLabel: 'Fri' },
  { dbDay: 6, longLabel: 'Saturday', shortLabel: 'Sat' },
  { dbDay: 7, longLabel: 'Sunday', shortLabel: 'Sun' },
] as const;
const DAY_BY_SHORT = new Map<string, number>(DAYS.map((day) => [day.shortLabel, day.dbDay]));
const DEFAULT_TIME_ZONE = 'UTC';
const SLOT_STEP_MINUTES = 10;
const UPCOMING_DAYS = 5;
const LOOKAHEAD_DAYS = 7;

const GET_RESTAURANT_BY_DOMAINS = `
  query GetRestaurantByDomains($domains: [String!]!) {
    restaurants(
      where: {
        is_deleted: { _eq: false }
        _or: [
          { staging_domain: { _in: $domains } }
          { custom_domain: { _in: $domains } }
        ]
      }
      limit: 10
    ) {
      restaurant_id
      name
      allow_tips
      pickup_allowed
      delivery_allowed
      address
      city
      state
      postal_code
      country
      logo
      favicon_url
      staging_domain
      custom_domain
    }
  }
`;

const GET_RESTAURANT_BY_ID = `
  query GetRestaurantById($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      name
      allow_tips
      pickup_allowed
      delivery_allowed
      address
      city
      state
      postal_code
      country
      logo
      favicon_url
      staging_domain
      custom_domain
    }
  }
`;

const GET_ACTIVE_MENU_BY_RESTAURANT = `
  query GetActiveMenuByRestaurant($restaurant_id: uuid!) {
    menu(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        is_active: { _eq: true }
      }
      order_by: [{ updated_at: desc }, { created_at: desc }]
      limit: 1
    ) {
      menu_id
      name
      restaurant_id
      is_active
      varies_with_time
    }
  }
`;

const GET_LATEST_MENU_BY_RESTAURANT = `
  query GetLatestMenuByRestaurant($restaurant_id: uuid!) {
    menu(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ updated_at: desc }, { created_at: desc }]
      limit: 1
    ) {
      menu_id
      name
      restaurant_id
      is_active
      varies_with_time
    }
  }
`;

const GET_LATEST_ACTIVE_MENU = `
  query GetLatestActiveMenu {
    menu(
      where: {
        is_deleted: { _eq: false }
        is_active: { _eq: true }
      }
      order_by: [{ updated_at: desc }, { created_at: desc }]
      limit: 1
    ) {
      menu_id
      name
      restaurant_id
      is_active
      varies_with_time
    }
  }
`;

const GET_LATEST_MENU = `
  query GetLatestMenu {
    menu(
      where: { is_deleted: { _eq: false } }
      order_by: [{ updated_at: desc }, { created_at: desc }]
      limit: 1
    ) {
      menu_id
      name
      restaurant_id
      is_active
      varies_with_time
    }
  }
`;
const GET_CATEGORIES_BY_MENU = `
  query GetCategoriesByMenu($menu_id: uuid!) {
    categories(
      where: { menu_id: { _eq: $menu_id }, is_deleted: { _eq: false } }
      order_by: [{ order_index: asc }, { created_at: asc }]
    ) {
      category_id
      menu_id
      name
      description
      order_index
      type
      is_active
    }
  }
`;

const GET_ITEMS_BY_CATEGORY_IDS = `
  query GetItemsByCategoryIds($category_ids: [uuid!]) {
    items(
      where: { category_id: { _in: $category_ids }, is_deleted: { _eq: false } }
      order_by: [{ category_id: asc }, { created_at: asc }]
    ) {
      item_id
      category_id
      parent_item_id
      name
      description
      delivery_price
      pickup_price
      image_url
      is_recommended
      is_best_seller
      in_stock
      is_available
      modifiers
    }
  }
`;

const GET_MODIFIER_GROUPS_BY_IDS = `
  query GetModifierGroupsByIds($modifier_group_ids: [uuid!]) {
    modifier_groups(
      where: {
        modifier_group_id: { _in: $modifier_group_ids }
        is_deleted: { _eq: false }
      }
      order_by: [{ created_at: asc }]
    ) {
      modifier_group_id
      restaurant_id
      name
      description
      min_selection
      max_selection
      type
      is_required
      is_multi_select
    }
  }
`;

const GET_MODIFIER_ITEMS_BY_GROUP_IDS = `
  query GetModifierItemsByGroupIds($modifier_group_ids: [uuid!]) {
    modifier_items(
      where: {
        modifier_group_id: { _in: $modifier_group_ids }
        is_deleted: { _eq: false }
      }
      order_by: [{ modifier_group_id: asc }, { created_at: asc }]
    ) {
      modifier_item_id
      modifier_group_id
      name
      price
    }
  }
`;

const GET_ACTIVE_OPENING_HOURS = `
  query GetActiveOpeningHours($restaurant_id: uuid!) {
    opening_hours(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_active: { _eq: true }
        is_deleted: { _eq: false }
      }
      order_by: [{ updated_at: desc }, { created_at: desc }]
      limit: 1
    ) {
      opening_hour_id
      timezone
      is_24x7
    }
  }
`;

const GET_OPENING_HOUR_SLOTS = `
  query GetOpeningHourSlots($opening_hour_id: uuid!) {
    opening_hour_slots(
      where: {
        opening_hour_id: { _eq: $opening_hour_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ day_of_week: asc }, { slot_order: asc }, { created_at: asc }]
    ) {
      opening_hour_id
      day_of_week
      slot_order
      is_closed
      open_time
      close_time
    }
  }
`;

const loadRestaurantMenuMetadataCached = unstable_cache(
async (domain: string) => {
  const restaurant = (await loadRestaurantByDomain(domain)) || (await loadRestaurantForLatestMenu());
  const restaurantName = text(restaurant?.name);

  return {
    title: restaurantName ? `${restaurantName} | Online Ordering` : 'Online Ordering',
    description: restaurantName
      ? `Order pickup or delivery from ${restaurantName}.`
      : 'Order pickup or delivery online.',
  };
},
['restaurant-menu-metadata'],
{ revalidate: 120 },
);

export async function loadRestaurantMenuMetadata(domain: string) {
  return loadRestaurantMenuMetadataCached(domain);
}

export function getEmptyRestaurantMenuData(restaurantName = 'Restaurant') {
  return buildEmptyMenuData(restaurantName);
}

const loadRestaurantMenuPageDataCached = unstable_cache(
async (domain: string): Promise<RestaurantMenuData> => {
  let restaurant = await loadRestaurantByDomain(domain);
  // Only fall back to the global latest menu when we cannot resolve a restaurant
  // for the current domain. If a restaurant exists but has no menu yet, keep it empty.
  let menu = restaurant?.restaurant_id ? await loadPreferredMenu(restaurant.restaurant_id) : null;
  if (!restaurant && !menu) {
    menu = await loadLatestMenu();
  }

  if (!restaurant && menu?.restaurant_id) {
    restaurant = await gql(GET_RESTAURANT_BY_ID, { restaurant_id: menu.restaurant_id }).then((data: any) => data.restaurants_by_pk || null);
  }

  if (!restaurant) {
    return buildEmptyMenuData('Restaurant');
  }

  const opening = await loadOpeningHours(restaurant.restaurant_id || '');
  const offers = await loadActiveMenuOffers(restaurant.restaurant_id || '');
  if (!menu?.menu_id) {
    return buildMenuData({ restaurant, menu: null, categories: [], items: [], modifierGroups: [], modifierItems: [], opening, offers });
  }

  const categories = await gql(GET_CATEGORIES_BY_MENU, { menu_id: menu.menu_id }).then((data: any) => data.categories || []);
  const categoryIds = categories.map((category: any) => text(category.category_id)).filter(Boolean);
  const items = categoryIds.length
    ? await gql(GET_ITEMS_BY_CATEGORY_IDS, { category_ids: categoryIds }).then((data: any) => data.items || [])
    : [];
  const modifierGroupIds = Array.from(new Set(items.flatMap((item: any) => modifierGroupIdsFromValue(item.modifiers))));
  const modifierGroups = modifierGroupIds.length
    ? await gql(GET_MODIFIER_GROUPS_BY_IDS, { modifier_group_ids: modifierGroupIds }).then((data: any) => data.modifier_groups || [])
    : [];
  const modifierItems = modifierGroups.length
    ? await gql(
      GET_MODIFIER_ITEMS_BY_GROUP_IDS,
      { modifier_group_ids: modifierGroups.map((group: any) => text(group.modifier_group_id)).filter(Boolean) },
    ).then((data: any) => data.modifier_items || [])
    : [];

  return buildMenuData({ restaurant, menu, categories, items, modifierGroups, modifierItems, opening, offers });
},
['restaurant-menu-page-data'],
{ revalidate: 60 },
);

export async function loadRestaurantMenuPageData(domain: string): Promise<RestaurantMenuData> {
  return loadRestaurantMenuPageDataCached(domain);
}
async function loadRestaurantByDomain(domain: string) {
  const normalizedDomain = text(domain?.split(',')[0]);
  const domainCandidates = Array.from(new Set([normalizedDomain, stripPort(normalizedDomain)].filter(Boolean)));
  if (domainCandidates.length === 0) {
    return null;
  }

  const data = await gql(GET_RESTAURANT_BY_DOMAINS, { domains: domainCandidates });
  const restaurants = data.restaurants || [];

  for (const candidate of domainCandidates) {
    const exact = restaurants.find((restaurant: any) => restaurant.staging_domain === candidate || restaurant.custom_domain === candidate);
    if (exact) {
      return exact;
    }
  }

  return restaurants[0] || null;
}

async function loadRestaurantForLatestMenu() {
  const menu = await loadLatestMenu();
  if (!menu?.restaurant_id) {
    return null;
  }

  const data = await gql(GET_RESTAURANT_BY_ID, { restaurant_id: menu.restaurant_id });
  return data.restaurants_by_pk || null;
}

async function loadPreferredMenu(restaurantId: string) {
  return gql(GET_ACTIVE_MENU_BY_RESTAURANT, { restaurant_id: restaurantId }).then((data: any) => data.menu?.[0] || null);
}

async function loadLatestMenu() {
  return gql(GET_LATEST_ACTIVE_MENU).then((data: any) => data.menu?.[0] || null);
}

async function loadOpeningHours(restaurantId: string) {
  if (!restaurantId) {
    return { profile: null, slots: [] };
  }

  const profile = await gql(GET_ACTIVE_OPENING_HOURS, { restaurant_id: restaurantId }).then((data: any) => data.opening_hours?.[0] || null);
  const openingHourId = text(profile?.opening_hour_id);
  if (!openingHourId) {
    return { profile, slots: [] };
  }

  const slots = await gql(GET_OPENING_HOUR_SLOTS, { opening_hour_id: openingHourId }).then((data: any) => data.opening_hour_slots || []);
  return { profile, slots };
}

function isRestaurantCurrentlyOpen(intervalsByDay: Map<number, Array<{ open: string; close: string }>>, timeZone: string): boolean {
  const now = new Date();
  const parts = zonedParts(now, timeZone);
  const todayDbDay = DAY_BY_SHORT.get(parts.weekdayShort) || 1;
  const todaysIntervals = intervalsByDay.get(todayDbDay) || [];
  const currentMinutes = parts.minutesOfDay;

  return todaysIntervals.some((interval) => {
    const openMinutes = timeToMinutes(interval.open);
    const closeMinutes = timeToMinutes(interval.close);
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  });
}

function buildMenuData({ restaurant, menu, categories, items, modifierGroups, modifierItems, opening, offers }: any): RestaurantMenuData {
  const restaurantName = text(restaurant?.name) || 'Restaurant';
  const pickupAllowed = restaurant?.pickup_allowed !== false;
  const deliveryAllowed = restaurant?.delivery_allowed !== false;
  const addressLine = buildFullAddress(restaurant) || 'Location unavailable';
  const cityStateZip = buildCityStateZip(restaurant);
  const timeZone = resolveTimeZone(opening.profile?.timezone);
  const intervalsByDay = buildIntervalsByDay(opening);
  const variesWithTime = menu?.varies_with_time === true;
  const isCurrentlyOpen = isRestaurantCurrentlyOpen(intervalsByDay, timeZone);
  const modifierItemsByGroupId = new Map<string, any[]>();

  for (const modifierItem of modifierItems) {
    const groupId = text(modifierItem.modifier_group_id);
    if (!groupId) {
      continue;
    }

    const existingItems = modifierItemsByGroupId.get(groupId) || [];
    existingItems.push(modifierItem);
    modifierItemsByGroupId.set(groupId, existingItems);
  }

  const groupMap = new Map<string, MenuModifierGroup>();
  for (const group of modifierGroups) {
    const groupId = text(group.modifier_group_id);
    const groupName = text(group.name);
    if (!groupId || !groupName) {
      continue;
    }

    const groupItemsFromTable = (modifierItemsByGroupId.get(groupId) || []).map((modifierItem) => ({
      id: text(modifierItem.modifier_item_id) || `${groupId}-${slugify(modifierItem.name)}`,
      name: text(modifierItem.name) || 'Option',
      price: numberValue(modifierItem.price),
      image: placeholderImage(text(modifierItem.name) || groupName),
      required: group.is_required === true,
      modifierGroupId: groupId,
      modifierGroupName: groupName,
    } satisfies MenuAddOn));
    const groupItemsFromJson = modifierItemsFromValue(
      group.modifier_items,
      groupId,
      groupName,
      group.is_required === true,
    );

    groupMap.set(groupId, {
      id: groupId,
      name: groupName,
      description: text(group.description) || undefined,
      minSelection: positiveNumber(group.min_selection),
      maxSelection: positiveNumber(group.max_selection),
      type: text(group.type) || undefined,
      isRequired: group.is_required === true,
      isMultiSelect: group.is_multi_select === true,
      items: groupItemsFromTable.length ? groupItemsFromTable : groupItemsFromJson,
    });
  }

  const itemsByCategoryId = new Map<string, any[]>();
  for (const item of items) {
    const categoryId = text(item.category_id);
    if (!categoryId) {
      continue;
    }

    const existingItems = itemsByCategoryId.get(categoryId) || [];
    existingItems.push(item);
    itemsByCategoryId.set(categoryId, existingItems);
  }

  const menuCategories: MenuCategory[] = categories.filter((category: any) => category.is_active !== false).map((category: any) => {
    const categoryId = text(category.category_id) || slugify(category.name) || 'category';
    const categoryItems = (itemsByCategoryId.get(categoryId) || []).filter((item: any) => item.is_available !== false).map((item: any) => {
      const itemModifierGroups = modifierGroupIdsFromValue(item.modifiers)
        .map((groupId) => groupMap.get(groupId))
        .filter((value): value is MenuModifierGroup => Boolean(value))
        .map((group) => ({ ...group, items: group.items.map((groupItem) => ({ ...groupItem })) }));
      const addOns = itemModifierGroups.flatMap((group) => group.items.map((groupItem) => ({ ...groupItem, required: group.isRequired })));
      const itemName = text(item.name) || 'Untitled Item';

      return {
        id: text(item.item_id) || `${categoryId}-${slugify(itemName)}`,
        categoryId,
        parentItemId: text(item.parent_item_id) || null,
        name: itemName,
        description: text(item.description) || '',
        price: resolvePrice(item),
        pickupPrice: numberValue(item.pickup_price),
        deliveryPrice: numberValue(item.delivery_price),
        image: text(item.image_url) || placeholderImage(itemName),
        badge: item.is_best_seller ? 'Best Seller' : item.is_recommended ? 'Recommended' : undefined,
        isBestSeller: item.is_best_seller === true,
        isRecommended: item.is_recommended === true,
        inStock: item.in_stock !== false,
        addOns: addOns.length ? addOns : undefined,
        modifierGroups: itemModifierGroups.length ? itemModifierGroups : undefined,
      };
    });
    const itemMap = new Map(categoryItems.map((item) => [item.id, { ...item, variants: [] as typeof item[] }]));
    const topLevelItems: typeof categoryItems = [];

    for (const item of categoryItems) {
      const parentItemId = item.parentItemId;

      if (parentItemId && itemMap.has(parentItemId)) {
        const parent = itemMap.get(parentItemId);
        if (parent) {
          parent.variants = [...(parent.variants || []), itemMap.get(item.id) || item];
        }
        continue;
      }

      topLevelItems.push(itemMap.get(item.id) || item);
    }

    return {
      id: categoryId,
      label: text(category.name) || 'Untitled Category',
      description: text(category.description) || undefined,
      items: topLevelItems,
    };
  }).filter((category: any) => category.items.length > 0);

  const favoriteCategoryIds = new Set(
    categories
      .filter((category: any) => isFavoritesCategoryType(category.type))
      .map((category: any) => text(category.category_id))
      .filter((categoryId: any): categoryId is string => Boolean(categoryId)),
  );
  const allItems = menuCategories.flatMap((category) => flattenMenuItems(category.items));
  const heroImage = text(restaurant.logo) || allItems.find((item) => Boolean(item.image))?.image || placeholderImage(restaurantName);
  const scheduleDays = buildScheduleDays(intervalsByDay, timeZone);
  const firstAvailableDay = scheduleDays.find((day) => day.slots.length > 0) || scheduleDays[0];

  return {
    restaurantId: text(restaurant.restaurant_id),
    hasMenu: !!menu?.menu_id,
    allowTips: restaurant.allow_tips !== false,
    pickupAllowed,
    deliveryAllowed,
    variesWithTime,
    isCurrentlyOpen,
    slug: slugify(restaurantName) || slugify(menu?.name) || 'menu',
    announcement:
      pickupAllowed && deliveryAllowed
        ? `Order directly from ${restaurantName} for pickup and delivery.`
        : pickupAllowed
          ? `Order directly from ${restaurantName} for pickup.`
          : `Order directly from ${restaurantName} for delivery.`,
    brand: {
      name: restaurantName.toUpperCase(),
      subtitle: text(menu?.name) || 'Online Ordering',
      accentText: restaurantName.split(/\s+/).filter(Boolean)[0] || restaurantName,
    },
    navigation: [
      { label: 'Home', href: '#top' },
      { label: 'Menu', href: '#menu-sections' },
      { label: 'Store Info', href: '#store-info' },
    ],
    restaurant: {
      name: restaurantName,
      addressLine,
      heroImage,
      openingText: buildOpeningText(intervalsByDay, timeZone),
      infoCardLabel: firstAvailableDay?.slots.length ? `Pickup available at ${firstAvailableDay.slots[0]}` : 'Pickup time unavailable',
      hours: buildRestaurantHours(intervalsByDay, opening.profile?.is_24x7 === true),
      trustBanner: '',
    },
    locations: [
      {
        id: text(restaurant.restaurant_id) || 'primary-location',
        label: addressLine === 'Location unavailable' ? 'Pickup location unavailable' : `Pickup at ${addressLine}`,
        street: text(restaurant.address) || addressLine,
        cityStateZip: cityStateZip || addressLine,
        fullAddress: addressLine,
        openingText: buildOpeningText(intervalsByDay, timeZone),
      },
    ],
    serviceOptions: pickupAllowed && deliveryAllowed
      ? [
          { mode: 'pickup', label: 'Pickup', helperText: 'Select a pickup time' },
          { mode: 'delivery', label: 'Delivery', helperText: 'Enter your address to check availability' },
        ]
      : pickupAllowed
        ? [{ mode: 'pickup', label: 'Pickup', helperText: 'Select a pickup time' }]
        : [{ mode: 'delivery', label: 'Delivery', helperText: 'Enter your address to check availability' }],
    rewards: {
      iconLabel: 'Rewards',
      message: 'Earn rewards on every eligible online order.',
      ctaLabel: 'Sign In / Sign Up',
    },
    offers: Array.isArray(offers) ? offers : [],
    categories: menuCategories,
    popularItemIds: allItems
      .filter((item) => favoriteCategoryIds.has(item.categoryId) && item.isBestSeller === true)
      .map((item) => item.id),
    scheduleDays,
    defaultScheduleLabel: firstAvailableDay ? `${firstAvailableDay.label}, ${firstAvailableDay.dateLabel} ${firstAvailableDay.slots[0] || ''}`.trim() : 'Pickup time unavailable',
    defaultDeliveryAddress: '',
  };
}

function isFavoritesCategoryType(value: unknown) {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'favourites' || normalized === 'favorites' || normalized === 'favourite' || normalized === 'favorite';
}

function buildEmptyMenuData(restaurantName: string): RestaurantMenuData {
  const scheduleDays = [fallbackScheduleDay(new Date(), DEFAULT_TIME_ZONE)];
  return {
    restaurantId: null,
    hasMenu: false,
    allowTips: true,
    pickupAllowed: true,
    deliveryAllowed: true,
    slug: slugify(restaurantName) || 'menu',
    announcement: `Order directly from ${restaurantName}.`,
    brand: { name: restaurantName.toUpperCase(), subtitle: 'Online Ordering', accentText: restaurantName },
    navigation: [
      { label: 'Home', href: '#top' },
      { label: 'Menu', href: '#menu-sections' },
      { label: 'Store Info', href: '#store-info' },
    ],
    restaurant: {
      name: restaurantName,
      addressLine: 'Location unavailable',
      heroImage: placeholderImage(restaurantName),
      openingText: 'Hours unavailable',
      infoCardLabel: 'Pickup time unavailable',
      hours: DAYS.map((day) => ({ day: day.longLabel, hours: 'Closed' })),
      trustBanner: '',
    },
    locations: [{ id: 'primary-location', label: 'Pickup location unavailable', street: 'Location unavailable', cityStateZip: 'Location unavailable', fullAddress: 'Location unavailable', openingText: 'Hours unavailable' }],
    serviceOptions: [
      { mode: 'pickup', label: 'Pickup', helperText: 'Select a pickup time' },
      { mode: 'delivery', label: 'Delivery', helperText: 'Enter your address to check availability' },
    ],
    rewards: { iconLabel: 'Rewards', message: 'Earn rewards on every eligible online order.', ctaLabel: 'Sign In / Sign Up' },
    offers: [],
    categories: [{ id: 'empty-menu', label: 'Menu', description: 'No items found', items: [] }],
    popularItemIds: [],
    scheduleDays,
    defaultScheduleLabel: `${scheduleDays[0].label}, ${scheduleDays[0].dateLabel} ${scheduleDays[0].slots[0]}`,
    defaultDeliveryAddress: '',
  };
}
function buildIntervalsByDay(opening: { profile: any; slots: any[] }) {
  const intervalsByDay = new Map<number, Array<{ open: string; close: string }>>();
  for (const day of DAYS) {
    intervalsByDay.set(day.dbDay, []);
  }

  if (opening.profile?.is_24x7 === true) {
    for (const day of DAYS) {
      intervalsByDay.set(day.dbDay, [{ open: '00:00:00', close: '23:59:59' }]);
    }
    return intervalsByDay;
  }

  for (const slot of opening.slots || []) {
    if (slot?.is_closed || typeof slot?.day_of_week !== 'number' || !intervalsByDay.has(slot.day_of_week)) {
      continue;
    }

    const open = normalizeTime(slot.open_time);
    const close = normalizeTime(slot.close_time);
    if (!open || !close) {
      continue;
    }

    const existingIntervals = intervalsByDay.get(slot.day_of_week) || [];
    existingIntervals.push({ open, close });
    existingIntervals.sort((left, right) => timeToMinutes(left.open) - timeToMinutes(right.open));
    intervalsByDay.set(slot.day_of_week, existingIntervals);
  }

  return intervalsByDay;
}

function buildRestaurantHours(intervalsByDay: Map<number, Array<{ open: string; close: string }>>, is24x7: boolean) {
  return DAYS.map((day) => ({
    day: day.longLabel,
    hours: is24x7
      ? 'Open 24 hours'
      : (intervalsByDay.get(day.dbDay) || []).map((interval) => `${formatClock(interval.open)} - ${formatClock(interval.close)}`).join(', ') || 'Closed',
  }));
}

function buildOpeningText(intervalsByDay: Map<number, Array<{ open: string; close: string }>>, timeZone: string) {
  const now = new Date();
  const today = zonedParts(now, timeZone);
  const todayDbDay = DAY_BY_SHORT.get(today.weekdayShort) || 1;
  const todaysIntervals = intervalsByDay.get(todayDbDay) || [];
  const currentMinutes = today.minutesOfDay;

  // Check if currently within an open interval today
  const activeInterval = todaysIntervals.find((interval) => {
    const openMin = timeToMinutes(interval.open);
    const closeMin = timeToMinutes(interval.close);
    return currentMinutes >= openMin && currentMinutes < closeMin;
  });

  if (activeInterval) {
    return `Open today ${formatClock(activeInterval.open)} - ${formatClock(activeInterval.close)}`;
  }

  // Check if there's a later interval today
  const nextTodayInterval = todaysIntervals.find((interval) => timeToMinutes(interval.open) > currentMinutes);
  if (nextTodayInterval) {
    return `Opens today at ${formatClock(nextTodayInterval.open)} - ${formatClock(nextTodayInterval.close)}`;
  }

  // Look ahead to future days
  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const nextDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const nextDay = zonedParts(nextDate, timeZone);
    const dbDay = DAY_BY_SHORT.get(nextDay.weekdayShort) || 1;
    const nextIntervals = intervalsByDay.get(dbDay) || [];
    if (nextIntervals.length > 0) {
      const dayLabel = offset === 1 ? 'tomorrow' : nextDay.weekdayShort;
      return `Opens ${dayLabel} ${formatClock(nextIntervals[0].open)} - ${formatClock(nextIntervals[nextIntervals.length - 1].close)}`;
    }
  }

  return 'Hours unavailable';
}

function buildScheduleDays(intervalsByDay: Map<number, Array<{ open: string; close: string }>>, timeZone: string): ScheduleDay[] {
  const now = new Date();
  const days: ScheduleDay[] = [];

  for (let offset = 0; offset < UPCOMING_DAYS; offset += 1) {
    const date = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const parts = zonedParts(date, timeZone);
    const dbDay = DAY_BY_SHORT.get(parts.weekdayShort) || 1;
    days.push({
      id: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : parts.weekdayShort,
      dateLabel: `${parts.monthShort} ${parts.day}`,
      slots: buildScheduleSlots(intervalsByDay.get(dbDay) || [], offset === 0 ? parts.minutesOfDay : null),
    });
  }

  return days.some((day) => day.slots.length > 0) ? days : [fallbackScheduleDay(now, timeZone)];
}

function buildScheduleSlots(intervals: Array<{ open: string; close: string }>, currentMinutes: number | null) {
  const slotLabels: string[] = [];
  const minimumMinutes = currentMinutes == null ? null : roundUp(currentMinutes + SLOT_STEP_MINUTES, SLOT_STEP_MINUTES);

  for (const interval of intervals) {
    let minutePointer = timeToMinutes(interval.open);
    const closeMinutes = timeToMinutes(interval.close);
    if (!Number.isFinite(minutePointer) || !Number.isFinite(closeMinutes) || minutePointer >= closeMinutes) {
      continue;
    }

    if (minimumMinutes != null) {
      minutePointer = Math.max(minutePointer, minimumMinutes);
    }

    for (let current = minutePointer; current < closeMinutes; current += SLOT_STEP_MINUTES) {
      slotLabels.push(formatClock(minutesToTime(current)));
    }
  }

  return Array.from(new Set(slotLabels));
}

function flattenMenuItems<T extends { variants?: T[] }>(items: T[]): T[] {
  return items.flatMap((item) => [item, ...flattenMenuItems(item.variants || [])]);
}

function fallbackScheduleDay(date: Date, timeZone: string): ScheduleDay {
  const parts = zonedParts(date, timeZone);
  return { id: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`, label: 'Today', dateLabel: `${parts.monthShort} ${parts.day}`, slots: ['ASAP'] };
}

function modifierItemsFromValue(modifierItems: any, groupId: string, groupName: string, isRequired: boolean): MenuAddOn[] {
  const normalizedModifierItems = coerceJsonValue(modifierItems);

  if (Array.isArray(normalizedModifierItems)) {
    return normalizedModifierItems
      .map((item, index) => normalizeModifierItemValue(item, index, groupId, groupName, isRequired))
      .filter((item): item is MenuAddOn => Boolean(item));
  }

  if (normalizedModifierItems && typeof normalizedModifierItems === 'object') {
    if (Array.isArray((normalizedModifierItems as Record<string, unknown>).items)) {
      return modifierItemsFromValue(
        (normalizedModifierItems as Record<string, unknown>).items,
        groupId,
        groupName,
        isRequired,
      );
    }

    return Object.entries(normalizedModifierItems).map(([key, value], index) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return normalizeModifierItemValue(
          {
            ...(value as Record<string, unknown>),
            name: text((value as Record<string, unknown>).name) || key,
          },
          index,
          groupId,
          groupName,
          isRequired,
        );
      }

      return normalizeModifierItemValue(
        {
          name: key,
          price: value,
        },
        index,
        groupId,
        groupName,
        isRequired,
      );
    }).filter((item): item is MenuAddOn => Boolean(item));
  }

  return [];
}

function normalizeModifierItemValue(item: unknown, index: number, groupId: string, groupName: string, isRequired: boolean): MenuAddOn | null {
  if (typeof item === 'string') {
    const name = text(item);
    if (!name) {
      return null;
    }

    return {
      id: `${groupId}-${slugify(name) || index}`,
      name,
      price: 0,
      image: placeholderImage(name),
      required: isRequired,
      modifierGroupId: groupId,
      modifierGroupName: groupName,
    };
  }

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const name = text(candidate.name) || text(candidate.label) || text(candidate.title);
  if (!name) {
    return null;
  }

  return {
    id: text(candidate.modifier_item_id) || text(candidate.id) || `${groupId}-${slugify(name) || index}`,
    name,
    price: numberValue(candidate.price ?? candidate.amount ?? candidate.additional_price),
    image: placeholderImage(name),
    required: isRequired,
    modifierGroupId: groupId,
    modifierGroupName: groupName,
  };
}

function modifierGroupIdsFromValue(modifiers: any): string[] {
  const normalizedModifiers = coerceJsonValue(modifiers);

  if (Array.isArray(normalizedModifiers)) {
    return normalizedModifiers.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }
  if (normalizedModifiers && typeof normalizedModifiers === 'object') {
    const modifiersObj = normalizedModifiers as Record<string, unknown>;
    const modifierGroupIds = modifiersObj.modifier_group_ids;
    if (Array.isArray(modifierGroupIds)) {
      return (modifierGroupIds as unknown[])
        .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);
    }
    return Object.entries(normalizedModifiers)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .filter((value) => value.trim().length > 0);
  }
  if (typeof normalizedModifiers === 'string' && normalizedModifiers.trim().length > 0) {
    return [normalizedModifiers.trim()];
  }
  return [];
}

function coerceJsonValue(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function buildFullAddress(restaurant: any) {
  return [text(restaurant?.address), text(restaurant?.city), text(restaurant?.state), text(restaurant?.postal_code), text(restaurant?.country)].filter(Boolean).join(', ');
}

function buildCityStateZip(restaurant: any) {
  return [text(restaurant?.city), text(restaurant?.state), text(restaurant?.postal_code)].filter(Boolean).join(', ');
}

function resolvePrice(item: any) {
  return numberValue(item?.pickup_price) > 0 ? numberValue(item.pickup_price) : numberValue(item?.delivery_price);
}

function placeholderImage(label: string) {
  const safeLabel = escapeSvg(label || 'Menu');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f4f1ec"/><stop offset="1" stop-color="#d8d4d1"/></linearGradient></defs><rect width="480" height="320" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#57534e" font-family="Arial, sans-serif" font-size="28" font-weight="700">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: Number(values.year || 0), month: Number(values.month || 0), day: Number(values.day || 0), weekdayShort: values.weekday || 'Mon', monthShort: new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(date), minutesOfDay: Number(values.hour || 0) * 60 + Number(values.minute || 0) };
}

function resolveTimeZone(value: unknown) {
  const candidate = text(value) || DEFAULT_TIME_ZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function normalizeTime(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  return match ? `${match[1]}:${match[2]}:00` : null;
}

function timeToMinutes(value: string) {
  const normalized = normalizeTime(value);
  if (!normalized) return Number.NaN;
  const [hours, minutes] = normalized.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function minutesToTime(totalMinutes: number) {
  const boundedMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hours = Math.floor(boundedMinutes / 60);
  const minutes = boundedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function formatClock(value: string) {
  if (value === 'ASAP') return value;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? 'pm' : 'am';
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function stripPort(value: string | null) {
  return value ? value.replace(/:\d+$/, '') : null;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function slugify(value: unknown) {
  const normalized = text(value);
  return normalized ? normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function positiveNumber(value: unknown) {
  const parsed = numberValue(value);
  return parsed > 0 ? parsed : undefined;
}

function escapeSvg(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return adminGraphqlRequest<T>(query, variables);
}


