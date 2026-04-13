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
  modifierGroupId?: string;
  modifierGroupName?: string;
}

export interface MenuModifierGroup {
  id: string;
  name: string;
  description?: string;
  minSelection?: number;
  maxSelection?: number;
  type?: string;
  isRequired?: boolean;
  isMultiSelect?: boolean;
  items: MenuAddOn[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  parentItemId: string | null;
  name: string;
  description: string;
  price: number;
  image: string;
  pickupPrice?: number;
  deliveryPrice?: number;
  likes?: number;
  points?: number;
  badge?: string;
  isBestSeller?: boolean;
  isRecommended?: boolean;
  inStock?: boolean;
  addOns?: MenuAddOn[];
  modifierGroups?: MenuModifierGroup[];
  variants?: MenuItem[];
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

export type MenuOfferType =
  | 'percentage_off'
  | 'amount_off'
  | 'buy_1_get_1'
  | 'free_item';

export interface MenuOfferItemMap {
  [categoryId: string]: string[];
}

export interface MenuOffer {
  id: string;
  name: string;
  type: MenuOfferType;
  subType: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  percentageOff: number | null;
  amountOff: number | null;
  minSpend: number | null;
  discountedItems: MenuOfferItemMap | null;
  qualifyingItems: MenuOfferItemMap | null;
  freeItems: MenuOfferItemMap | null;
}

export interface MenuOfferCartLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface MenuOfferEvaluation {
  offerId: string;
  offerName: string;
  headline: string;
  description: string;
  helperText: string;
  statusLabel: string;
  discountAmount: number;
  isEligible: boolean;
  isBestOffer: boolean;
  matchedItemIds: string[];
}

export interface MenuOffersEvaluationResult {
  offers: MenuOfferEvaluation[];
  bestOffer: MenuOfferEvaluation | null;
}

export interface RestaurantMenuData {
  restaurantId?: string | null;
  hasMenu?: boolean;
  allowTips?: boolean;
  transactionTaxRate?: number;
  serviceFeeCappedAt?: number;
  allowCashPickup?: boolean;
  pickupAllowed?: boolean;
  deliveryAllowed?: boolean;
  stripeConnected?: boolean;
  orderingBlockedMessage?: string | null;
  variesWithTime?: boolean;
  isCurrentlyOpen?: boolean;
  slug: string;
  announcement: string;
  brand: RestaurantBrand;
  navigation: MenuNavLink[];
  restaurant: RestaurantInfo;
  locations: RestaurantLocation[];
  serviceOptions: ServiceOption[];
  rewards: RestaurantRewards;
  offers: MenuOffer[];
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
  parentName?: string;
  quantity: number;
  basePrice: number;
  image: string;
  notes: string;
  selectedAddOns: MenuAddOn[];
}

export interface AddCartItemInput {
  item: MenuItem;
  parentName?: string;
  quantity: number;
  notes?: string;
  selectedAddOns?: MenuAddOn[];
}
