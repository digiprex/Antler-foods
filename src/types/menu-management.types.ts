export type MenuGroupKind = 'time' | 'location';

export type AvailabilityStatus = 'in_stock' | 'sold_out';

export type ItemOptionType = 'size' | 'portion';

export type UpsellFlag = 'none' | 'best-seller' | 'recommended';

export type DiscountScopeType =
  | 'entire_menu'
  | 'menu_group'
  | 'category'
  | 'product'
  | 'modifier_group'
  | 'modifier_item';

export type DiscountType = 'percentage' | 'fixed';

export interface ModifierItemPriceOverride {
  optionId: string;
  price: number;
}

export interface ModifierItem {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  overridePrice?: number;
  disabled: boolean;
  availabilityStatus: AvailabilityStatus;
  optionPriceOverrides: ModifierItemPriceOverride[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  required?: boolean;
  minSelection?: number;
  maxSelection?: number;
  items: ModifierItem[];
}

export interface MenuItemOption {
  id: string;
  type: ItemOptionType;
  label: string;
}

export interface MenuItemPricing {
  basePrice: number;
  discountedPrice?: number;
  pickupPrice?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  pricing: MenuItemPricing;
  image?: string;
  tags: string[];
  availabilityStatus: AvailabilityStatus;
  preparationTimeMins?: number;
  disabled: boolean;
  options: MenuItemOption[];
  modifierGroups: ModifierGroup[];
  upsellFlag: UpsellFlag;
  upsellRecommendations: string[];
  salesVelocity30d: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  disabled: boolean;
  items: MenuItem[];
}

export interface MenuGroup {
  id: string;
  name: string;
  groupType: MenuGroupKind;
  locationName?: string;
  startTime?: string;
  endTime?: string;
  days?: string[];
  categories: MenuCategory[];
}

export interface SmartDiscountRule {
  id: string;
  name: string;
  scopeType: DiscountScopeType;
  scopeTargetIds: string[];
  discountType: DiscountType;
  value: number;
  startAt: string;
  endAt: string;
  enabled: boolean;
}

export interface MenuDefinition {
  menu_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_active: boolean;
  name: string;
  restaurant_id: string;
  varies_with_time: boolean;
  description?: string;
  qrSlug: string;
  groups: MenuGroup[];
  smartPricingRules: SmartDiscountRule[];
  autoBestSellerEnabled: boolean;
  websiteSyncVersion: number;
}
