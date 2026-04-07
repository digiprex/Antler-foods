const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InformationSection =
  | 'brand'
  | 'address'
  | 'opening-hours'
  | 'google-profile'
  | 'bank-accounts';

export interface RestaurantRoutingSelection {
  id: string;
  name: string;
}

export interface RestaurantPathScope {
  roleSegment: string;
  slug: string;
  restaurantId: string;
  restaurantNameFromSlug: string;
}

export function isUuid(value: string) {
  return UUID_REGEX.test(value.trim());
}

export function slugifyRestaurantName(name: string) {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'restaurant';
}

export function deslugifyRestaurantName(slug: string) {
  const readable = slug
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!readable) {
    return 'Restaurant';
  }

  return readable
    .split(' ')
    .map((word) => (word ? `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}` : ''))
    .join(' ')
    .trim();
}

export function buildRestaurantSlug(restaurant: RestaurantRoutingSelection) {
  return `${slugifyRestaurantName(restaurant.name)}--${restaurant.id}`;
}

export function parseRestaurantSlug(slugValue: string) {
  const slug = decodeURIComponent(slugValue).trim();
  const separatorIndex = slug.lastIndexOf('--');
  const nameSlug = separatorIndex >= 0 ? slug.slice(0, separatorIndex) : slug;
  const idCandidate = separatorIndex >= 0 ? slug.slice(separatorIndex + 2) : '';
  const fallbackName = deslugifyRestaurantName(nameSlug || slug);

  if (!idCandidate || !isUuid(idCandidate)) {
    return {
      restaurantId: null,
      restaurantNameFromSlug: fallbackName,
    };
  }

  return {
    restaurantId: idCandidate,
    restaurantNameFromSlug: fallbackName,
  };
}

export function parseRestaurantScopeFromPath(pathname: string): RestaurantPathScope | null {
  const match = pathname.match(
    /^\/dashboard\/([^/]+)\/restaurants\/([^/]+)(?:\/|$)/,
  );

  if (!match) {
    return null;
  }

  const roleSegment = match[1] || '';
  const slug = match[2] || '';
  const parsedSlug = parseRestaurantSlug(slug);

  if (!roleSegment || !slug || !parsedSlug.restaurantId) {
    return null;
  }

  return {
    roleSegment,
    slug,
    restaurantId: parsedSlug.restaurantId,
    restaurantNameFromSlug: parsedSlug.restaurantNameFromSlug,
  };
}

export function buildRestaurantInformationPath(
  roleSegment: string,
  restaurant: RestaurantRoutingSelection,
  section: InformationSection,
) {
  return `/dashboard/${roleSegment}/restaurants/${buildRestaurantSlug(restaurant)}/information/${section}`;
}

export function buildRestaurantMediaPath(
  roleSegment: string,
  restaurant: RestaurantRoutingSelection,
) {
  return `/dashboard/${roleSegment}/restaurants/${buildRestaurantSlug(restaurant)}/media`;
}

export function buildRestaurantBankAccountsPath(
  roleSegment: string,
  restaurant: RestaurantRoutingSelection,
) {
  const params = new URLSearchParams({
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
  });

  return `/dashboard/${roleSegment}/bank-accounts?${params.toString()}`;
}
