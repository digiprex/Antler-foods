'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnnouncementStrip } from '@/features/restaurant-menu/components/announcement-strip';
import { CartDrawer } from '@/features/restaurant-menu/components/cart-drawer';
import { CartIcon } from '@/features/restaurant-menu/components/icons';
import { SidebarNavigation } from '@/features/restaurant-menu/components/sidebar-navigation';
import { FulfillmentSelector } from '@/features/restaurant-menu/components/fulfillment-selector';
import { ItemDetailsModal } from '@/features/restaurant-menu/components/item-details-modal';
import { LocationModal } from '@/features/restaurant-menu/components/location-modal';
import { MenuAuthSidebar, type MenuAuthView } from '@/features/restaurant-menu/components/menu-auth-sidebar';
import { MenuSection } from '@/features/restaurant-menu/components/menu-section';
import { PopularItemsCarousel } from '@/features/restaurant-menu/components/popular-items-carousel';
import { ProfileDropdown } from '@/features/restaurant-menu/components/profile-dropdown';
import { RewardsBanner } from '@/features/restaurant-menu/components/rewards-banner';
import { ScheduleOrderModal } from '@/features/restaurant-menu/components/schedule-order-modal';
import { CartProvider } from '@/features/restaurant-menu/context/cart-context';
import { useActiveCategory } from '@/features/restaurant-menu/hooks/use-active-category';
import { useMenuCart } from '@/features/restaurant-menu/hooks/use-menu-cart';
import { useMenuSearch } from '@/features/restaurant-menu/hooks/use-menu-search';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import {
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  resolveCustomerAuthView,
} from '@/features/restaurant-menu/lib/customer-auth';
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
const MENU_CART_OPEN_EVENT = 'menu-cart-open-request';

