'use client';

import {
  useAuthenticationStatus,
  useHasuraClaims,
  useSignOut,
  useUserData,
} from '@nhost/react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import { AnnouncementStrip } from '@/features/restaurant-menu/components/announcement-strip';
import { CartDrawer } from '@/features/restaurant-menu/components/cart-drawer';
import { CartIcon } from '@/features/restaurant-menu/components/icons';
import { SidebarNavigation } from '@/features/restaurant-menu/components/sidebar-navigation';
import { FulfillmentSelector } from '@/features/restaurant-menu/components/fulfillment-selector';
import { ItemDetailsModal } from '@/features/restaurant-menu/components/item-details-modal';
import { LocationModal } from '@/features/restaurant-menu/components/location-modal';
import { MenuAuthSidebar, type MenuAuthView } from '@/features/restaurant-menu/components/menu-auth-sidebar';
import { MenuProfileCard } from '@/features/restaurant-menu/components/menu-profile-card';
import { MenuSection } from '@/features/restaurant-menu/components/menu-section';
import { PopularItemsCarousel } from '@/features/restaurant-menu/components/popular-items-carousel';
import { RewardsBanner } from '@/features/restaurant-menu/components/rewards-banner';
import { ScheduleOrderModal } from '@/features/restaurant-menu/components/schedule-order-modal';
import { CartProvider } from '@/features/restaurant-menu/context/cart-context';
import { useActiveCategory } from '@/features/restaurant-menu/hooks/use-active-category';
import { useMenuCart } from '@/features/restaurant-menu/hooks/use-menu-cart';
import { useMenuSearch } from '@/features/restaurant-menu/hooks/use-menu-search';
import {
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
} from '@/features/restaurant-menu/lib/customer-auth';
import { getMenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import {
  findMenuItemById,
  getPopularItems,
  getScheduleSummary,
} from '@/features/restaurant-menu/lib/menu-selectors';
import type {
  FulfillmentMode,
  MenuCategory,
  MenuItem,
  RestaurantMenuData,
  ScheduleSelection,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuPageProps {
  data: RestaurantMenuData;
}

function MenuPageContent({ data }: MenuPageProps) {
  const {
    itemCount,
    items,
    subtotal,
    isHydrated,
    addItem,
    updateItemQuantity,
    getItemQuantity,
  } = useMenuCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthenticationStatus();
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const { signOut } = useSignOut();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { query, setQuery, filteredCategories } = useMenuSearch(data.categories);
  const { activeCategoryId, registerSectionRef, scrollToCategory } = useActiveCategory(
    filteredCategories.map((category) => category.id),
  );
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('pickup');
  const [selectedLocationId, setSelectedLocationId] = useState(data.locations[0]?.id || '');
  const [deliveryAddress, setDeliveryAddress] = useState(data.defaultDeliveryAddress);
  const initialScheduleDay =
    data.scheduleDays.find((day) => day.slots.length > 0) || data.scheduleDays[0];
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSelection>({
    dayId: initialScheduleDay?.id || '',
    time: initialScheduleDay?.slots[0] || '',
  });
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationModalMode, setLocationModalMode] = useState<FulfillmentMode>('pickup');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalSource, setScheduleModalSource] = useState<'info' | 'location' | 'cart'>('info');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarView, setAuthSidebarView] = useState<MenuAuthView>('login');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const contentContainerClass = 'mx-auto w-full max-w-[1120px] px-4 sm:px-6';
  const brandName = data.restaurant.name.replace(' Menu', '');
  const resolvedRole = getRoleFromHasuraClaims(hasuraClaims) || (user ? getUserRole(user) : null);
  const isCustomerAuthenticated = !isAuthLoading && isAuthenticated && resolvedRole === 'user';
  const customerProfile = getMenuCustomerProfile(user);

  const openAuthSidebar = (view: MenuAuthView) => {
    setAuthSidebarView(view);
    setAuthSidebarOpen(true);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setAuthSidebarOpen(false);
      setAuthSidebarView('login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('cart') === 'open') {
      setCartOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest('a[href]');

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') {
        return;
      }

      if (anchor.hasAttribute('download')) {
        return;
      }

      const targetUrl = new URL(anchor.href, window.location.origin);

      let targetView: MenuAuthView | null = null;

      if (targetUrl.pathname === CUSTOMER_LOGIN_ROUTE) {
        targetView = 'login';
      } else if (targetUrl.pathname === CUSTOMER_SIGNUP_ROUTE) {
        targetView = 'signup';
      } else if (targetUrl.pathname === CUSTOMER_FORGOT_PASSWORD_ROUTE) {
        targetView = 'forgot-password';
      }

      if (!targetView) {
        return;
      }

      event.preventDefault();
      setAuthSidebarView(targetView);
      setAuthSidebarOpen(true);
    };

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    const authLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href="/login"], a[href="/signup"]'),
    );

    authLinks.forEach((link) => {
      if (!('menuAuthOriginalDisplay' in link.dataset)) {
        link.dataset.menuAuthOriginalDisplay = link.style.display || '';
      }

      link.style.display = isCustomerAuthenticated ? 'none' : link.dataset.menuAuthOriginalDisplay || '';
    });

    return () => {
      authLinks.forEach((link) => {
        link.style.display = link.dataset.menuAuthOriginalDisplay || '';
        delete link.dataset.menuAuthOriginalDisplay;
      });
    };
  }, [isCustomerAuthenticated]);

  const selectedLocation =
    data.locations.find((location) => location.id === selectedLocationId) || data.locations[0];
  const scheduleLabel = getScheduleSummary(data.scheduleDays, selectedSchedule);
  const pricedCategories = applyFulfillmentPricingToCategories(filteredCategories, fulfillmentMode);
  const popularItems = getPopularItems(data).map((item) => applyFulfillmentPricing(item, fulfillmentMode));
  const hasVisibleItems = pricedCategories.some((category) => category.items.length > 0);
  const selectedItem = selectedItemId
    ? findMenuItemById(data.categories, selectedItemId)
    : null;
  const displaySelectedItem = selectedItem
    ? applyFulfillmentPricing(selectedItem, fulfillmentMode)
    : null;
  const locationLabel =
    fulfillmentMode === 'pickup'
      ? `${selectedLocation?.label || 'Select pickup location'} - ${scheduleLabel}`
      : deliveryAddress.trim()
        ? `Deliver to ${deliveryAddress.trim()}`
        : 'Add delivery address';

  const handleModeSelect = (mode: FulfillmentMode) => {
    setFulfillmentMode(mode);
  };

  const openCart = () => {
    setCartOpen(true);
  };

  const closeCart = () => {
    setCartOpen(false);

    if (searchParams.get('cart') !== 'open') {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('cart');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const handleQuickAdd = (item: NonNullable<typeof selectedItem>) => {
    if (item.inStock === false) {
      return;
    }

    if (item.modifierGroups?.length || item.addOns?.length) {
      setSelectedItemId(item.id);
      return;
    }

    addItem({
      item,
      quantity: 1,
    });
  };

  const handleCheckout = () => {
    const nextParams = new URLSearchParams();
    nextParams.set('mode', fulfillmentMode);
    nextParams.set('locationId', selectedLocationId);
    nextParams.set('dayId', selectedSchedule.dayId);
    nextParams.set('time', selectedSchedule.time);

    if (deliveryAddress.trim()) {
      nextParams.set('deliveryAddress', deliveryAddress.trim());
    }

    router.push(`/menu/checkout?${nextParams.toString()}`);
  };

  return (
    <div
      className="min-h-screen bg-stone-100"
      style={{ paddingTop: 'var(--navbar-height, 0px)' }}
    >
      <div className="sticky top-0 z-50 border-b border-stone-200/70">
        <AnnouncementStrip text={data.announcement} />
      </div>

      <div className="mx-auto flex w-full max-w-[1440px]">
        <div className="hidden lg:block">
          <SidebarNavigation
            categories={filteredCategories.map((category) => ({
              id: category.id,
              label: category.label,
            }))}
            activeCategoryId={activeCategoryId}
            onSelect={scrollToCategory}
            searchQuery={query}
            onSearchQueryChange={setQuery}
          />
        </div>

        <div className="min-w-0 flex-1 bg-stone-50">
          <div className="border-b border-stone-200 bg-white/85 py-4 backdrop-blur sm:py-6">
            <div className={contentContainerClass}>
              <div className="mb-4 sm:mb-6">
                <h1 className="mb-2 text-xl font-bold text-stone-900 sm:text-2xl">
                  {brandName}
                </h1>
                <div className="mb-4 flex flex-col gap-2 text-sm text-stone-600 sm:flex-row sm:items-center sm:gap-4">
                  <span>Location: {selectedLocation?.fullAddress || selectedLocation?.label || 'Location not set'}</span>
                  <span>Time: {scheduleLabel}</span>
                </div>
              </div>

              <FulfillmentSelector
                mode={fulfillmentMode}
                locationLabel={locationLabel}
                deliveryAddress={deliveryAddress}
                onModeSelect={handleModeSelect}
                onOpenSchedule={() => {
                  setScheduleModalSource('info');
                  setScheduleModalOpen(true);
                }}
                onDeliveryAddressChange={setDeliveryAddress}
              />
            </div>
          </div>

          <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden sm:px-6 sm:py-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filteredCategories.map((category) => {
                const isActive = category.id === activeCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                    className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${contentContainerClass} space-y-6 py-4 sm:py-6`}>
            {isCustomerAuthenticated && customerProfile ? (
              <MenuProfileCard
                profile={customerProfile}
                isLoggingOut={isLoggingOut}
                onLogout={handleLogout}
              />
            ) : (
              <RewardsBanner
                rewards={data.rewards}
                brandName={brandName}
                onCtaClick={() => openAuthSidebar('login')}
              />
            )}
            {popularItems.length ? (
              <PopularItemsCarousel
                items={popularItems}
                onOpenItem={(itemId) => setSelectedItemId(itemId)}
                onQuickAdd={handleQuickAdd}
                getItemQuantity={getItemQuantity}
              />
            ) : null}

            <section id="menu-sections" className="space-y-8 pb-8">
              {hasVisibleItems ? (
                pricedCategories.map((category, index) => (
                  <MenuSection
                    key={category.id}
                    category={category}
                    onOpenItem={(itemId) => setSelectedItemId(itemId)}
                    onQuickAdd={handleQuickAdd}
                    registerRef={registerSectionRef(category.id)}
                    first={index === 0}
                    getItemQuantity={getItemQuantity}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-sm">
                  <h2 className="text-xl font-semibold text-stone-900">
                    No items found
                  </h2>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {isHydrated && itemCount > 0 ? (
        <button
          type="button"
          onClick={openCart}
          className="fixed bottom-6 right-6 z-[80] flex items-center gap-4 rounded-full bg-black px-5 py-4 text-white shadow-2xl transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          <span className="inline-flex items-center gap-2 text-base font-semibold">
            <CartIcon className="h-5 w-5" />
            {itemCount}
          </span>
          <span className="border-l border-white/20 pl-4 text-base font-semibold">
            {formatPrice(subtotal)}
          </span>
        </button>
      ) : null}

      <ItemDetailsModal
        item={displaySelectedItem}
        open={Boolean(displaySelectedItem)}
        trustBanner={data.restaurant.trustBanner}
        onClose={() => setSelectedItemId(null)}
        onAddToCart={(input) => addItem(input)}
      />

      <CartDrawer
        open={cartOpen}
        items={items}
        itemCount={itemCount}
        subtotal={subtotal}
        mode={fulfillmentMode}
        deliveryAddress={deliveryAddress}
        scheduleLabel={scheduleLabel}
        onClose={closeCart}
        onModeChange={handleModeSelect}
        onDeliveryAddressChange={setDeliveryAddress}
        onOpenSchedule={() => {
          setCartOpen(false);
          setScheduleModalSource('cart');
          setScheduleModalOpen(true);
        }}
        onUpdateQuantity={updateItemQuantity}
        onCheckout={handleCheckout}
      />

      <LocationModal
        open={locationModalOpen}
        restaurantName={brandName}
        locations={data.locations}
        activeMode={locationModalMode}
        selectedLocationId={selectedLocationId}
        deliveryAddress={deliveryAddress}
        selectedScheduleLabel={scheduleLabel}
        onClose={() => setLocationModalOpen(false)}
        onModeChange={setLocationModalMode}
        onLocationChange={setSelectedLocationId}
        onDeliveryAddressChange={setDeliveryAddress}
        onScheduleClick={() => {
          setLocationModalOpen(false);
          setScheduleModalSource('location');
          setScheduleModalOpen(true);
        }}
        onConfirm={() => {
          setFulfillmentMode(locationModalMode);
          setLocationModalOpen(false);
        }}
      />

      <ScheduleOrderModal
        open={scheduleModalOpen}
        days={data.scheduleDays}
        currentSelection={selectedSchedule}
        onClose={() => setScheduleModalOpen(false)}
        onBack={() => {
          if (scheduleModalSource === 'location') {
            setScheduleModalOpen(false);
            setLocationModalOpen(true);
            return;
          }

          if (scheduleModalSource === 'cart') {
            setScheduleModalOpen(false);
            setCartOpen(true);
            return;
          }

          setScheduleModalOpen(false);
        }}
        onConfirm={(selection) => {
          setSelectedSchedule(selection);
          setScheduleModalOpen(false);
          if (scheduleModalSource === 'location') {
            setLocationModalOpen(true);
          }
          if (scheduleModalSource === 'cart') {
            setCartOpen(true);
          }
        }}
      />

      <MenuAuthSidebar
        open={authSidebarOpen}
        view={authSidebarView}
        restaurantName={brandName}
        isCustomerAuthenticated={isCustomerAuthenticated}
        customerProfile={customerProfile}
        isLoggingOut={isLoggingOut}
        onClose={() => setAuthSidebarOpen(false)}
        onViewChange={setAuthSidebarView}
        onLogout={handleLogout}
      />
    </div>
  );
}

function resolveFulfillmentPrice(item: MenuItem, mode: FulfillmentMode) {
  const pickupPrice = item.pickupPrice ?? item.price;
  const deliveryPrice = item.deliveryPrice ?? item.price;

  if (mode === 'delivery') {
    return deliveryPrice > 0 ? deliveryPrice : pickupPrice;
  }

  return pickupPrice > 0 ? pickupPrice : deliveryPrice;
}

function applyFulfillmentPricing(item: MenuItem, mode: FulfillmentMode): MenuItem {
  const price = resolveFulfillmentPrice(item, mode);

  if (price === item.price) {
    return item;
  }

  return {
    ...item,
    price,
  };
}

function applyFulfillmentPricingToCategories(
  categories: MenuCategory[],
  mode: FulfillmentMode,
) {
  return categories.map((category) => ({
    ...category,
    items: category.items.map((item) => applyFulfillmentPricing(item, mode)),
  }));
}

export default function MenuPage({ data }: MenuPageProps) {
  return (
    <CartProvider>
      <MenuPageContent data={data} />
    </CartProvider>
  );
}