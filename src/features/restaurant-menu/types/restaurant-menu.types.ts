export type FulfillmentMode = 'pickup' | 'delivery';

export interface MenuNavLink {
  label: string;
  href: string;
}

export interface RestaurantBrand {
  name: string;
  subtitle: string;
  accentText: string;
}

export interface RestaurantLocation {
  id: string;
  label: string;
  street: string;
  cityStateZip: string;
  fullAddress: string;
  openingText: string;
}

export interface RestaurantHour {
  day: string;
  hours: string;
}

export interface RestaurantInfo {
  name: string;
  addressLine: string;
  heroImage: string;
  openingText: string;
  infoCardLabel: string;
  hours: RestaurantHour[];
  trustBanner: string;
}

export interface RestaurantRewards {
  iconLabel: string;
  message: string;
  ctaLabel: string;
}

export interface MenuAddOn {
  id: string;
  name: string;
  price: number;
  image: string;
  required?: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  likes: number;
  points: number;
  badge?: string;
  addOns?: MenuAddOn[];
}

export interface MenuCategory {
  id: string;
  label: string;
  description?: string;
  items: MenuItem[];
}

export interface ScheduleDay {
  id: string;
  label: string;
  dateLabel: string;
  slots: string[];
}

export interface ServiceOption {
  mode: FulfillmentMode;
  label: string;
  helperText: string;
}

export interface RestaurantMenuData {
  slug: string;
  announcement: string;
  brand: RestaurantBrand;
  navigation: MenuNavLink[];
  restaurant: RestaurantInfo;
  locations: RestaurantLocation[];
  serviceOptions: ServiceOption[];
  rewards: RestaurantRewards;
  categories: MenuCategory[];
  popularItemIds: string[];
  scheduleDays: ScheduleDay[];
  defaultScheduleLabel: string;
  defaultDeliveryAddress: string;
}

export interface ScheduleSelection {
  dayId: string;
  time: string;
}

export interface CartItem {
  key: string;
  itemId: string;
  name: string;
  quantity: number;
  basePrice: number;
  image: string;
  notes: string;
  selectedAddOns: MenuAddOn[];
}

export interface AddCartItemInput {
  item: MenuItem;
  quantity: number;
  notes?: string;
  selectedAddOns?: MenuAddOn[];
}