function MenuPageContent({ data }: MenuPageProps) {
  const {
    itemCount,
    items,
    subtotal,
    cartNote,
    isHydrated,
    addItem,
    updateItemQuantity,
    updateCartNote,
    getItemQuantity,
  } = useMenuCart();
  const restaurantId = data.restaurantId || data.locations[0]?.id || null;
  const {
    customerProfile,
    hasCustomerSession,
    isLoading: isAuthLoading,
    isLoggingOut,
    applyCustomerProfile,
    logout,
  } = useMenuCustomerAuth(restaurantId);
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
  const pickupScheduleDays = data.scheduleDays.filter((day) => day.slots.length > 0);
  const effectiveScheduleDays = pickupScheduleDays.length > 0 ? pickupScheduleDays : data.scheduleDays;
  const initialScheduleDay = effectiveScheduleDays[0];
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
  const [navbarAuthSlot, setNavbarAuthSlot] = useState<HTMLElement | null>(null);
  const contentContainerClass = 'mx-auto w-full max-w-[1080px] px-4 sm:px-6';
  const brandName = data.restaurant.name.replace(' Menu', '');

  const setAuthQueryParam = (view: MenuAuthView | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (view) {
      nextParams.set('auth', view);
    } else {
      nextParams.delete('auth');
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const openAuthSidebar = (view: MenuAuthView) => {
    setAuthSidebarView(view);
    setAuthSidebarOpen(true);
  };

  const closeAuthSidebar = () => {
    setAuthSidebarOpen(false);

    if (!resolveCustomerAuthView(searchParams.get('auth'))) {
      return;
    }

    setAuthQueryParam(null);
  };

  const handleAuthSidebarViewChange = (view: MenuAuthView) => {
    setAuthSidebarView(view);

    if (!resolveCustomerAuthView(searchParams.get('auth'))) {
      return;
    }

    setAuthQueryParam(view);
  };

  const handleLogout = async () => {
    await logout();
    closeAuthSidebar();
    setAuthSidebarView('login');
    router.refresh();
  };

  useEffect(() => {
    const requestedAuthView = resolveCustomerAuthView(searchParams.get('auth'));

    if (!requestedAuthView) {
      return;
    }

    setAuthSidebarView(requestedAuthView);
    setAuthSidebarOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('cart') === 'open') {
      setCartOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    router.prefetch('/menu/checkout');
  }, [router]);

  useEffect(() => {
    const handleOpenCartRequest = () => {
      setCartOpen(true);
    };

    window.addEventListener(MENU_CART_OPEN_EVENT, handleOpenCartRequest);
    return () => {
      window.removeEventListener(MENU_CART_OPEN_EVENT, handleOpenCartRequest);
    };
  }, []);

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

      link.style.display = hasCustomerSession ? 'none' : link.dataset.menuAuthOriginalDisplay || '';
    });

    return () => {
      authLinks.forEach((link) => {
        link.style.display = link.dataset.menuAuthOriginalDisplay || '';
        delete link.dataset.menuAuthOriginalDisplay;
      });
    };
  }, [hasCustomerSession]);


  useEffect(() => {
    const syncNavbarAuthSlot = () => {
      setNavbarAuthSlot(document.getElementById('menu-navbar-auth-slot'));
    };

    syncNavbarAuthSlot();

    const observer = new MutationObserver(() => {
      syncNavbarAuthSlot();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const selectedLocation =
    data.locations.find((location) => location.id === selectedLocationId) || data.locations[0];
  const scheduleLabel = getScheduleSummary(effectiveScheduleDays, selectedSchedule);
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

  useEffect(() => {
    if (fulfillmentMode !== 'pickup') {
      return;
    }

    const dayForSelection =
      effectiveScheduleDays.find((day) => day.id === selectedSchedule.dayId) ||
      effectiveScheduleDays[0];

    if (!dayForSelection) {
      return;
    }

    if (selectedSchedule.time && dayForSelection.slots.includes(selectedSchedule.time)) {
      return;
    }

    setSelectedSchedule({
      dayId: dayForSelection.id,
      time: dayForSelection.slots[0] || '',
    });
  }, [effectiveScheduleDays, fulfillmentMode, selectedSchedule.dayId, selectedSchedule.time]);

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

    if (item.modifierGroups?.length || item.addOns?.length || item.variants?.length) {
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
      className="min-h-screen bg-white"
      style={{ paddingTop: 'var(--navbar-height, 0px)' }}
    >
      <div
        className="sticky z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden sm:px-6"
        style={{ top: 'var(--navbar-height, 0px)' }}
      >
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Browse categories
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {filteredCategories.map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => scrollToCategory(category.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    isActive
                      ? 'bg-stone-900 text-stone-50 shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-b border-stone-200 bg-white/95 backdrop-blur-xl">
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

        <div className="min-w-0 flex-1 bg-white">
          <div className="border-b border-stone-200 bg-white py-4 sm:py-5">
            <div className={contentContainerClass}>
              <div className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                        Online ordering
                      </p>
                      <h1 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-stone-950 sm:text-[2.15rem]">
                        {brandName}
                      </h1>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600 sm:text-sm">
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1">
                          {selectedLocation?.fullAddress || selectedLocation?.label || 'Location not set'}
                        </span>
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1">
                          {scheduleLabel}
                        </span>
                      </div>
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
            </div>
          </div>

          <div className={`${contentContainerClass} space-y-5 py-4 sm:py-5`}>
            {!hasCustomerSession ? (
              <RewardsBanner
                rewards={data.rewards}
                brandName={brandName}
                onCtaClick={() => openAuthSidebar('login')}
              />
            ) : null}
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
                <div className="rounded-[24px] border border-dashed border-stone-300 bg-white px-6 py-14 text-center shadow-sm">
                  <h2 className="text-xl font-semibold text-stone-900">
                    No items found
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    Try another search or choose a different category.
                  </p>
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
          className="fixed bottom-5 right-5 z-[80] flex items-center gap-3 rounded-full bg-stone-900 px-4 py-3 text-sm text-stone-50 shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <CartIcon className="h-4 w-4" />
            {itemCount}
          </span>
          <span className="border-l border-white/20 pl-3 text-sm font-semibold">
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
        cartNote={cartNote}
        mode={fulfillmentMode}
        deliveryAddress={deliveryAddress}
        scheduleLabel={scheduleLabel}
        onClose={closeCart}
        onUpdateQuantity={updateItemQuantity}
        onUpdateCartNote={updateCartNote}
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
        days={effectiveScheduleDays}
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

      {navbarAuthSlot && !isAuthLoading && hasCustomerSession && customerProfile
        ? createPortal(
            <ProfileDropdown
              profile={customerProfile}
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
            />,
            navbarAuthSlot,
          )
        : null}

      <MenuAuthSidebar
        open={authSidebarOpen}
        view={authSidebarView}
        restaurantId={restaurantId}
        restaurantName={brandName}
        hasCustomerSession={hasCustomerSession}
        customerProfile={customerProfile}
        onClose={closeAuthSidebar}
        onViewChange={handleAuthSidebarViewChange}
        onAuthenticatedCustomer={applyCustomerProfile}
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
  const variants = item.variants?.map((variant) => applyFulfillmentPricing(variant, mode));

  if (price === item.price && !item.variants) {
    return item;
  }

  return {
    ...item,
    price,
    variants,
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







